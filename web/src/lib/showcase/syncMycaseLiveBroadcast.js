import {
  createDefaultShowcaseStyle,
  writeShowcaseStyle
} from "./showcaseStyleStorage.js";
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
 * 메인 송출 케이스 → 로컬 라이브 쇼케이스(통화·홈 미리보기)에 반영
 * @param {object|null|undefined} item serializeCase 형태 (payloadJson 포함)
 * @returns {object|null} 적용된 style
 */
export function applyMycaseItemToLiveBroadcast(item) {
  const style = extractMycaseShowcaseStyle(item?.payloadJson);
  if (!style) return null;

  const applied = writeShowcaseStyle(style, { replace: true });
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
 * @returns {Promise<{ ok: boolean, applied: boolean, item?: object|null, message?: string }>}
 */
export async function hydrateLiveBroadcastFromServer() {
  const data = await fetchMycaseLiveBroadcast();
  if (!data.ok) {
    return { ok: false, applied: false, message: data.message };
  }
  if (!data.item) {
    return { ok: true, applied: false, item: null };
  }
  const applied = applyMycaseItemToLiveBroadcast(data.item);
  return { ok: true, applied: Boolean(applied), item: data.item };
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

/** 테스트·리셋용 */
export function clearLiveBroadcastMeta() {
  try {
    localStorage.removeItem(LIVE_CASE_META_KEY);
  } catch {
    /* ignore */
  }
}

export { createDefaultShowcaseStyle };
