import { fetchShowcaseStyleBundle, putShowcaseStyleBundle } from "./showcaseStyleApi.js";
import { slimShowcaseStyleForPersistWithVersion as slimShowcaseStyleForPersist } from "./slimShowcaseStyleForPersist.js";
import { hasShowcaseBgmConfigured, hasPlayableShowcaseBgm } from "./showcaseBgmPresets.js";
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
let poolerCallCount = 0;

const isDev =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env?.DEV || import.meta.env?.MODE === "development");

/** 개발: 5분 / 운영: 60초 — 원격 Pooler 낭비 방지 */
const HYDRATE_COOLDOWN_MS = isDev ? 300_000 : 60_000;

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

function notePoolerCall(kind) {
  poolerCallCount += 1;
  if (isDev && typeof console !== "undefined") {
    console.info(`[egress] showcase-style ${kind} (#${poolerCallCount})`);
  }
}

function pageHasPhotos(page) {
  if (!page || typeof page !== "object") return false;
  const photos = page?.gallery?.photos || page?.photos || [];
  return Array.isArray(photos) && photos.some((ph) => String(ph?.url || ph || "").trim());
}

/** 사진·쇼셜링크·본문·BGM·페이지 등 실질 편집 여부 */
export function showcaseStyleHasContent(style) {
  if (!style || typeof style !== "object") return false;
  const photos = Array.isArray(style.gallery?.photos)
    ? style.gallery.photos.filter((ph) => String(ph?.url || ph || "").trim()).length
    : 0;
  const pagePhotos = Array.isArray(style.pages) ? style.pages.some(pageHasPhotos) : false;
  const pageCount = Array.isArray(style.pages)
    ? style.pages.filter((p) => p && typeof p === "object").length
    : 0;
  const outlinks = style.commercial?.outlinks || {};
  const hasOutlink = Object.values(outlinks).some((v) => String(v || "").trim());
  const links = Array.isArray(style.commercial?.links) ? style.commercial.links.length : 0;
  const body = String(style.richCustom?.bodyText || "").trim();
  const tags = Array.isArray(style.tags) ? style.tags.length : 0;
  const bgmOn =
    hasShowcaseBgmConfigured(style) ||
    hasPlayableShowcaseBgm(style) ||
    (style.bgm?.mode && style.bgm.mode !== "none");
  return (
    photos > 0 ||
    pagePhotos ||
    pageCount > 0 ||
    hasOutlink ||
    links > 0 ||
    Boolean(body) ||
    tags > 0 ||
    Boolean(bgmOn)
  );
}

/** 재설치 등으로 로컬 쇼케이스가 비었는지 */
export function needsShowcaseStyleLocalRestore() {
  return (
    !showcaseStyleHasContent(readShowcaseStyle()) &&
    !showcaseStyleHasContent(readLiveShowcaseStyle())
  );
}

function applyServerBundle(bundle, { reason = "hydrate", clearMissing = false } = {}) {
  const editor =
    bundle.editor && typeof bundle.editor === "object" ? bundle.editor : null;
  const live = bundle.live && typeof bundle.live === "object" ? bundle.live : null;
  const liveSource = bundle.liveSource?.source === "mycase" ? "mycase" : "editor";

  /*
   * 재설치 복원: 서버에 live 만 있고 editor 가 null 이면
   * clearMissing 이 빈 초안으로 덮어 설정 화면이 텅 비어 보였다.
   * live ↔ editor 상호 시딩으로 설정·송출 둘 다 채운다.
   */
  if (editor) {
    writeShowcaseStyle(editor, { replace: true, skipSync: true });
  } else if (live) {
    writeShowcaseStyle(live, { replace: true, skipSync: true });
  } else if (clearMissing) {
    writeShowcaseStyle(createDefaultShowcaseStyle(), { replace: true, skipSync: true });
  }

  if (live) {
    writeLiveShowcaseStyle(live, { source: liveSource, skipSync: true });
  } else if (editor) {
    writeLiveShowcaseStyle(editor, { source: "editor", skipSync: true });
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
  const editor = slimShowcaseStyleForPersist(readShowcaseStyle());
  const liveRaw = readLiveShowcaseStyle();
  const live = liveRaw ? slimShowcaseStyleForPersist(liveRaw) : liveRaw;
  const liveSource = readLiveShowcaseSource();
  const clientUpdatedAt = readLocalShowcaseStyleUpdatedAt() || bumpLocalShowcaseStyleUpdatedAt();

  notePoolerCall("PUT");
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
 * 로그인·앱 기동 시 — 서버 ↔ 로컬 동기화 (조건부 GET + 로컬 우선)
 * @param {{ forceServer?: boolean }} [opts]
 */
export async function hydrateShowcaseStyleFromServer(opts = {}) {
  const forceServer = Boolean(opts.forceServer);
  if (hydrateInFlight && !forceServer) return hydrateInFlight;
  if (!forceServer && lastHydrateOkAt && Date.now() - lastHydrateOkAt < HYDRATE_COOLDOWN_MS) {
    return { ok: true, applied: false, skipped: true, recent: true };
  }
  const run = (async () => {
    notePoolerCall(forceServer ? "GET-force" : "GET");
    const remote = await fetchShowcaseStyleBundle({
      force: forceServer,
      ifNoneMatch: forceServer ? "" : readLocalShowcaseStyleUpdatedAt()
    });
    if (!remote.ok) {
      return { ok: false, error: remote.error };
    }

    if (remote.unchanged) {
      lastHydrateOkAt = Date.now();
      if (remote.updatedAt) writeLocalShowcaseStyleUpdatedAt(remote.updatedAt);
      return { ok: true, applied: false, unchanged: true, pushed: false };
    }

    if (forceServer) {
      applyServerBundle(remote, { reason: "forceServer", clearMissing: true });
      lastHydrateOkAt = Date.now();
      try {
        window.dispatchEvent(new CustomEvent("vlue-showcase-style-changed"));
        window.dispatchEvent(new CustomEvent("vlue-showcase-live-style-changed"));
      } catch {
        /* ignore */
      }
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
      try {
        window.dispatchEvent(new CustomEvent("vlue-showcase-style-changed"));
        window.dispatchEvent(new CustomEvent("vlue-showcase-live-style-changed"));
      } catch {
        /* ignore */
      }
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

/** 재설치·빈 로컬 전용 — 서버본을 강제로 가져와 편집/라이브에 채운다 */
export async function restoreShowcaseStyleFromServer() {
  lastHydrateOkAt = 0;
  return hydrateShowcaseStyleFromServer({ forceServer: true });
}
