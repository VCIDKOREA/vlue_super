/**
 * 통화목록 탭 → 단일 확정 라우트
 *
 * 우선순위:
 * 1) 국가기관 DCP
 * 2) VLUE 회원 + 송출 콘텐츠 → 쇼케이스
 * 3) VLUE 회원 + 송출 OFF → 인증 팝업
 * 4) VLUE 회원(송출 미확정) → PENDING
 * 5) 저장 연락처(비회원) → 안심 (단말 — 이후 hydrate 로 덮지 않음)
 * 6) 명시 비회원 → 미인증
 * 7) 그 외 → PENDING
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

/** VLUE 회원 — 주소록/이름보다 항상 우선 */
export function isVlueMemberHint(call, cached = null) {
  const phone = phoneOf(call);
  const memberHint = phone ? readCallHistoryMemberHint(phone) : null;
  if (memberHint?.verified === true) return true;
  if (memberHint?.verified === false) return false;
  const pack = cached || (phone ? readCallHistoryPeerCache(phone) : null);
  if (pack?.verified === true && hasUuidUserId(pack.card || pack)) return true;
  if (call?.verified === true || call?.peerIsVlueMember === true) return true;
  if (hasUuidUserId(call) || hasUuidUserId(call?.cardSnapshot)) return true;
  return false;
}

/**
 * 저장 연락처 힌트 (비회원 안심).
 * CallLog 표시명·주소록 — 회원 분기가 먼저 처리됨.
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

  if (member && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }

  if (member) {
    if (style && typeof style === "object" && style.includeDigitalCard === false) {
      return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
    }
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  if (saved) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  if (isExplicitNonMember(call, cached)) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card };
  }

  return { kind: CALL_HISTORY_ROUTE.PENDING };
}

/**
 * 네트워크 페이로드로만 최종 확정 (pending 해소).
 * verified 는 UUID userId 있을 때만 회원으로 인정 — 약한 is_verified 로 안심→인증 교체 금지.
 */
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
 * 라우트 잠금.
 * SAFE / SHOWCASE / UNVERIFIED / AGENCY 는 단말 — hydrate 가 안심 팝업을 닫지 않음.
 * AUTH → SHOWCASE 상향만 허용.
 */
export function mayApplyRoute(lockedKind, nextKind) {
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  if (lockedKind === CALL_HISTORY_ROUTE.SAFE) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.SHOWCASE) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.UNVERIFIED) return false;
  if (lockedKind === CALL_HISTORY_ROUTE.AGENCY) return false;
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
  if (hint?.verified === false) return "nonmember";
  if (call?.verified === true || call?.peerIsVlueMember === true || hasUuidUserId(call)) {
    return "member";
  }
  if (call?.verified === false) return "nonmember";
  return "unknown";
}
