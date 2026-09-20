/**
 * 통화목록 라우팅 — 표 규정 (단일 소스)
 *
 * | 구분 | 대상 조건 | 노출 |
 * | DCC+쇼케이스 | 유료회원 + DCC등록완료 + 쇼케이스 콘텐츠 + 송출ON | DCC+풀 오버레이 |
 * | 일반 쇼케이스 | 유/무료회원 + DCC미등록 + 쇼케이스 콘텐츠 + 송출ON | 일반 쇼케이스 오버레이 |
 * | 안심(정상) | 저장 비회원 · 회원 송출OFF · 회원 DCC/쇼케이스 미등록 · VLUE인증DB 적재 | 안심카드+띠배너 |
 * | 안심(비정상) | 스팸·피싱·사기 신고DB · 경로검증 이상 | 경고형 안심카드 |
 * | 미인증 | 미저장 + 비회원 + VLUE DB 없음 | 미인증 기본 케이스 |
 *
 * 가입/탈퇴·유료↔무료·송출 ON/OFF 는 conclusive(네트워크)일 때만 버킷 전이.
 */

import { resolveIsKnownContactSync } from "../contacts/hybridKnownContact.js";
import { matchNationalAgency } from "../nationalAgencyDcpClient.js";
import {
  cardHasDccBody,
  peerHasDccOrShowcaseContent,
  peerShowcaseBroadcastOn
} from "../peerShowcaseContent.js";
import { readCallHistoryPeerCache } from "../callHistoryPeerCache.js";
import { readCallHistoryMemberHint } from "../callHistoryMemberIndex.js";
import { isPaidLetteringTier } from "../letteringMembership.js";

export const CALL_HISTORY_ROUTE = Object.freeze({
  SHOWCASE: "showcase",
  SAFE: "safe",
  UNVERIFIED: "unverified",
  AGENCY: "agency",
  PENDING: "pending",
  /** @deprecated → SAFE */
  AUTH: "safe"
});

export const SHOWCASE_VARIANT = Object.freeze({
  DCC_PLUS: "dcc_plus",
  NORMAL: "normal"
});

export const SAFE_VARIANT = Object.freeze({
  NORMAL: "normal",
  ABNORMAL: "abnormal"
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

/** DCC 등록 완료 — 상호·로고 등 본문 또는 발급 플래그 */
function isDccRegistered(card) {
  if (cardHasDccBody(card)) return true;
  if (card?.digitalCardIssued === true || card?.digitalCardActive === true) return true;
  return false;
}

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

/** VLUE 인증 DB 적재 (회원 UUID · 공개 디렉터리 안심 등) */
function isInVlueVerifyDb(card, payload) {
  if (hasUuidUserId(card)) return true;
  if (payload?.verified === true) return true;
  if (
    payload?.publicDirectorySafe ||
    card?.dcp?.publicDirectorySafe ||
    card?.profileKind === "public_directory_safe" ||
    card?.profileKind === "contact_safe_care"
  ) {
    return true;
  }
  return false;
}

/** 스팸·피싱·사기 / 경로검증 비정상 */
function isAbnormalPath(card, payload, call) {
  const dcp = card?.dcp && typeof card.dcp === "object" ? card.dcp : {};
  const status = String(
    payload?.routeStatus ||
      payload?.dcpRoute ||
      dcp.routeStatus ||
      call?.routeStatus ||
      ""
  )
    .trim()
    .toLowerCase();
  if (status === "abnormal") return true;
  if (payload?.abnormal === true || dcp.abnormal === true || call?.abnormal === true) return true;
  if (String(payload?.warning || dcp.warning || "").trim() && status === "abnormal") return true;
  return false;
}

export function buildCallHistoryPeerFacts(call, cachedPeer = null, payload = null) {
  const phone = phoneOf(call);
  const cached = cachedPeer || (phone ? readCallHistoryPeerCache(phone) : null);
  const card = payload?.card || packCard(cached, call);
  const style = payload
    ? payload.showcaseStyle || payload.card?.showcaseStyle || null
    : packStyle(cached, call, card);
  const known = resolveIsKnownContactSync(phone);

  const fromPayloadMember =
    payload != null && Boolean(payload.verified) && hasUuidUserId(payload.card);
  const isMember = fromPayloadMember || isVlueMemberHint(call, cached);
  const tier =
    card?.membershipTier || call?.membershipTier || cached?.card?.membershipTier || "free";
  const isPaid = isPaidLetteringTier(tier);
  const broadcastOn = peerShowcaseBroadcastOn(style);
  const hasDcc = isDccRegistered(card);
  const hasShowcaseContent = peerHasDccOrShowcaseContent(card, style);
  const isSaved = isSavedContactHint(call, known);
  const inVlueDb = isInVlueVerifyDb(card, payload);
  const abnormal = isAbnormalPath(card, payload, call);
  const warning = String(
    payload?.warning || card?.dcp?.warning || call?.warning || ""
  ).trim();
  const conclusive = payload != null;

  return {
    phone,
    isMember,
    isPaid,
    broadcastOn,
    hasDcc,
    hasShowcaseContent,
    isSaved,
    inVlueDb,
    abnormal,
    warning,
    card,
    style,
    conclusive
  };
}

/**
 * @returns {{ kind: string, variant?: string, card?: object, verified?: boolean, agency?: object, warning?: string }}
 */
export function decideBucketFromFacts(facts, agency = null) {
  if (agency) return { kind: CALL_HISTORY_ROUTE.AGENCY, agency };

  const {
    isMember,
    isPaid,
    broadcastOn,
    hasDcc,
    hasShowcaseContent,
    isSaved,
    inVlueDb,
    abnormal,
    warning,
    card
  } = facts;

  /* 안심(비정상) — 스팸·피싱·경로이상 (쇼케이스보다 우선) */
  if (abnormal) {
    return {
      kind: CALL_HISTORY_ROUTE.SAFE,
      variant: SAFE_VARIANT.ABNORMAL,
      card,
      verified: Boolean(isMember),
      warning
    };
  }

  /* DCC+ / 일반 쇼케이스 — 회원 + 송출 ON + 쇼케이스 콘텐츠 */
  if (isMember && broadcastOn && hasShowcaseContent) {
    const variant =
      isPaid && hasDcc ? SHOWCASE_VARIANT.DCC_PLUS : SHOWCASE_VARIANT.NORMAL;
    return {
      kind: CALL_HISTORY_ROUTE.SHOWCASE,
      variant,
      card,
      verified: true
    };
  }

  /* 안심(정상)
   * - 저장 비회원
   * - 회원 송출 OFF
   * - 회원 DCC/쇼케이스 미등록(콘텐츠 없음)
   * - VLUE 인증 DB 적재 비회원
   */
  if (isMember && facts.conclusive && (!broadcastOn || !hasShowcaseContent)) {
    return {
      kind: CALL_HISTORY_ROUTE.SAFE,
      variant: SAFE_VARIANT.NORMAL,
      card,
      verified: true
    };
  }
  if (!isMember && (isSaved || inVlueDb)) {
    return {
      kind: CALL_HISTORY_ROUTE.SAFE,
      variant: SAFE_VARIANT.NORMAL,
      card,
      verified: false
    };
  }

  if (isMember && !facts.conclusive) {
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  /* 미인증 — 미저장 + 비회원 + DB 없음 */
  if (facts.conclusive && !isMember && !isSaved && !inVlueDb) {
    return {
      kind: CALL_HISTORY_ROUTE.UNVERIFIED,
      card,
      verified: false
    };
  }

  /* 저장만 있고 회원 힌트 없음 → 안심(정상) 즉시 */
  if (isSaved && !isMember) {
    return {
      kind: CALL_HISTORY_ROUTE.SAFE,
      variant: SAFE_VARIANT.NORMAL,
      card,
      verified: false
    };
  }

  return { kind: CALL_HISTORY_ROUTE.PENDING };
}

export function decideCallHistoryRoute(call, cachedPeer = null) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  const facts = buildCallHistoryPeerFacts(call, cachedPeer, null);
  return decideBucketFromFacts(facts, agency);
}

export function decideCallHistoryRouteFromPayload(call, payload) {
  const phone = phoneOf(call);
  const agency = phone ? matchNationalAgency(phone) : null;
  const facts = buildCallHistoryPeerFacts(call, null, payload || {});
  return decideBucketFromFacts(facts, agency);
}

export function mayApplyRoute(lockedKind, nextKind, opts = {}) {
  const conclusive = Boolean(opts.conclusive);
  if (!lockedKind || lockedKind === CALL_HISTORY_ROUTE.PENDING) return true;
  if (lockedKind === nextKind) return true;
  if (lockedKind === CALL_HISTORY_ROUTE.AGENCY && nextKind !== CALL_HISTORY_ROUTE.AGENCY) {
    return false;
  }
  if (conclusive) return true;
  return false;
}

export function resolveHistoryRowMemberState(call) {
  if (isVlueMemberHint(call)) return "member";
  const phone = phoneOf(call);
  const hint = phone ? readCallHistoryMemberHint(phone) : null;
  if (hint?.verified === true) return "member";
  if (call?.verified === true || call?.peerIsVlueMember === true || hasUuidUserId(call)) {
    return "member";
  }
  return "unknown";
}
