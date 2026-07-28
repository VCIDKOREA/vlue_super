import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";

/** GET /api/lettering/showcase/style — 조건부 hydrate (If-None-Match) */
export async function fetchShowcaseStyleBundle(opts = {}) {
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
  clientUpdatedAt
} = {}) {
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
    return { ok: true, v: 2, editor: null, live, liveSource, updatedAt };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}
