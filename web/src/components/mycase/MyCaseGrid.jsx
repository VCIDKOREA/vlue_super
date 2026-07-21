/**
 * 마이케이스 — 인스타그램 프로필형 레이아웃 (기본 라이트모드)
 * VLUE: 메인 송출 슬롯 = 하이라이트 / 핀 배지, 아카이브 = 3열 그리드
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Grid3X3, MoreHorizontal, Pin } from "lucide-react";
import {
  archiveShowcaseToMycase,
  deleteMycase,
  fetchMycaseDetail,
  fetchMycaseLiveBroadcast,
  fetchMyMycaseList,
  fetchUserMycase,
  formatCooldownHint,
  setMycaseBroadcast
} from "../../lib/mycaseApi.js";
import { fetchFollowCounts } from "../../lib/followApi.js";
import { readShowcaseStyle, SHOWCASE_OPEN_SETTINGS_EVENT, SHOWCASE_STYLE_CHANGED_EVENT } from "../../lib/showcase/showcaseStyleStorage.js";
import { applyMycaseItemToLiveBroadcast } from "../../lib/showcase/syncMycaseLiveBroadcast.js";
import {
  extractShowcaseArchiveTitle,
  extractShowcaseCoverUrl
} from "../../lib/showcase/showcaseCover.js";
import { readAvatar } from "../../lib/vlueAvatar.js";
import { readDigitalCardActive } from "../../lib/bizcardAccountSync.js";
import FollowActionButton from "../follow/FollowActionButton.jsx";
import "./my-case-grid.css";

function readSelfProfile() {
  let handle = "";
  let name = "";
  try {
    handle = String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
    name = String(localStorage.getItem("vlue_legal_name") || "").trim();
  } catch {
    /* ignore */
  }
  const avatarUrl = readAvatar("feed") || readAvatar("primary") || readAvatar("chat") || "";
  let userId = "";
  try {
    userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    /* ignore */
  }
  return { handle: handle || "mycase", name: name || handle || "나", avatarUrl, userId };
}

function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return String(v);
}

/**
 * @param {{
 *   mode?: 'mine'|'user',
 *   ownerUserId?: string|null,
 *   onBack?: () => void,
 *   onOpenDetail?: (item: object, detail: object|null) => void,
 *   onOpenDigitalCard?: () => void,
 *   onToast?: (msg: string) => void,
 *   onBroadcastChanged?: (item: object, policy: object|null) => void,
 *   className?: string
 * }} props
 */
export default function MyCaseGrid({
  mode = "mine",
  ownerUserId = null,
  onBack,
  onOpenDetail,
  onOpenDigitalCard,
  onToast,
  onBroadcastChanged,
  className = ""
}) {
  const isMine = mode === "mine";
  const self = useMemo(() => readSelfProfile(), []);
  const hasDigitalCard = isMine && readDigitalCardActive();

  const [items, setItems] = useState([]);
  const [mainBroadcast, setMainBroadcast] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [accessDenied, setAccessDenied] = useState(false);
  const [denyReason, setDenyReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const sentinelRef = useRef(null);
  const toastRef = useRef(onToast);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    toastRef.current = onToast;
  }, [onToast]);

  const toast = useCallback((msg) => {
    const fn = toastRef.current;
    if (fn) fn(msg);
    else if (typeof window !== "undefined") window.alert?.(msg);
  }, []);

  const displayHandle = isMine
    ? self.handle
    : String(remoteProfile?.profile?.publicHandle || "").replace(/^@/, "") || "member";
  const displayName = isMine
    ? self.name
    : remoteProfile?.profile?.displayName || displayHandle;
  const avatarUrl = isMine ? self.avatarUrl : "";

  const loadFirst = useCallback(async () => {
    const showFullLoading = !initialLoadDoneRef.current;
    if (showFullLoading) setLoading(true);
    try {
      if (isMine) {
        const data = await fetchMyMycaseList({ limit: 30 });
        if (!data.ok) {
          toast(data.message || "마이케이스를 불러오지 못했습니다.");
          if (showFullLoading) setItems([]);
          return;
        }
        setItems(data.items || []);
        setNextCursor(data.nextCursor || null);
        setPolicy(data.policy || null);
        setAccessDenied(false);
        setMainBroadcast((data.items || []).filter((x) => x.isMainBroadcast));
        if (self.userId) {
          const c = await fetchFollowCounts(self.userId);
          if (c.ok && c.counts) setFollowCounts(c.counts);
        }
        const live = await fetchMycaseLiveBroadcast();
        if (live.ok && live.item) applyMycaseItemToLiveBroadcast(live.item);
      } else {
        if (!ownerUserId) return;
        const data = await fetchUserMycase(ownerUserId, { limit: 30 });
        if (!data.ok) {
          toast(data.message || "케이스함을 불러오지 못했습니다.");
          return;
        }
        setRemoteProfile(data.profile || null);
        setAccessDenied(Boolean(data.accessDenied));
        setDenyReason(data.reason || null);
        setMainBroadcast(data.mainBroadcast || []);
        setItems(data.items || []);
        setNextCursor(data.nextCursor || null);
        const counts = data.profile?.follow?.counts;
        if (counts) setFollowCounts(counts);
        else {
          const c = await fetchFollowCounts(ownerUserId);
          if (c.ok && c.counts) setFollowCounts(c.counts);
        }
      }
      initialLoadDoneRef.current = true;
    } finally {
      if (showFullLoading) setLoading(false);
    }
  }, [isMine, ownerUserId, self.userId, toast]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  useEffect(() => {
    if (!isMine) return undefined;
    const onChanged = () => {
      window.setTimeout(() => {
        void loadFirst();
      }, 400);
    };
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onChanged);
  }, [isMine, loadFirst]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      if (isMine) {
        const data = await fetchMyMycaseList({ limit: 30, cursor: nextCursor });
        if (!data.ok) return;
        setItems((prev) => [...prev, ...(data.items || [])]);
        setNextCursor(data.nextCursor || null);
        if (data.policy) setPolicy(data.policy);
      } else if (ownerUserId) {
        const data = await fetchUserMycase(ownerUserId, { limit: 30, cursor: nextCursor });
        if (!data.ok || data.accessDenied) return;
        setItems((prev) => [...prev, ...(data.items || [])]);
        setNextCursor(data.nextCursor || null);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [isMine, ownerUserId, nextCursor, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "160px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, nextCursor]);

  const openItem = async (item) => {
    if (manageMode && isMine) return;
    if (onOpenDetail) {
      const detail = await fetchMycaseDetail(item.id);
      onOpenDetail(item, detail.ok ? detail : null);
    }
  };

  const toggleBroadcast = async (item, e) => {
    e?.stopPropagation?.();
    if (!isMine) return;
    const next = !item.isMainBroadcast;
    setBusyId(item.id);
    try {
      const res = await setMycaseBroadcast(item.id, next);
      if (!res.ok) {
        toast(res.message || "송출 설정을 변경할 수 없습니다.");
        return;
      }
      if (res.policy) setPolicy(res.policy);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...res.item } : x)));
      setMainBroadcast((prev) => {
        if (next) return [...prev.filter((x) => x.id !== item.id), res.item];
        return prev.filter((x) => x.id !== item.id);
      });
      if (next) {
        const applied = applyMycaseItemToLiveBroadcast(res.item);
        if (!applied) {
          toast("송출은 켜졌지만 쇼케이스 내용이 비어 있습니다. 블루 쇼케이스에서 다시 저장해 주세요.");
        } else {
          toast("메인 송출 ON · 통화 미리보기에 반영됨");
        }
      } else {
        toast("메인 송출 OFF");
      }
      onBroadcastChanged?.(res.item, res.policy || null);
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item, e) => {
    e?.stopPropagation?.();
    if (!isMine) return;
    if (!window.confirm(`「${item.title}」을(를) 삭제할까요?`)) return;
    setBusyId(item.id);
    try {
      const res = await deleteMycase(item.id);
      if (!res.ok) {
        toast(res.message || "삭제에 실패했습니다.");
        return;
      }
      if (res.policy) setPolicy(res.policy);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      setMainBroadcast((prev) => prev.filter((x) => x.id !== item.id));
      toast("삭제되었습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const openShowcaseSettings = () => {
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
  };

  /** 새로 만들기 / 쇼케이스 저장 → 블루 쇼케이스 설정(3번) */
  const goCreateOrEditShowcase = () => {
    if (!isMine) return;
    openShowcaseSettings();
  };

  /** 현재 로컬 쇼케이스를 바로 아카이브에 남김 (설정 적용과 동일) */
  const saveCurrentToArchive = async () => {
    if (!isMine) return;
    const style = readShowcaseStyle();
    const cover = extractShowcaseCoverUrl(style);
    const title = extractShowcaseArchiveTitle(style);
    if (!cover && !(style?.pages?.length > 0)) {
      toast("먼저 블루 쇼케이스에서 사진을 추가해 주세요.");
      openShowcaseSettings();
      return;
    }
    setBusyId("archive");
    try {
      const res = await archiveShowcaseToMycase({
        title,
        thumbnailUrl: cover || null,
        payloadJson: { style, source: "mycase_save" },
        isPublic: style?.privacyMode !== "friend_only"
      });
      if (!res.ok) {
        toast(res.message || "저장에 실패했습니다.");
        return;
      }
      toast("마이케이스에 저장되었습니다.");
      await loadFirst();
    } finally {
      setBusyId(null);
    }
  };

  const postsCount = items.length;
  const policyLine = isMine && policy ? formatCooldownHint(policy) : "";
  const highlightItems = mainBroadcast;

  return (
    <section className={`ig-mycase ${className}`.trim()} aria-label="마이케이스">
      <header className="ig-mycase__topbar">
        <button type="button" className="ig-mycase__icon-btn" onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        <h1 className="ig-mycase__username">{displayHandle}</h1>
        {isMine ? (
          <button
            type="button"
            className={`ig-mycase__icon-btn${manageMode ? " is-active" : ""}`}
            aria-label={manageMode ? "송출 관리 종료" : "송출 관리"}
            aria-pressed={manageMode}
            title="송출 관리"
            onClick={() => setManageMode((v) => !v)}
          >
            <MoreHorizontal size={22} strokeWidth={2} />
          </button>
        ) : (
          <span className="ig-mycase__icon-btn ig-mycase__icon-btn--spacer" aria-hidden />
        )}
      </header>

      <div className="ig-mycase__profile">
        <div className="ig-mycase__profile-row">
          <div className="ig-mycase__avatar-wrap">
            {avatarUrl ? (
              <img className="ig-mycase__avatar" src={avatarUrl} alt="" />
            ) : (
              <span className="ig-mycase__avatar ig-mycase__avatar--ph">
                {(displayName || "?").slice(0, 1)}
              </span>
            )}
          </div>
          <div className="ig-mycase__stats" role="group" aria-label="통계">
            <div className="ig-mycase__stat">
              <b>{formatCount(postsCount)}</b>
              <span>게시물</span>
            </div>
            <div className="ig-mycase__stat">
              <b>{formatCount(followCounts.followers)}</b>
              <span>팔로워</span>
            </div>
            <div className="ig-mycase__stat">
              <b>{formatCount(followCounts.following)}</b>
              <span>팔로잉</span>
            </div>
          </div>
        </div>

        <div className="ig-mycase__bio">
          <p className="ig-mycase__name">{displayName}</p>
          {isMine ? (
            <p className="ig-mycase__bio-text">
              {policy
                ? `${policy.tier === "pro" ? "Pro" : "Free"} · 메인 송출 ${policy.usedMainSlots}/${policy.maxMainSlots}`
                : "쇼케이스 아카이브"}
              {policyLine && !policy?.canChangeBroadcast ? ` · ${policyLine.replace(/^메인 송출 \d+\/\d+ · /, "")}` : ""}
            </p>
          ) : remoteProfile?.profile?.companyName ? (
            <p className="ig-mycase__bio-text">{remoteProfile.profile.companyName}</p>
          ) : (
            <p className="ig-mycase__bio-text">공개 케이스함</p>
          )}
        </div>

        <div className="ig-mycase__actions">
          {isMine ? (
            <>
              <button
                type="button"
                className="ig-mycase__btn ig-mycase__btn--secondary"
                onClick={goCreateOrEditShowcase}
              >
                쇼케이스 만들기
              </button>
              <button
                type="button"
                className="ig-mycase__btn ig-mycase__btn--secondary"
                disabled={busyId === "archive"}
                onClick={saveCurrentToArchive}
              >
                아카이브 저장
              </button>
              <button
                type="button"
                className={`ig-mycase__btn ig-mycase__btn--secondary${manageMode ? " is-active" : ""}`}
                onClick={() => setManageMode((v) => !v)}
              >
                {manageMode ? "완료" : "송출 관리"}
              </button>
            </>
          ) : (
            <>
              <div className="ig-mycase__follow-slot">
                <FollowActionButton targetUserId={ownerUserId} className="ig-mycase__follow-btn" />
              </div>
              <button type="button" className="ig-mycase__btn ig-mycase__btn--secondary" disabled>
                메시지
              </button>
            </>
          )}
        </div>
        {hasDigitalCard ? (
          <button
            type="button"
            className="ig-mycase__btn ig-mycase__btn--card"
            onClick={() => onOpenDigitalCard?.()}
          >
            디지털인증명함
          </button>
        ) : null}
      </div>

      {!accessDenied ? (
        <div className="ig-mycase__highlights" aria-label="메인 송출 하이라이트">
          {isMine ? (
            <button
              type="button"
              className="ig-mycase__hl ig-mycase__hl--new"
              onClick={goCreateOrEditShowcase}
            >
              <span className="ig-mycase__hl-ring ig-mycase__hl-ring--dashed">
                <span className="ig-mycase__hl-plus">+</span>
              </span>
              <span className="ig-mycase__hl-label">새로 만들기</span>
            </button>
          ) : null}
          {highlightItems.map((item) => (
            <button
              key={`hl-${item.id}`}
              type="button"
              className="ig-mycase__hl"
              onClick={() => openItem(item)}
            >
              <span className="ig-mycase__hl-ring">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" />
                ) : (
                  <span className="ig-mycase__hl-ph" />
                )}
              </span>
              <span className="ig-mycase__hl-label">{item.title || "송출"}</span>
            </button>
          ))}
          {!isMine && highlightItems.length === 0 ? (
            <p className="ig-mycase__hl-empty">메인 송출 중인 케이스가 없습니다</p>
          ) : null}
        </div>
      ) : null}

      <div className="ig-mycase__tabs" role="tablist">
        <button type="button" className="ig-mycase__tab is-active" role="tab" aria-selected>
          <Grid3X3 size={22} strokeWidth={2} aria-hidden />
          <span className="sr-only">그리드</span>
        </button>
      </div>

      {accessDenied ? (
        <div className="ig-mycase__locked">
          <p className="ig-mycase__locked-title">비공개 계정</p>
          <p className="ig-mycase__locked-desc">
            {denyReason === "private_followers_only"
              ? "팔로워만 이 회원의 케이스함을 볼 수 있습니다."
              : "열람 권한이 없습니다."}
          </p>
        </div>
      ) : loading ? (
        <p className="ig-mycase__empty">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="ig-mycase__empty-block">
          <p className="ig-mycase__empty-title">
            {isMine ? "아직 게시물이 없습니다" : "공개된 케이스가 없습니다"}
          </p>
          {isMine ? (
            <p className="ig-mycase__empty-desc">
              「새로 만들기」로 블루 쇼케이스를 편집한 뒤 「적용하기」하면 여기에 쌓입니다.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="ig-mycase__grid">
          {items.map((item) => (
            <li key={item.id} className="ig-mycase__cell">
              <button
                type="button"
                className="ig-mycase__thumb"
                onClick={() => {
                  if (!manageMode) openItem(item);
                }}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const ph = e.currentTarget.nextElementSibling;
                      if (ph) ph.classList.add("is-visible");
                    }}
                  />
                ) : null}
                <span
                  className={`ig-mycase__thumb-ph${item.thumbnailUrl ? "" : " is-visible"}`}
                  aria-hidden
                />
                {item.isMainBroadcast ? (
                  <span className="ig-mycase__pin" title="메인 송출">
                    <Pin size={14} strokeWidth={2.5} fill="currentColor" />
                  </span>
                ) : null}
              </button>
              {manageMode && isMine ? (
                <div className="ig-mycase__manage">
                  <button
                    type="button"
                    className={`ig-mycase__manage-btn${item.isMainBroadcast ? " is-on" : ""}`}
                    disabled={busyId === item.id}
                    onClick={(e) => toggleBroadcast(item, e)}
                  >
                    {item.isMainBroadcast ? "메인 송출 끄기" : "메인 송출 켜기"}
                  </button>
                  <button
                    type="button"
                    className="ig-mycase__manage-del"
                    disabled={busyId === item.id}
                    onClick={(e) => removeItem(item, e)}
                  >
                    삭제
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && !accessDenied ? (
        <div ref={sentinelRef} className="ig-mycase__sentinel">
          {loadingMore ? "더 불러오는 중…" : ""}
        </div>
      ) : null}
    </section>
  );
}
