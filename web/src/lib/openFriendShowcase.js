/** 친구 목록 → 홈 친구 쇼케이스 미리보기 열기 */
export const VLUE_OPEN_FRIEND_SHOWCASE_EVENT = "vlue-open-friend-showcase";

/**
 * @param {{ userId?: string, publicHandle?: string, displayName?: string, phone?: string, avatarUrl?: string, membershipTier?: string }} peer
 */
export function openFriendShowcase(peer = {}) {
  if (typeof window === "undefined") return;
  const detail = {
    userId: String(peer.userId || "").trim(),
    publicHandle: String(peer.publicHandle || "").replace(/^@/, "").trim(),
    displayName: String(peer.displayName || peer.name || "").trim(),
    phone: String(peer.phone || peer.phoneDisplay || "").trim(),
    avatarUrl: String(peer.avatarUrl || peer.photoUrl || "").trim(),
    membershipTier: String(peer.membershipTier || "free").trim() || "free"
  };
  if (!detail.userId && !detail.publicHandle && !detail.phone) return;
  try {
    window.dispatchEvent(new CustomEvent(VLUE_OPEN_FRIEND_SHOWCASE_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}
