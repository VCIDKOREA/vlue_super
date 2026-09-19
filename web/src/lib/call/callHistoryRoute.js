/**
 * 통화목록 탭 → 단일 확정 라우트.
 * 플리커 금지: pending 은 스피너만, 확정 후 다른 종류로 바꾸지 않음(업그레이드만 허용).
 *
 * DCC+쇼케이스 / 일반 쇼케이스: 송출 ON + 콘텐츠
 * 안심(정상): 저장번호·비회원 / 회원 송출 OFF
 * 미인증: 미저장·DB 미적재 비회원
 */

import { resolveIsKnownContactSync } from "../contacts/hybridKnownContact.js";
import { matchNationalAgency } from "../nationalAgencyDcpClient.js";
import { peerHasDccOrShowcaseContent, peerShowcaseBroadcastOn } from "../peerShowcaseContent.js";
import { readCallHistoryPeerCache } from "../callHistoryPeerCache.js";

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

function isVerifiedHint(call, cached) {
  if (cached?.verified === true) return true;
  if (call?.verified === true || call?.peerIsVlueMember === true) return true;
  if (call?.userId) return true;
  return false;
}

function isExplicitNonMember(call, cached) {
  if (cached?.verified === false) return true;
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

/**
 * @returns {{ kind: string, agency?: object, card?: object, verified?: boolean }}
 */
export function decideCallHistoryRoute(call, cachedPeer = null) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };

  const cached = cachedPeer || (phone ? readCallHistoryPeerCache(phone) : null);
  const known = resolveIsKnownContactSync(phone);
  const isSaved = Boolean(known.isKnownContact || call?.contactName);
  const card = packCard(cached, call);
  const style = packStyle(cached, call, card);
  const verified = isVerifiedHint(call, cached);
  const hasContent = peerHasDccOrShowcaseContent(card, style);

  if (hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }

  if (verified) {
    if (!card) return { kind: CALL_HISTORY_ROUTE.PENDING };
    /* 송출 ON 인데 콘텐츠 미완 → 안심/인증으로 찍지 말고 대기 (김광덕 플리커 방지) */
    if (peerShowcaseBroadcastOn(style)) {
      return { kind: CALL_HISTORY_ROUTE.PENDING };
    }
    if (style && typeof style === "object" && style.includeDigitalCard === false) {
      return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
    }
    /* 스타일 키 없음 → 네트워크 확정 전 추측 금지 */
    if (!style) return { kind: CALL_HISTORY_ROUTE.PENDING };
    return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
  }

  if (isSaved && !verified) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  if (isExplicitNonMember(call, cached) && !isSaved) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED };
  }

  if (isExplicitNonMember(call, cached) && isSaved) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
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
  const isSaved = Boolean(known.isKnownContact || call?.contactName);
  const card = payload?.card || null;
  const style = payload?.showcaseStyle || card?.showcaseStyle || null;
  const verified = Boolean(payload?.verified);
  const hasContent = peerHasDccOrShowcaseContent(card, style);

  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };
  if (verified && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }
  if (verified && !hasContent) {
    return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
  }
  if (!verified && isSaved) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }
  return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card, verified: false };
}

/**
 * 확정 라우트 잠금 — showcase/safe/auth/unverified 끼리 뒤집기 금지.
 * pending → 최종만 허용. showcase 확정 후 다운그레이드 금지.
 */
export function mayApplyRoute(lockedKind, nextKind) {
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  /* 송출 확인 후 쇼케이스만 예외 업그레이드 */
  if (
    (lockedKind === CALL_HISTORY_ROUTE.AUTH || lockedKind === CALL_HISTORY_ROUTE.PENDING) &&
    nextKind === CALL_HISTORY_ROUTE.SHOWCASE
  ) {
    return true;
  }
  return false;
}

/**
 * 목록 CTA — 회원여부 미확정이면 버튼 숨김(노란 플래시 금지).
 */
export function resolveHistoryRowMemberState(call) {
  const phone = phoneOf(call);
  const cached = phone ? readCallHistoryPeerCache(phone) : null;
  if (cached?.verified === true || call?.verified === true || call?.peerIsVlueMember === true) {
    return "member";
  }
  if (call?.userId) return "member";
  if (cached?.verified === false || call?.verified === false) return "nonmember";
  /* memberName 단독은 노란→보라 플래시 원인 — 미확정 */
  return "unknown";
}
