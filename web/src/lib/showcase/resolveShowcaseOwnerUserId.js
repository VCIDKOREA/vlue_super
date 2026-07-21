const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

export function getLocalVlueUserId() {
  try {
    return String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    return "";
  }
}

/** 쇼케이스 카드에서 팔로우 대상 userId(UUID) 추출 */
export function resolveShowcaseOwnerUserId(card) {
  const raw = firstText(
    card?.userId,
    card?.ownerUserId,
    String(card?.feedId || "").replace(/^user-/i, "")
  );
  if (OWNER_UUID_RE.test(raw)) return raw;
  return "";
}

/**
 * 팔로우 버튼 표시 여부
 * - 검색 비공개(isShowcasePrivate 등)와 무관 — 비공개는 검색·PII 마스킹용
 * - userId가 있으면 표시 (본인이면 버튼에서 "나"로 처리)
 */
export function shouldShowShowcaseFollow(ownerUserId, opts = {}) {
  if (opts.hideFollow) return false;
  const id = String(ownerUserId || "").trim();
  return Boolean(id);
}

/** 카드에 userId가 없을 때 본인 미리보기용 fallback */
export function resolveFollowTargetUserId(card, opts = {}) {
  const fromCard = resolveShowcaseOwnerUserId(card);
  if (fromCard) return fromCard;
  if (opts.fallbackToMe) {
    const me = getLocalVlueUserId();
    if (OWNER_UUID_RE.test(me)) return me;
  }
  return "";
}

export function isFollowTargetSelf(targetUserId) {
  const me = getLocalVlueUserId();
  const id = String(targetUserId || "").trim();
  return Boolean(me && id && me === id);
}
