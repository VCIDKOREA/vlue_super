import { fetchShowcaseStyleBundle, putShowcaseStyleBundle } from "./showcaseStyleApi.js";
import {
  readLiveShowcaseSource,
  readLiveShowcaseStyle,
  readShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle,
  createDefaultShowcaseStyle,
  SHOWCASE_LIVE_STYLE_STORAGE_KEY,
  SHOWCASE_LIVE_SOURCE_STORAGE_KEY
} from "./showcaseStyleStorage.js";

export const SHOWCASE_STYLE_META_KEY = "vlue_showcase_style_meta_v1";

let pushTimer = null;
let hydrateInFlight = null;
/** 앱 로그인 hydrate 직후 설정 시트가 재요청하지 않도록 */
let lastHydrateOkAt = 0;
const HYDRATE_COOLDOWN_MS = 60_000;

export function readLocalShowcaseStyleUpdatedAt() {
  try {
    const raw = localStorage.getItem(SHOWCASE_STYLE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const at = String(parsed?.updatedAt || "").trim();
    return at || null;
  } catch {
    return null;
  }
}

export function writeLocalShowcaseStyleUpdatedAt(iso) {
  const updatedAt = String(iso || new Date().toISOString());
  try {
    localStorage.setItem(SHOWCASE_STYLE_META_KEY, JSON.stringify({ updatedAt }));
  } catch {
    /* ignore */
  }
  return updatedAt;
}

export function bumpLocalShowcaseStyleUpdatedAt() {
  return writeLocalShowcaseStyleUpdatedAt(new Date().toISOString());
}

/** 사진·쇼셜링크·본문 등 실질 편집 여부 */
export function showcaseStyleHasContent(style) {
  if (!style || typeof style !== "object") return false;
  const photos = Array.isArray(style.gallery?.photos) ? style.gallery.photos.length : 0;
  const pagePhotos = Array.isArray(style.pages)
    ? style.pages.some((p) => Array.isArray(p?.photos) && p.photos.length > 0)
    : false;
  const outlinks = style.commercial?.outlinks || {};
  const hasOutlink = Object.values(outlinks).some((v) => String(v || "").trim());
  const links = Array.isArray(style.commercial?.links) ? style.commercial.links.length : 0;
  const body = String(style.richCustom?.bodyText || "").trim();
  const tags = Array.isArray(style.tags) ? style.tags.length : 0;
  const bgmOn = style.bgm?.mode && style.bgm.mode !== "none";
  return photos > 0 || pagePhotos || hasOutlink || links > 0 || Boolean(body) || tags > 0 || Boolean(bgmOn);
}

function applyServerBundle(bundle, { reason = "hydrate", clearMissing = false } = {}) {
  if (bundle.editor && typeof bundle.editor === "object") {
    writeShowcaseStyle(bundle.editor, { replace: true, skipSync: true });
  } else if (clearMissing) {
    writeShowcaseStyle(createDefaultShowcaseStyle(), { replace: true, skipSync: true });
  }
  if (bundle.live && typeof bundle.live === "object") {
    writeLiveShowcaseStyle(bundle.live, {
      source: bundle.liveSource?.source === "mycase" ? "mycase" : "editor",
      skipSync: true
    });
  } else if (clearMissing) {
    try {
      localStorage.removeItem(SHOWCASE_LIVE_STYLE_STORAGE_KEY);
      localStorage.removeItem(SHOWCASE_LIVE_SOURCE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  if (bundle.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.updatedAt);
  else if (clearMissing) writeLocalShowcaseStyleUpdatedAt(new Date(0).toISOString());
  void reason;
}

export async function pushShowcaseStyleBundle() {
  const editor = readShowcaseStyle();
  const live = readLiveShowcaseStyle();
  const liveSource = readLiveShowcaseSource();
  const clientUpdatedAt = readLocalShowcaseStyleUpdatedAt() || bumpLocalShowcaseStyleUpdatedAt();

  const result = await putShowcaseStyleBundle({
    editor,
    live,
    liveSource,
    clientUpdatedAt
  });

  if (result.conflict) {
    applyServerBundle(result, { reason: "conflict" });
    return { ok: false, conflict: true, appliedServer: true };
  }
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.updatedAt) writeLocalShowcaseStyleUpdatedAt(result.updatedAt);
  return { ok: true };
}

export function scheduleShowcaseStylePush(delayMs = 900) {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushShowcaseStyleBundle();
  }, delayMs);
}

/**
 * 로그인·앱 기동 시 — 서버 ↔ 로컬 동기화
 * @param {{ forceServer?: boolean }} [opts]
 * - forceServer: 계정 전환 직후 — 서버본만 적용, 로컬 잔여 push 금지
 * - 그 외: 서버만 있으면 끌어옴 / 로컬만 있으면 올림 / 둘 다 있으면 LWW
 */
export async function hydrateShowcaseStyleFromServer(opts = {}) {
  const forceServer = Boolean(opts.forceServer);
  if (hydrateInFlight && !forceServer) return hydrateInFlight;
  /* 최근 성공 hydrate 있으면 재요청 생략 — 설정 패널·홈 중복 진입 절감 */
  if (!forceServer && lastHydrateOkAt && Date.now() - lastHydrateOkAt < HYDRATE_COOLDOWN_MS) {
    return { ok: true, applied: false, skipped: true, recent: true };
  }
  const run = (async () => {
    const remote = await fetchShowcaseStyleBundle();
    if (!remote.ok) {
      return { ok: false, error: remote.error };
    }

    if (forceServer) {
      applyServerBundle(remote, { reason: "forceServer", clearMissing: true });
      lastHydrateOkAt = Date.now();
      return { ok: true, applied: true, pushed: false, forceServer: true };
    }

    const localEditor = readShowcaseStyle();
    const localLive = readLiveShowcaseStyle();
    const localHas =
      showcaseStyleHasContent(localEditor) || showcaseStyleHasContent(localLive);
    const remoteHas =
      showcaseStyleHasContent(remote.editor) || showcaseStyleHasContent(remote.live);
    const localAt = readLocalShowcaseStyleUpdatedAt();
    const serverAt = remote.updatedAt;
    const localMs = localAt ? Date.parse(localAt) : 0;
    const serverMs = serverAt ? Date.parse(serverAt) : 0;

    if (!remoteHas && localHas) {
      const pushed = await pushShowcaseStyleBundle();
      lastHydrateOkAt = Date.now();
      return { ok: true, applied: false, pushed: Boolean(pushed.ok) };
    }

    if (remoteHas && (!localHas || serverMs > localMs + 500)) {
      applyServerBundle(remote, { reason: "hydrate" });
      lastHydrateOkAt = Date.now();
      return { ok: true, applied: true, pushed: false };
    }

    if (localHas && localMs > serverMs + 500) {
      const pushed = await pushShowcaseStyleBundle();
      lastHydrateOkAt = Date.now();
      return { ok: true, applied: false, pushed: Boolean(pushed.ok) };
    }

    lastHydrateOkAt = Date.now();
    return { ok: true, applied: false, pushed: false, inSync: true };
  })();

  if (!forceServer) {
    hydrateInFlight = run.finally(() => {
      hydrateInFlight = null;
    });
    return hydrateInFlight;
  }
  return run;
}
