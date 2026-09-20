/**
 * 통화목록 탭 → 단일 확정 라우트 (정책 고정)
 *
 * DCC+쇼케이스 / 일반 쇼케이스: 회원 + 송출 ON + 콘텐츠
 * 안심: 저장 비회원 · 회원 송출 OFF · VLUE DB 적재(비송출)
 * 미인증: 미저장 · DB 없음 · 모르는 비회원
 *
 * 금지: 회원(케이스함)을 안심으로 잠그기, 안심↔쇼케이스 플리커
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

/** VLUE 회원 힌트 — 저장연락처보다 우선 (김광덕 안심 오판 방지) */
export function isVlueMemberHint(call, cached = null) {
  const phone = phoneOf(call);
  const memberHint = phone ? readCallHistoryMemberHint(phone) : null;
  if (memberHint?.verified === true) return true;
  const pack = cached || (phone ? readCallHistoryPeerCache(phone) : null);
  if (pack?.verified === true) return true;
  if (call?.verified === true || call?.peerIsVlueMember === true) return true;
  if (call?.userId) return true;
  return false;
}

/**
 * 저장된 번호 — 주소록·CallLog 표시명(번호가 아닌 이름).
 * contactName 비어 있어도 name/cachedName 이 이름이면 저장으로 본다 (법인지원설립센터).
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
  /* 회원 힌트가 있으면 peer unmatched(verified:false) 로 비회원 단정 금지 */
  if (memberHint?.verified === true || isVlueMemberHint(call, cached)) return false;
  if (memberHint?.verified === false) return true;
  /* peer 캐시 unmatched 는 lookup 레이스 — 목록 CTA·라우트에 쓰지 않음 */
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

  /* 1) 송출 ON + 콘텐츠 → 쇼케이스 (DCC+ / 일반) */
  if (hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }

  /* 2) VLUE 회원 — 절대 SAFE 로 잠그지 않음. 네트워크로 송출 확정 */
  if (member) {
    if (style && typeof style === "object" && style.includeDigitalCard === false) {
      return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
    }
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  /* 3) 저장 연락처 → 안심 (회원은 2단계에서 이미 제외) */
  if (saved) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }

  /* 4) 명시 비회원 · 미저장 → 미인증 */
  if (isExplicitNonMember(call, cached)) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED };
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

  if (verified && hasContent) {
    return { kind: CALL_HISTORY_ROUTE.SHOWCASE, card, verified: true };
  }
  if (verified && !hasContent) {
    return { kind: CALL_HISTORY_ROUTE.AUTH, card, verified: true };
  }
  /* VLUE DB 적재·저장 비회원 → 안심 */
  if (!verified && (saved || publicDir)) {
    return { kind: CALL_HISTORY_ROUTE.SAFE };
  }
  return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card, verified: false };
}

/**
 * 라우트 잠금.
 * - PENDING → 최종 허용
 * - SAFE 확정 후 같은 SAFE 재적용은 무시(플리커 방지) — 호출부에서 처리
 * - SAFE 오판(회원) → SHOWCASE/AUTH 교정만 허용
 * - SHOWCASE 다운그레이드 금지
 */
export function mayApplyRoute(lockedKind, nextKind) {
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  if (lockedKind === CALL_HISTORY_ROUTE.SHOWCASE) return false;
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
  /* SAFE 중 UNVERIFIED 등으로 끊지 않음 */
  if (lockedKind === CALL_HISTORY_ROUTE.SAFE) return false;
  return false;
}

/**
 * 목록 CTA
 * - 회원 확정 → 케이스함
 * - 영속 인덱스·목록에서 비회원 확정 → 전달
 * - peer 캐시 unmatched(verified:false) 는 무시 (lookup 레이스가 노란 전달을 먼저 띄움)
 * - 미확정 → 버튼 숨김 (노란→보라 플래시 금지)
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
