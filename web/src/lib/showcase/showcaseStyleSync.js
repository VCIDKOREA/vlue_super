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
  const editorHas = showcaseStyleHasContent(editor);
  const liveHas = showcaseStyleHasContent(live);

  /*
   * 재설치 복원: 서버 editor 가 빈 객체(또는 null)이고 live 만 채워져 있으면
   * 예전 코드가 빈 editor 를 그대로 써서 설정 화면이 텅 비어 보였다.
   * 내용 있는 쪽을 우선해 설정·송출 둘 다 채운다.
   */
  if (editorHas) {
    writeShowcaseStyle(editor, { replace: true, skipSync: true });
  } else if (liveHas) {
    writeShowcaseStyle(live, { replace: true, skipSync: true });
  } else if (clearMissing) {
    writeShowcaseStyle(createDefaultShowcaseStyle(), { replace: true, skipSync: true });
  }

  if (liveHas) {
    writeLiveShowcaseStyle(live, { source: liveSource, skipSync: true });
  } else if (editorHas) {
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
  try {
    const prefer = liveHas ? live : editorHas ? editor : null;
    if (prefer) {
      import("../bizcardAccountSync.js")
        .then((m) => m.syncDccBroadcastKeyFromStyle?.(prefer))
        .catch(() => {});
    }
  } catch {
    /* ignore */
  }
  void reason;
  return { editorHas, liveHas, seededEditorFromLive: !editorHas && liveHas };
}

export async function pushShowcaseStyleBundle(opts = {}) {
  const force = Boolean(opts.force);
  const editorRaw = readShowcaseStyle();
  const liveRaw = readLiveShowcaseStyle();
  const editorHas = showcaseStyleHasContent(editorRaw);
  const liveHas = showcaseStyleHasContent(liveRaw);

  /* 재설치 직후 빈 로컬이 서버 라이브본을 덮어쓰지 않도록 차단 (적용 버튼은 force) */
  if (!force && !editorHas && !liveHas) {
    return { ok: true, skipped: true, reason: "empty_local" };
  }

  const editor = slimShowcaseStyleForPersist(editorRaw);
  const liveSlim = liveRaw ? slimShowcaseStyleForPersist(liveRaw) : null;
  const liveSource = readLiveShowcaseSource() || { source: "editor", at: Date.now() };
  const clientUpdatedAt = readLocalShowcaseStyleUpdatedAt() || bumpLocalShowcaseStyleUpdatedAt();

  notePoolerCall("PUT");
  const payload = {
    editor: editorHas || force ? editor : liveSlim,
    liveSource,
    clientUpdatedAt
  };
  /* live 키 없음 = 서버 송출본 유지. null 은 보내지 않음 */
  if (liveSlim) {
    payload.live = liveSlim;
  } else if (force && payload.editor) {
    payload.live = payload.editor;
  }
  const result = await putShowcaseStyleBundle(payload);

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
      const applied = applyServerBundle(remote, { reason: "forceServer", clearMissing: true });
      let pushed = false;
      /* live → editor 시딩 후 서버 editor 컬럼도 채워 재설치 복원이 안정되게 */
      if (applied?.seededEditorFromLive || showcaseStyleHasContent(readShowcaseStyle())) {
        const push = await pushShowcaseStyleBundle({ force: true });
        pushed = Boolean(push?.ok && !push?.skipped);
      }
      lastHydrateOkAt = Date.now();
      try {
        window.dispatchEvent(new CustomEvent("vlue-showcase-style-changed"));
        window.dispatchEvent(new CustomEvent("vlue-showcase-live-style-changed"));
      } catch {
        /* ignore */
      }
      return { ok: true, applied: true, pushed, forceServer: true };
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

/** 로컬 편집본이 비었고 라이브만 있으면 설정 화면에 시딩 */
export function seedEditorFromLocalLiveIfEmpty() {
  if (showcaseStyleHasContent(readShowcaseStyle())) return false;
  const live = readLiveShowcaseStyle();
  if (!showcaseStyleHasContent(live)) return false;
  writeShowcaseStyle(live, { replace: true, skipSync: true });
  try {
    window.dispatchEvent(new CustomEvent("vlue-showcase-style-changed"));
  } catch {
    /* ignore */
  }
  return true;
}

/** 재설치·빈 로컬 전용 — 서버본을 강제로 가져와 편집/라이브에 채운다 */
export async function restoreShowcaseStyleFromServer() {
  lastHydrateOkAt = 0;
  return hydrateShowcaseStyleFromServer({ forceServer: true });
}
