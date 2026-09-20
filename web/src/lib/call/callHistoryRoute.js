/**
 * 통화목록 탭 — 4분류 규정 (단일 소스)
 *
 * ① DCC+쇼케이스  : 유료회원 + DCC 본문 + 쇼케이스 송출 ON
 * ② 일반 쇼케이스 : 유/무료 회원 + 송출 ON (DCC 없음·또는 유료가 아님)
 * ③ 안심팝업      : 저장번호 · VLUE 비회원 · 회원(송출 OFF) · VLUE DB 적재번호
 * ④ 미인증        : 비회원 + 미저장 + VLUE DB 없음
 *
 * 회원 가입/탈퇴·유료↔무료·송출 ON/OFF 는 네트워크 확정(facts.conclusive)일 때만
 * 버킷을 바꾼다. 추측 페인트로 ③↔①② 를 오가지 않는다.
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
  /** ① DCC+ / ② 일반 — UI 동일(Lettering), variant 로 구분 */
  SHOWCASE: "showcase",
  /** ③ 안심 */
  SAFE: "safe",
  /** ④ 미인증 */
  UNVERIFIED: "unverified",
  AGENCY: "agency",
  PENDING: "pending",
  /** @deprecated 규정 ③으로 통합 — 송출 OFF 회원은 안심 */
  AUTH: "safe"
});

export const SHOWCASE_VARIANT = Object.freeze({
  DCC_PLUS: "dcc_plus",
  NORMAL: "normal"
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

function isInVlueDb(card, payload) {
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

/**
 * 관측 사실을 한 객체로 모은다.
 * @returns {{
 *   phone: string,
 *   isMember: boolean,
 *   isPaid: boolean,
 *   broadcastOn: boolean,
 *   hasDcc: boolean,
 *   hasShowcaseContent: boolean,
 *   isSaved: boolean,
 *   inVlueDb: boolean,
 *   card: object|null,
 *   style: object|null,
 *   conclusive: boolean
 * }}
 */
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
  const hasDcc = cardHasDccBody(card);
  const hasShowcaseContent = peerHasDccOrShowcaseContent(card, style);
  const isSaved = isSavedContactHint(call, known);
  const inVlueDb = isInVlueDb(card, payload);
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
    card,
    style,
    conclusive
  };
}

/**
 * 4분류 결정 — 규정 그대로.
 * @returns {{ kind: string, variant?: string, card?: object, verified?: boolean, agency?: object }}
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
    card
  } = facts;

  /* ①② 회원 + 송출 ON + 실콘텐츠 */
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

  /* ③ 안심 — 저장 · 비회원 DB적재 · 회원 송출 OFF · (회원인데 송출/콘텐츠 미확정이면 PENDING) */
  if (isMember && facts.conclusive && (!broadcastOn || !hasShowcaseContent)) {
    return { kind: CALL_HISTORY_ROUTE.SAFE, card, verified: true };
  }
  if (!isMember && (isSaved || inVlueDb)) {
    return { kind: CALL_HISTORY_ROUTE.SAFE, card, verified: false };
  }
  if (isSaved && !isMember) {
    return { kind: CALL_HISTORY_ROUTE.SAFE, card, verified: false };
  }

  /* 회원인데 송출 여부를 아직 모름 → 네트워크 */
  if (isMember && !facts.conclusive) {
    return { kind: CALL_HISTORY_ROUTE.PENDING };
  }

  /* ④ 미인증 — 비회원 · 미저장 · DB 없음 (확정 시에만) */
  if (facts.conclusive && !isMember && !isSaved && !inVlueDb) {
    return { kind: CALL_HISTORY_ROUTE.UNVERIFIED, card, verified: false };
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

/**
 * 버킷 전이.
 * - PENDING → 최종 허용
 * - 동일 버킷 유지
 * - conclusive(네트워크 확정) 일 때만 ①②③④ 상호 전이 허용
 *   (가입·탈퇴·송출 ON/OFF·유료↔무료)
 */
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
