/**
 * 통화목록 탭 → 단일 확정 라우트
 *
 * 1) 국가기관
 * 2) VLUE 회원 + 송출 → 쇼케이스
 * 3) VLUE 회원 + 송출 OFF → 인증
 * 4) VLUE 회원 미확정 송출 → PENDING
 * 5) 저장 비회원 → 안심
 * 6) 그 외 → PENDING / 미인증
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function phoneOf(call) {
  return String(call?.phoneDisplay || call?.phone || "").trim();
}

function isPhoneLikeLabel(raw) {
  const s = String(raw || "").trim();
  if (!s) return true;
  if (/^[\d\s\-()+]+$/.test(s)) return true;
  return false;
}

function hasUuidUserId(cardOrCall) {
  return UUID_RE.test(String(cardOrCall?.userId || cardOrCall?.ownerUserId || "").trim());
}

/**
 * VLUE 회원 힌트.
 * index verified:false 는 무시(독성 캐시) — 양수 신호만 신뢰.
 */
export function isVlueMemberHint(call, cached = null) {
  const phone = phoneOf(call);
  const memberHint = phone ? readCallHistoryMemberHint(phone) : null;
  if (memberHint?.verified === true) return true;
  if (call?.verified === true || call?.peerIsVlueMember === true) return true;
  if (hasUuidUserId(call) || hasUuidUserId(call?.cardSnapshot)) return true;
  const pack = cached || (phone ? readCallHistoryPeerCache(phone) : null);
  if (pack?.verified === true && hasUuidUserId(pack.card || pack)) return true;
  return false;
}

export function isSavedContactHint(call, known = null) {
  const phone = phoneOf(call);
  const knownSync = known || resolveIsKnownContactSync(phone);
  if (knownSync?.isKnownContact) return true;
  if (String(call?.contactName || "").trim()) return true;
  const label = String(call?.name || call?.cachedName || "").trim();
  if (label && !isPhoneLikeLabel(label)) return true;
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

  if (member && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }

  if (member) {
    if (style && typeof style === "object" && style.includeDigitalCard === false) {
      return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
    }
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  /* 저장 비회원 — 즉시 안심. 회원은 위에서 이미 제외.
     회원 여부가 아직 목록에 없으면 아래 PENDING 으로 by-number 확인 */
  if (saved) {
    const hint = phone ? readCallHistoryMemberHint(phone) : null;
    /* 양수로 회원 확정된 적 없으면 저장번호는 안심.
       (독성 false 는 isVlueMemberHint 에서 무시됨) */
    if (hint?.verified === true) {
      return { kind: CALL_HISTORY_ROUTE.PENDING };
    }
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  if (call?.verified === false) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card };
  }

  return { kind: CALL_HISTORY_ROUTE.PENDING };
}

export function decideCallHistoryRouteFromPayload(call, payload) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };

  const known = resolveIsKnownContactSync(phone);
  const saved = isSavedContactHint(call, known);
  const card = payload?.card || null;
  const style = payload?.showcaseStyle || card?.showcaseStyle || null;
  const hasUuid = hasUuidUserId(card);
  const verified = Boolean(payload?.verified) && hasUuid;
  const hasContent = peerHasDccOrShowcaseContent(card, style);
  const publicDir = Boolean(
    payload?.publicDirectorySafe ||
      card?.dcp?.publicDirectorySafe ||
      card?.profileKind === "public_directory_safe" ||
      card?.profileKind === "contact_safe_care"
  );

  if (verified && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }
  if (verified && !hasContent) {
    return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
  }
  if (!verified && (saved || publicDir)) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }
  return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card, verified: false };
}

/**
 * SAFE 잠금 중에는 UUID 회원 상향(AUTH/SHOWCASE)만 허용.
 * UNVERIFIED 등으로 안심을 닫지 않음.
 */
export function mayApplyRoute(lockedKind, nextKind) {
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  if (lockedKind === CALL_HISTORY_ROUTE.SHOWCASE) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.UNVERIFIED) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.AGENCY) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.SAFE) {
    return (
      nextKind === CALL_HISTORY_ROUTE.SHOWCASE || nextKind === CALL_HISTORY_ROUTE.AUTH
    );
  }
  if (
    lockedKind === CALL_HISTORY_ROUTE.AUTH &&
    nextKind === CALL_HISTORY_ROUTE.SHOWCASE
  ) {
    return true;
  }
  if (lockedKind === CALL_HISTORY_ROUTE.AUTH) return false;
  return false;
}

export function resolveHistoryRowMemberState(call) {
  if (isVlueMemberHint(call)) return "member";
  const phone = phoneOf(call);
  const hint = phone ? readCallHistoryMemberHint(phone) : null;
  if (hint?.verified === true) return "member";
  /* index false 는 CTA 비회원으로 쓰지 않음 — 미확정 숨김 */
  if (call?.verified === true || call?.peerIsVlueMember === true || hasUuidUserId(call)) {
    return "member";
  }
  return "unknown";
}
