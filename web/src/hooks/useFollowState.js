import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFollowState,
  followButtonLabel,
  isFollowActiveState,
  readFollowStateCache,
  toggleFollow,
  writeFollowStateCache
} from "../lib/followApi.js";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../lib/vlueGuestAuthGate.js";

/**
 * 팔로우 상태 조회 + 낙관적 토글
 * @param {string|null|undefined} targetUserId
 * @param {{ enabled?: boolean, initialState?: object|null, onError?: (msg: string) => void }} [opts]
 */
export function useFollowState(targetUserId, opts = {}) {
  const enabled = opts.enabled !== false && Boolean(targetUserId);
  const seed =
    (opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null) ||
    (enabled ? readFollowStateCache(targetUserId) : null);
  const [state, setState] = useState(seed);
  const [loading, setLoading] = useState(Boolean(enabled) && !seed);
  const [busy, setBusy] = useState(false);
  const rollbackRef = useRef(null);
  const pendingRef = useRef(0);
  const inflightRef = useRef(false);
  const dirtyRef = useRef(false);
  const targetRef = useRef(targetUserId);
  targetRef.current = targetUserId;
  const onErrorRef = useRef(opts.onError);
  onErrorRef.current = opts.onError;

  const reload = useCallback(async () => {
    if (!targetUserId) {
      setState(null);
      setLoading(false);
      return;
    }
    const res = await fetchFollowState(targetUserId);
    if (dirtyRef.current || inflightRef.current || pendingRef.current > 0) {
      setLoading(false);
      return;
    }
    if (res.ok) {
      setState(res.state);
      if (res.state) writeFollowStateCache(targetUserId, res.state);
    } else onErrorRef.current?.(res.error || "상태를 불러오지 못했습니다.");
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    dirtyRef.current = false;
    pendingRef.current = 0;
    inflightRef.current = false;
    if (!enabled) {
      setState(null);
      setLoading(false);
      return;
    }
    const cached = readFollowStateCache(targetUserId);
    const nextSeed =
      (opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null) ||
      cached;
    if (nextSeed) {
      setState(nextSeed);
      setLoading(false);
    } else {
      setLoading(true);
    }
    reload();
    // initialState는 마운트/타겟 변경 시만 시드로 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, targetUserId]);

  const optimisticNextRelation = useCallback((current) => {
    if (!current) return "following";
    if (current.relation === "mutual") return "followed_by";
    if (current.relation === "following") return "none";
    if (current.relation === "pending_out") return "none";
    /* 상대가 이미 나를 팔로우 중이면 탭 즉시 맞팔로우 */
    if (current.relation === "followed_by" || current.isFollowedBy) return "mutual";
    if (current.relation === "pending_in") return "mutual";
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

  const drain = useCallback(async () => {
    if (inflightRef.current) return { ok: true, queued: true };
    inflightRef.current = true;
    setBusy(true);
    let last = { ok: true };
    try {
      while (pendingRef.current > 0) {
        pendingRef.current -= 1;
        const id = targetRef.current;
        if (!id) break;
        last = await toggleFollow(id);
        if (!last.ok) break;
      }
    } finally {
      inflightRef.current = false;
      setBusy(false);
    }

    if (pendingRef.current > 0 && last.ok) {
      return drain();
    }

    dirtyRef.current = false;
    if (last.ok && last.state) {
      setState(last.state);
      writeFollowStateCache(targetRef.current, last.state);
      return last;
    }
    if (!last.ok) {
      pendingRef.current = 0;
      setState(rollbackRef.current);
      const errMsg =
        last.status === 401 || /unauth|login|회원|로그인/i.test(String(last.error || ""))
          ? VLUE_MEMBERSHIP_REQUIRED_MSG
          : last.error || "팔로우 처리에 실패했습니다.";
      onErrorRef.current?.(errMsg);
      return { ...last, error: errMsg };
    }
    return last;
  }, []);

  const toggle = useCallback(async () => {
    if (!targetUserId) return { ok: false };
    if (!hasVlueLoggedInSession()) {
      onErrorRef.current?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return { ok: false, error: VLUE_MEMBERSHIP_REQUIRED_MSG, needsAuth: true };
    }
    if (!dirtyRef.current) rollbackRef.current = state;
    dirtyRef.current = true;
    const nextState = applyOptimistic(state);
    setState(nextState);
    if (nextState) writeFollowStateCache(targetUserId, nextState);
    pendingRef.current += 1;
    const action =
      nextState?.isPendingOut ? "requested" : nextState?.isFollowing || nextState?.isMutual ? "followed" : "unfollowed";
    void drain();
    return { ok: true, action, state: nextState, optimistic: true };
  }, [targetUserId, state, applyOptimistic, drain]);

  const relation = state?.relation || null;
  const label = state
    ? state.label || followButtonLabel(relation || "none")
    : loading
      ? "…"
      : followButtonLabel("none");
  const isActive = isFollowActiveState(relation || "none");

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
