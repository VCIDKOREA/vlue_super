import {
  clearLiveShowcaseStyle,
  createDefaultShowcaseStyle,
  readLiveShowcaseSource,
  readLiveShowcaseStyle,
  readShowcaseStyle,
  writeLiveShowcaseStyle
} from "./showcaseStyleStorage.js";
import { hasPlayableShowcaseBgm, hasShowcaseBgmConfigured } from "./showcaseBgmPresets.js";
import { fetchMycaseLiveBroadcast } from "../mycaseApi.js";

const LIVE_CASE_META_KEY = "vlue_mycase_live_broadcast_v1";

/**
 * 마이케이스 payloadJson 에서 통화용 쇼케이스 style 추출
 * @param {unknown} payloadJson
 * @returns {object|null}
 */
export function extractMycaseShowcaseStyle(payloadJson) {
  if (!payloadJson || typeof payloadJson !== "object") return null;
  const style = /** @type {{ style?: unknown }} */ (payloadJson).style;
  if (!style || typeof style !== "object") return null;
  return style;
}

/**
 * 게시물 스타일에 재생 가능한 BGM이 없으면 편집/라이브 음원을 유지
 * (아카이브는 음원 없이 저장하는 경우가 많음 — 케이스함·통화 BGM과 분리)
 * @param {object} style
 */
function mergePreservedBgm(style) {
  if (hasPlayableShowcaseBgm(style) || hasShowcaseBgmConfigured(style)) {
    return style;
  }
  try {
    const live = readLiveShowcaseStyle();
    if (live && (hasPlayableShowcaseBgm(live) || hasShowcaseBgmConfigured(live))) {
      return { ...style, bgm: live.bgm };
    }
    const editor = readShowcaseStyle();
    if (editor && (hasPlayableShowcaseBgm(editor) || hasShowcaseBgmConfigured(editor))) {
      return { ...style, bgm: editor.bgm };
    }
  } catch {
    /* ignore */
  }
  return style;
}

/**
 * 메인 송출 케이스 → 통화·홈 미리보기용 라이브 스타일에만 반영
 * (블루 쇼케이스 편집 설정 vlue_showcase_style_v1 은 덮어쓰지 않음)
 * @param {object|null|undefined} item serializeCase 형태 (payloadJson 포함)
 * @returns {object|null} 적용된 style
 */
export function applyMycaseItemToLiveBroadcast(item) {
  const style = extractMycaseShowcaseStyle(item?.payloadJson);
  if (!style) return null;

  const applied = writeLiveShowcaseStyle(mergePreservedBgm(style), {
    source: "mycase",
    /* hydrate/apply 는 서버→로컬만 — 매 마운트마다 PUT 스케줄 금지 */
    skipSync: true
  });
  if (!applied) return null;
  try {
    localStorage.setItem(
      LIVE_CASE_META_KEY,
      JSON.stringify({
        caseId: String(item?.id || ""),
        title: String(item?.title || ""),
        syncedAt: new Date().toISOString()
      })
    );
  } catch {
    /* ignore */
  }
  return applied;
}

/**
 * 서버 메인 송출 → 로컬 라이브 동기화 (앱·홈·오버레이 진입 시)
 * 설정에서 미리보기를 갱신한 직후(source=editor)에는 덮어쓰지 않음.
 * 메인이 없어도 편집에서 적용한 라이브(음원 포함)는 지우지 않음 — 새로고침 시 음원 소실 방지.
 * 동일 세션 중복 GET 차단: in-flight 공유 + 쿨다운.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, applied: boolean, item?: object|null, message?: string, skippedEditorPreview?: boolean, keptEditorLive?: boolean, restoredFromEditor?: boolean, skipped?: boolean, recent?: boolean }>}
 */
let liveHydrateInFlight = null;
let lastLiveHydrateOkAt = 0;
  const LIVE_HYDRATE_COOLDOWN_MS =
    typeof import.meta !== "undefined" &&
    Boolean(import.meta.env?.DEV || import.meta.env?.MODE === "development")
      ? 180_000
      : 45_000;

export async function hydrateLiveBroadcastFromServer(opts = {}) {
  const force = Boolean(opts.force);
  if (liveHydrateInFlight && !force) return liveHydrateInFlight;
  if (!force && lastLiveHydrateOkAt && Date.now() - lastLiveHydrateOkAt < LIVE_HYDRATE_COOLDOWN_MS) {
    return { ok: true, applied: false, skipped: true, recent: true };
  }

  const run = (async () => {
    const data = await fetchMycaseLiveBroadcast();
    if (!data.ok) {
      return { ok: false, applied: false, message: data.message };
    }
    if (!data.item) {
      try {
        localStorage.removeItem(LIVE_CASE_META_KEY);
      } catch {
        /* ignore */
      }
      const liveSource = readLiveShowcaseSource();
      /* 설정 적용본(editor)은 메인 게시물이 없어도 유지 */
      if (liveSource?.source === "editor") {
        lastLiveHydrateOkAt = Date.now();
        return { ok: true, applied: false, item: null, keptEditorLive: true };
      }
      /* mycase 메인이 사라짐 → 편집 설정으로 라이브 복구 (음원·스타일 유지) */
      try {
        const editor = readShowcaseStyle();
        writeLiveShowcaseStyle(editor, { source: "editor", skipSync: true });
        lastLiveHydrateOkAt = Date.now();
        return { ok: true, applied: true, item: null, restoredFromEditor: true };
      } catch {
        clearLiveShowcaseStyle();
        lastLiveHydrateOkAt = Date.now();
        return { ok: true, applied: false, item: null };
      }
    }
    const liveSource = readLiveShowcaseSource();
    if (liveSource?.source === "editor") {
      lastLiveHydrateOkAt = Date.now();
      return {
        ok: true,
        applied: false,
        item: data.item,
        skippedEditorPreview: true
      };
    }
    const applied = applyMycaseItemToLiveBroadcast(data.item);
    lastLiveHydrateOkAt = Date.now();
    return { ok: true, applied: Boolean(applied), item: data.item };
  })();

  if (!force) {
    liveHydrateInFlight = run.finally(() => {
      liveHydrateInFlight = null;
    });
    return liveHydrateInFlight;
  }
  return run;
}

export function readLiveBroadcastMeta() {
  try {
    const raw = localStorage.getItem(LIVE_CASE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 메인 송출 메타 제거 — 통화용 라이브는 편집 설정으로 되돌림(음원 유지) */
export function clearLiveBroadcastMeta() {
  try {
    localStorage.removeItem(LIVE_CASE_META_KEY);
  } catch {
    /* ignore */
  }
  try {
    const editor = readShowcaseStyle();
    writeLiveShowcaseStyle(editor, { source: "editor", skipSync: true });
  } catch {
    clearLiveShowcaseStyle();
  }
}

export { createDefaultShowcaseStyle };
