/**
 * 통화목록 탭 → 단일 확정 라우트
 *
 * 우선순위 (위에서 막히면 아래 안 봄):
 * 1) 국가기관 DCP
 * 2) VLUE 회원 + 송출 콘텐츠 → 쇼케이스
 * 3) VLUE 회원 + 송출 OFF → 인증 팝업
 * 4) VLUE 회원(송출 미확정) → PENDING (네트워크) — 절대 안심 금지
 * 5) 저장 연락처(비회원) → 안심
 * 6) 명시 비회원 → 미인증
 * 7) 그 외 → PENDING
 *
 * 금지:
 * - verified/회원 없이 hasContent 만으로 쇼케이스
 * - 회원 → 안심
 * - 쇼케이스/인증 ↔ 안심 교차 페인트
 */

import { resolveIsKnownContactSync } from "../contacts/hybridKnownContact.js";
import { matchNationalAgency } from "../nationalAgencyDcpClient.js";
import { peerHasDccOrShowcaseContent } from "../peerShowcaseContent.js";
import { readCallHistoryPeerCache } from "../callHistoryPeerCache.js";
import { readCallHistoryMemberHint } from "../callHistoryMemberIndex.js";

export const CALL_HISTORY_ROUTE = Object.freeze({
  SAFE: "safe",
  AUTH: "auth",
  SHOWCASE: "showcase",
  UNVERIFIED: "unverified",
  AGENCY: "agency",
  PENDING: "pending"
});

function phoneOf(call) {
  return String(call?.phoneDisplay || call?.phone || "").trim();
}

function isPhoneLikeLabel(raw) {
  const s = String(raw || "").trim();
  if (!s) return true;
  if (/^[\d\s\-()+]+$/.test(s)) return true;
  return false;
}

/** VLUE 회원 — 주소록/이름보다 항상 우선 */
export function isVlueMemberHint(call, cached = null) {
  const phone = phoneOf(call);
  const memberHint = phone ? readCallHistoryMemberHint(phone) : null;
  if (memberHint?.verified === true) return true;
  if (memberHint?.verified === false) return false;
  const pack = cached || (phone ? readCallHistoryPeerCache(phone) : null);
  if (pack?.verified === true) return true;
  if (call?.verified === true || call?.peerIsVlueMember === true) return true;
  if (call?.userId) return true;
  return false;
}

/**
 * 저장 연락처 힌트.
 * - 기기 주소록·contactName 확정
 * - CallLog 캐시 이름(번호가 아닌 표시명) — 안심 대상(재호민성·법인지원 등)
 * - 단, VLUE 회원으로 이미 확정된 경우는 호출부에서 회원 분기가 먼저 먹음
 */
export function isSavedContactHint(call, known = null) {
  const phone = phoneOf(call);
  const knownSync = known || resolveIsKnownContactSync(phone);
  if (knownSync?.isKnownContact) return true;
  if (String(call?.contactName || "").trim()) return true;
  const label = String(call?.name || call?.cachedName || "").trim();
  if (label && !isPhoneLikeLabel(label)) return true;
  return false;
}

function isExplicitNonMember(call, cached) {
  const phone = phoneOf(call);
  const memberHint = phone ? readCallHistoryMemberHint(phone) : null;
  if (memberHint?.verified === true || isVlueMemberHint(call, cached)) return false;
  if (memberHint?.verified === false) return true;
  if (call?.verified === false) return true;
  return false;
}

function packCard(cached, call) {
  return cached?.card || call?.cardSnapshot || null;
}

function packStyle(cached, call, card) {
  return (
    cached?.showcaseStyle ||
    card?.showcaseStyle ||
    call?.showcaseSnapshot ||
    null
  );
}

function packVerified(cached, call) {
  if (isVlueMemberHint(call, cached)) return true;
  if (cached?.verified === true) return true;
  if (call?.verified === true) return true;
  return false;
}

/**
 * @returns {{ kind: string, agency?: object, card?: object, verified?: boolean }}
 */
export function decideCallHistoryRoute(call, cachedPeer = null) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };

  const cached = cachedPeer || (phone ? readCallHistoryPeerCache(phone) : null);
  const known = resolveIsKnownContactSync(phone);
  const member = isVlueMemberHint(call, cached);
  const saved = isSavedContactHint(call, known);
  const card = packCard(cached, call);
  const style = packStyle(cached, call, card);
  const hasContent = peerHasDccOrShowcaseContent(card, style);
  const verified = packVerified(cached, call);

  /* 1) 회원 + 송출 콘텐츠 → 쇼케이스 (회원·verified 필수) */
  if (member && verified && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }

  /* 2) 회원 — 송출 OFF 확정이면 인증 팝업, 아니면 네트워크 */
  if (member) {
    if (style && typeof style === "object" && style.includeDigitalCard === false) {
      return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
    }
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  /* 3) 저장 비회원 → 안심 (회원 분기에서 이미 제외됨) */
  if (saved) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  /* 4) 명시 비회원 · 미저장 → 미인증 */
  if (isExplicitNonMember(call, cached)) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card };
  }

  return { kind: CALL_HISTORY_ROUTE.PENDING };
}

/**
 * 네트워크 페이로드로만 최종 확정 (pending 해소).
 */
export function decideCallHistoryRouteFromPayload(call, payload) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };

  const known = resolveIsKnownContactSync(phone);
  const saved = isSavedContactHint(call, known);
  const card = payload?.card || null;
  const style = payload?.showcaseStyle || card?.showcaseStyle || null;
  const verified = Boolean(payload?.verified);
  const hasContent = peerHasDccOrShowcaseContent(card, style);
  const publicDir = Boolean(
    payload?.publicDirectorySafe ||
      card?.dcp?.publicDirectorySafe ||
      card?.profileKind === "public_directory_safe" ||
      card?.profileKind === "contact_safe_care"
  );

  /* 회원 확정 */
  if (verified && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }
  if (verified && !hasContent) {
    return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
  }

  /* 비회원 — 저장/디렉터리 안심 */
  if (!verified && (saved || publicDir)) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card, verified: false };
}

/**
 * 라우트 잠금 — 한 번 깔린 화면을 다른 종류로 덮지 않음.
 * 예외: 안심/인증 → 회원 쇼케이스로만 상향 (오판 교정).
 * 쇼케이스 → 안심 하향 절대 금지.
 */
export function mayApplyRoute(lockedKind, nextKind) {
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  if (lockedKind === CALL_HISTORY_ROUTE.SHOWCASE) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.UNVERIFIED) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.AGENCY) return false;
  if (
    lockedKind === CALL_HISTORY_ROUTE.SAFE &&
    (nextKind === CALL_HISTORY_ROUTE.SHOWCASE || nextKind === CALL_HISTORY_ROUTE.AUTH)
  ) {
    return true;
  }
  if (
    lockedKind === CALL_HISTORY_ROUTE.AUTH &&
    nextKind === CALL_HISTORY_ROUTE.SHOWCASE
  ) {
    return true;
  }
  if (lockedKind === CALL_HISTORY_ROUTE.SAFE) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.AUTH) return false;
  return false;
}

/**
 * 목록 CTA
 * - 회원 → 케이스함
 * - 비회원 확정 → 전달
 * - 미확정 → 숨김
 */
export function resolveHistoryRowMemberState(call) {
  if (isVlueMemberHint(call)) return "member";
  const phone = phoneOf(call);
  const hint = phone ? readCallHistoryMemberHint(phone) : null;
  if (hint?.verified === true) return "member";
  if (hint?.verified === false) return "nonmember";
  if (call?.verified === true || call?.peerIsVlueMember === true || call?.userId) {
    return "member";
  }
  if (call?.verified === false) return "nonmember";
  return "unknown";
}
