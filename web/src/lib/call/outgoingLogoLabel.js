/**
 * 발신 탭로고(미니버블) 상단 텍스트 — 단일 규칙.
 *
 * - VLUÉ DB 상호/이름이 있으면        → 상호명 또는 이름
 * - 연락처 저장 번호(안심케어 카드)    → 저장된 이름/상호
 * - VLUÉ 미등록 · 모르는 번호 · 조회 중 → 「탭하여 정보확인」
 *
 * 로고 하단의 「연결중...」 은 삭제됐다 — 연결 상태는 라벨에 반영하지 않는다.
 */

export const OUTGOING_LOGO_TAP_HINT = "탭하여 정보확인";

const PHONE_LIKE = /^[\d\s\-()+.]+$/;

function cleanName(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "null" || s === "undefined") return "";
  /* 번호 문자열은 이름이 아니다 */
  if (PHONE_LIKE.test(s)) return "";
  return s;
}

/**
 * @param {object|null|undefined} card 오버레이 카드 (styledCard/card)
 * @returns {string}
 */
export function resolveOutgoingLogoLabel(card) {
  if (!card || typeof card !== "object") return OUTGOING_LOGO_TAP_HINT;

  const kind = String(card.profileKind || "").trim();
  /* 조회 대기 · 미등록 확정 → 항상 탭 유도 문구 */
  if (kind === "lookup_pending" || kind === "unverified" || card.matched === false) {
    return OUTGOING_LOGO_TAP_HINT;
  }

  const name =
    cleanName(card.organization) ||
    cleanName(card.companyName) ||
    cleanName(card.displayName) ||
    cleanName(card.name) ||
    cleanName(card.contactName);

  return name || OUTGOING_LOGO_TAP_HINT;
}
