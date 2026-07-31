import { useFollowState } from "../../hooks/useFollowState.js";
import { isFollowTargetSelf } from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../../lib/vlueGuestAuthGate.js";

/**
 * 팔로우 액션 버튼
 * 상태: 팔로우 / 팔로잉 / 요청중 / 맞팔로우
 * 본인 프로필이면 "나" (비활성) — 검색 비공개와 무관하게 위치에는 항상 표시
 *
 * @param {{ targetUserId?: string|null, className?: string, disabled?: boolean, onToast?: (msg: string) => void }} props
 */
export default function FollowActionButton({ targetUserId, className = "", disabled = false, onToast }) {
  const isSelf = isFollowTargetSelf(targetUserId);
  const { label, isActive, isMutual, loading, busy, toggle } = useFollowState(targetUserId, {
    enabled: Boolean(targetUserId) && !isSelf,
    onError: (msg) => onToast?.(msg)
  });

  if (!targetUserId) return null;

  if (isSelf) {
    return (
      <button
        type="button"
        className={`follow-action-btn follow-action-btn--self ${className}`.trim()}
        disabled
        aria-label="내 프로필"
        title="내 프로필"
        data-follow-relation="self"
      >
        나
      </button>
    );
  }

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    const res = await toggle();
    if (res.ok) {
      if (res.action === "followed") onToast?.("팔로우했습니다.");
      else if (res.action === "requested") onToast?.("팔로우 요청을 보냈습니다.");
      else if (res.action === "unfollowed") onToast?.("팔로우를 취소했습니다.");
    }
  };

  return (
    <button
      type="button"
      className={`follow-action-btn ${isActive ? "follow-action-btn--active" : ""} ${isMutual ? "follow-action-btn--mutual" : ""} ${className}`.trim()}
      disabled={disabled || loading || busy}
      aria-pressed={isActive}
      aria-busy={busy}
      data-follow-relation={isMutual ? "mutual" : isActive ? "active" : "none"}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {loading ? "…" : label}
    </button>
  );
}
