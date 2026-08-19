import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";
import { readDccLinePreview, readSelectedDccLineId } from "../dccLineState.js";
import { fetchDccLineShowcase, putDccLineShowcase } from "../dccLinesApi.js";
import { normalizePhoneDigits } from "../letteringPhoneMatch.js";

/** GET /api/lettering/showcase/style — 조건부 hydrate (If-None-Match) */
export async function fetchShowcaseStyleBundle(opts = {}) {
  const lineId = String(opts.lineId || readSelectedDccLineId() || "").trim();
  const certified = Boolean(readDccLinePreview()?.isCertified);
  if (lineId && !certified) {
    try {
      const data = await fetchDccLineShowcase(lineId);
      return {
        ok: true,
        v: data.v ?? 2,
        editor: data.editor ?? null,
        live: data.live ?? null,
        liveSource: data.liveSource ?? null,
        updatedAt: data.updatedAt ?? null
      };
    } catch (e) {
      return { ok: false, error: e?.message || "fetch_failed" };
    }
  }
  const ifNone = String(opts.ifNoneMatch || "").trim();
  try {
    const headers = { ...vlueAuthHeaders() };
    if (ifNone && !opts.force) headers["If-None-Match"] = `"${ifNone}"`;
    const q = ifNone && !opts.force ? `?sinceUpdatedAt=${encodeURIComponent(ifNone)}` : "";
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/showcase/style${q}`), { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "fetch_failed", status: res.status };
    }
    if (data.unchanged) {
      return {
        ok: true,
        unchanged: true,
        v: 2,
        editor: null,
        live: null,
        liveSource: null,
        updatedAt: data.updatedAt ?? ifNone
      };
    }
    return {
      ok: true,
      v: data.v ?? 2,
      editor: data.editor ?? null,
      live: data.live ?? null,
      liveSource: data.liveSource ?? null,
      updatedAt: data.updatedAt ?? null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** PUT /api/lettering/showcase/style */
export async function putShowcaseStyleBundle({
  editor,
  live,
  liveSource,
  clientUpdatedAt,
  lineId: lineIdOpt
} = {}) {
  const lineId = String(lineIdOpt || readSelectedDccLineId() || "").trim();
  const certified = Boolean(readDccLinePreview()?.isCertified);
  if (lineId && !certified) {
    try {
      const data = await putDccLineShowcase(lineId, { editor, live, liveSource, clientUpdatedAt });
      return { ok: true, updatedAt: data.updatedAt ?? null };
    } catch (e) {
      return { ok: false, error: e?.message || "save_failed" };
    }
  }
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/style"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        v: 2,
        editor,
        live,
        liveSource,
        clientUpdatedAt
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return {
        ok: false,
        conflict: true,
        editor: data.editor ?? null,
        live: data.live ?? null,
        liveSource: data.liveSource ?? null,
        updatedAt: data.updatedAt ?? null
      };
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "save_failed", status: res.status };
    }
    return {
      ok: true,
      updatedAt: data.updatedAt ?? null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

const peerCache = new Map();
const PEER_CACHE_TTL_MS = 120_000;
/** 공개 GET(쿠키 없는 오버레이·통화목록)용 메모리 캐시 */
const publicPeerLiveCache = new Map();
const PUBLIC_PEER_LIVE_TTL_MS = 90_000;
/** 동일 userId 동시 요청 합치기 — OverlayHost 네이티브+웹 레이스 egress 방어 */
const publicPeerLiveInflight = new Map();

function peerPublicCacheKey(userId, phoneRaw = "") {
  const id = String(userId || "").trim();
  const digits = normalizePhoneDigits(phoneRaw);
  return digits ? `${id}:${digits}` : id;
}

function rememberPeerLive(cacheKey, live, liveSource, updatedAt, opts = {}) {
  if (!cacheKey || !live || typeof live !== "object") return;
  const at = Date.now();
  const mirrorAuth = opts.mirrorAuth !== false;
  const userId = String(opts.userId || cacheKey).trim();
  if (mirrorAuth && userId) {
    peerCache.set(userId, { live, liveSource: liveSource ?? null, updatedAt: updatedAt ?? null, at });
  }
  publicPeerLiveCache.set(cacheKey, { live, liveSource: liveSource ?? null, updatedAt: updatedAt ?? null, at });
}

/**
 * 공개 라이브 스타일 GET — 오버레이 WebView·통화목록 공통.
 * 메모리 캐시 + in-flight 합치기 + ETag 로 Shared Pooler egress 를 줄인다.
 */
export async function fetchPeerLiveStylePublic(userId, opts = {}) {
  const id = String(userId || "").trim();
  if (!id) return null;
  const force = Boolean(opts.force);
  const number = String(opts.number || opts.phone || "").trim();
  const cacheKey = peerPublicCacheKey(id, number);
  const now = Date.now();
  if (!force) {
    const mem = publicPeerLiveCache.get(cacheKey);
    if (mem?.live && now - mem.at < PUBLIC_PEER_LIVE_TTL_MS) return mem.live;
    const authCached = !number ? peerCache.get(id) : null;
    if (authCached?.live && now - authCached.at < PEER_CACHE_TTL_MS) return authCached.live;
    const inflight = publicPeerLiveInflight.get(cacheKey);
    if (inflight) return inflight;
  }

  const run = (async () => {
    try {
      const headers = { Accept: "application/json" };
      const cachedMeta = publicPeerLiveCache.get(cacheKey) || (!number ? peerCache.get(id) : null);
      const etag = !force && cachedMeta?.updatedAt ? String(cachedMeta.updatedAt) : "";
      if (etag) headers["If-None-Match"] = `"${etag}"`;
      const params = new URLSearchParams();
      if (etag) params.set("sinceUpdatedAt", etag);
      if (number) params.set("number", number);
      const q = params.toString() ? `?${params.toString()}` : "";
      const styleUrl = apiUrl(`/api/lettering/showcase/style/${encodeURIComponent(id)}${q}`);
      const styleRes = await fetch(styleUrl, {
        method: "GET",
        headers,
        credentials: "omit",
        cache: force ? "no-store" : "default"
      });
      const styleData = await styleRes.json().catch(() => ({}));
      if (styleRes.ok && styleData?.unchanged) {
        const prev = publicPeerLiveCache.get(cacheKey) || (!number ? peerCache.get(id) : null);
        if (prev?.live) {
          rememberPeerLive(cacheKey, prev.live, prev.liveSource ?? null, styleData.updatedAt || prev.updatedAt, {
            userId: id,
            mirrorAuth: !number
          });
          return prev.live;
        }
      }
      if (styleRes.ok && styleData?.live && typeof styleData.live === "object") {
        rememberPeerLive(cacheKey, styleData.live, styleData.liveSource ?? null, styleData.updatedAt ?? null, {
          userId: id,
          mirrorAuth: !number
        });
        return styleData.live;
      }
      /* 404 등 — auth 폴백으로 두 번 치지 않음 (미존재·비공개) */
      if (styleRes.status === 404 || styleRes.status === 403) return null;
    } catch {
      /* network — auth 폴백 */
    }
    try {
      const authStyle = await fetchPeerShowcaseStyleBundle(id, { force: false });
      if (authStyle.ok && authStyle.live && typeof authStyle.live === "object") {
        return authStyle.live;
      }
    } catch {
      /* ignore */
    }
    return null;
  })();

  if (!force) {
    publicPeerLiveInflight.set(cacheKey, run);
    try {
      return await run;
    } finally {
      if (publicPeerLiveInflight.get(cacheKey) === run) publicPeerLiveInflight.delete(cacheKey);
    }
  }
  return run;
}

/** GET /api/lettering/showcase/style/:userId — peer live slim + 로컬 캐시 */
export async function fetchPeerShowcaseStyleBundle(userId, opts = {}) {
  const id = String(userId || "").trim();
  if (!id) return { ok: false, error: "user_required" };
  const force = Boolean(opts.force);
  const cached = peerCache.get(id);
  const now = Date.now();
  if (!force && cached && now - cached.at < PEER_CACHE_TTL_MS) {
    return { ok: true, editor: null, live: cached.live, liveSource: cached.liveSource, updatedAt: cached.updatedAt, cached: true };
  }
  try {
    const headers = { ...vlueAuthHeaders() };
    if (cached?.updatedAt && !force) {
      headers["If-None-Match"] = `"${cached.updatedAt}"`;
    }
    const q =
      cached?.updatedAt && !force
        ? `?sinceUpdatedAt=${encodeURIComponent(cached.updatedAt)}`
        : "";
    const res = await vlueAuthFetch(
      apiUrl(`/api/lettering/showcase/style/${encodeURIComponent(id)}${q}`),
      { headers }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "fetch_failed", status: res.status };
    }
    if (data.unchanged && cached) {
      peerCache.set(id, { ...cached, at: now });
      publicPeerLiveCache.set(id, { live: cached.live, at: now });
      return {
        ok: true,
        unchanged: true,
        editor: null,
        live: cached.live,
        liveSource: cached.liveSource,
        updatedAt: data.updatedAt || cached.updatedAt
      };
    }
    const live = data.live ?? null;
    const liveSource = data.liveSource ?? null;
    const updatedAt = data.updatedAt ?? null;
    peerCache.set(id, { live, liveSource, updatedAt, at: now });
    if (live) publicPeerLiveCache.set(id, { live, at: now });
    return { ok: true, v: 2, editor: null, live, liveSource, updatedAt };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}
