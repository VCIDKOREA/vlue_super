/**
 * 발신 탭로고(미니버블) 상단 텍스트 — 단일 규칙.
 *
 * - VLUÉ DB 상호/이름이 있으면        → 상호명 또는 이름
 * - 연락처 저장 번호(안심케어 카드)    → 저장된 이름/상호
 * - VLUÉ 미등록 · 모르는 번호 · 조회 중 → 제보된 상호, 없으면 「탭하여 정보확인」
 *
 * 로고 하단의 「연결중...」 은 삭제됐다 — 연결 상태는 라벨에 반영하지 않는다.
 */

import { peerAuthCycleLapsed, peerMayUsePaidCallFeatures } from "../letteringMembership.js";

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
export function resolveOutgoingLogoLabel(card, communityTipLabel = "") {
  const tipped = cleanName(communityTipLabel) || cleanName(card?.communityTipLabel);
  if (!card || typeof card !== "object") return tipped || OUTGOING_LOGO_TAP_HINT;

  const kind = String(card.profileKind || "").trim();
  /*
   * 주소록 저장 번호(안심케어 카드)는 matched:false 로 내려온다 — 미등록 판정보다 먼저 저장 이름을 쓴다.
   * (이전: matched===false 분기가 먼저 걸려 저장된 번호도 「탭하여 정보확인」 으로 표시됨)
   */
  if (kind === "contact_safe_care") {
    const saved =
      cleanName(card.contactName) ||
      cleanName(card.displayName) ||
      cleanName(card.name) ||
      cleanName(card.dcp?.contactName);
    return saved || OUTGOING_LOGO_TAP_HINT;
  }
  /* 조회 대기 · 미등록 — 다른 회원의 제보 상호가 있으면 그 이름. 시안 배지는 붙이지 않는다. */
  if (kind === "lookup_pending" || kind === "unverified" || card.matched === false) {
    return tipped || OUTGOING_LOGO_TAP_HINT;
  }

  const name =
    cleanName(card.organization) ||
    cleanName(card.companyName) ||
    cleanName(card.displayName) ||
    cleanName(card.name) ||
    cleanName(card.contactName);

  return name || OUTGOING_LOGO_TAP_HINT;
}

function personName(card, company) {
  const candidates = [card?.name, card?.legalName, card?.displayName, card?.contactName];
  for (const raw of candidates) {
    const name = cleanName(raw);
    if (name && name !== company) return name;
  }
  return "";
}

function cardHasLiveDcc(card, company) {
  if (!card || !company) return false;
  if (peerAuthCycleLapsed(card)) return false;
  if (!peerMayUsePaidCallFeatures(card.membershipTier)) return false;
  if (card.digitalCardActive === true) return true;
  return card.showcaseStyle?.includeDigitalCard === true;
}

/**
 * 탭로고·미니케이스 1줄.
 * DCC(회사명 필수)가 있으면 회사명과 이름을 2초마다 교대.
 * DCC 없는 유료 회원은 이름만 고정.
 */
export function resolveCallIdentityRoll(card, communityTipLabel = "") {
  const fallback = resolveOutgoingLogoLabel(card, communityTipLabel);
  const kind = String(card?.profileKind || "").trim();
  if (
    !card ||
    kind === "contact_safe_care" ||
    kind === "lookup_pending" ||
    kind === "unverified" ||
    kind === "expired_line" ||
    card.matched === false
  ) {
    return { labels: [fallback], roll: false };
  }
  const company = cleanName(card.organization) || cleanName(card.companyName);
  const person = personName(card, company);
  if (cardHasLiveDcc(card, company) && person) {
    return { labels: [company, person], roll: true };
  }
  if (cardHasLiveDcc(card, company)) {
    return { labels: [company], roll: false };
  }
  const onlyName = person || cleanName(card.displayName) || cleanName(card.name) || fallback;
  return { labels: [onlyName], roll: false };
}

/** 발신 탭로고 — 유료 회원·유료 가족 구성원 이름 옆 시안 배지. */
export function outgoingLogoShowsMemberBadge(card, verified) {
  const flag = card?.vlueVerifiedBadge ?? card?.vlue_verified_badge;
  if (flag !== true) return false;
  const kind = String(card?.profileKind || "").trim();
  if (
    kind === "contact_safe_care" ||
    kind === "public_directory_safe" ||
    kind === "unverified" ||
    kind === "lookup_pending" ||
    kind === "expired_line"
  ) {
    return false;
  }
  if (!verified && card?.matched === false) return false;
  const label = resolveOutgoingLogoLabel(card);
  return Boolean(label) && label !== OUTGOING_LOGO_TAP_HINT;
}
