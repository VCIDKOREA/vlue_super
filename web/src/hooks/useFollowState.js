import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFollowState,
  followButtonLabel,
  isFollowActiveState,
  toggleFollow
} from "../lib/followApi.js";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../lib/vlueGuestAuthGate.js";

/**
 * 팔로우 상태 조회 + 낙관적 토글
 * @param {string|null|undefined} targetUserId
 * @param {{ enabled?: boolean, onError?: (msg: string) => void }} [opts]
 */
export function useFollowState(targetUserId, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(targetUserId);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [busy, setBusy] = useState(false);
  const rollbackRef = useRef(null);
  const onErrorRef = useRef(opts.onError);
  onErrorRef.current = opts.onError;

  const reload = useCallback(async () => {
    if (!targetUserId) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchFollowState(targetUserId);
    if (res.ok) setState(res.state);
    else onErrorRef.current?.(res.error || "상태를 불러오지 못했습니다.");
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    if (!enabled) {
      setState(null);
      setLoading(false);
      return;
    }
    reload();
  }, [enabled, reload]);

  const optimisticNextRelation = useCallback((current) => {
    if (!current) return "following";
    if (current.relation === "mutual") return "followed_by";
    if (current.relation === "following") return "none";
    if (current.relation === "pending_out") return "none";
    if (current.target?.isPrivateFollow) return "pending_out";
    return "following";
  }, []);

  const applyOptimistic = useCallback(
    (prev) => {
      if (!prev) {
        const nextRelation = optimisticNextRelation(null);
        return {
          relation: nextRelation,
          label: followButtonLabel(nextRelation),
          isFollowing: isFollowActiveState(nextRelation),
          isFollowedBy: false,
          isMutual: false,
          isPendingOut: nextRelation === "pending_out",
          isPendingIn: false,
          followId: null,
          incomingFollowId: null,
          counts: { followers: 0, following: 0 },
          target: { userId: targetUserId, isPrivateFollow: false }
        };
      }

      const nextRelation = optimisticNextRelation(prev);
      const wasActive = prev.relation === "following" || prev.relation === "mutual";
      const nowActive = isFollowActiveState(nextRelation);
      let followers = prev.counts?.followers ?? 0;
      if (!wasActive && nowActive && nextRelation !== "pending_out") followers += 1;
      if (wasActive && !nowActive) followers = Math.max(0, followers - 1);

      return {
        ...prev,
        relation: nextRelation,
        label: followButtonLabel(nextRelation),
        isFollowing: nextRelation === "following" || nextRelation === "mutual",
        isFollowedBy: nextRelation === "followed_by" || nextRelation === "mutual",
        isMutual: nextRelation === "mutual",
        isPendingOut: nextRelation === "pending_out",
        isPendingIn: nextRelation === "pending_in",
        counts: { ...prev.counts, followers }
      };
    },
    [optimisticNextRelation, targetUserId]
  );

  const toggle = useCallback(async () => {
    if (!targetUserId || busy) return { ok: false };
    if (!hasVlueLoggedInSession()) {
      onErrorRef.current?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return { ok: false, error: VLUE_MEMBERSHIP_REQUIRED_MSG, needsAuth: true };
    }
    rollbackRef.current = state;
    setBusy(true);
    setState((prev) => applyOptimistic(prev));

    const res = await toggleFollow(targetUserId);
    setBusy(false);

    if (res.ok && res.state) {
      setState(res.state);
      return { ok: true, action: res.action, state: res.state };
    }

    setState(rollbackRef.current);
    const errMsg =
      res.status === 401 || /unauth|login|회원|로그인/i.test(String(res.error || ""))
        ? VLUE_MEMBERSHIP_REQUIRED_MSG
        : res.error || "팔로우 처리에 실패했습니다.";
    onErrorRef.current?.(errMsg);
    return { ok: false, error: errMsg };
  }, [targetUserId, busy, state, applyOptimistic]);

  const label = state?.label || followButtonLabel(state?.relation || "none");
  const isActive = isFollowActiveState(state?.relation || "none");

  return {
    state,
    label,
    isActive,
    isMutual: Boolean(state?.isMutual),
    loading,
    busy,
    reload,
    toggle
  };
}
