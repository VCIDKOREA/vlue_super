import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, UserPlus } from "lucide-react";
import { buildFriendShowcaseEntries } from "../lib/friendShowcaseEntries.js";
import {
  FRIEND_SHOWCASE_ACTIVITY_EVENT,
  countUnreadFriendShowcases,
  isFriendShowcaseUnread,
  markFriendShowcaseSeen
} from "../lib/friendShowcaseActivity.js";
import { resolveVlueShowcaseByPhone } from "../lib/resolveVlueShowcaseByPhone.js";
import { VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import TentShowcaseOverlay from "./showcase/TentShowcaseOverlay.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES } from "../lib/showcase/tentShowcaseTypes.js";
import "./friend-showcase-list.css";
import "../styles/tent-showcase.css";

/** @typedef {'collapsed' | 'mid' | 'full'} SheetLevel */

const COLLAPSED_BAR_H = 52;

function FriendAvatar({ name, avatarUrl, unread }) {
  return (
    <span className={`friend-showcase-list__avatar-wrap${unread ? " has-update" : ""}`}>
      {avatarUrl ? (
        <img className="friend-showcase-list__avatar" src={avatarUrl} alt="" />
      ) : (
        <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial" aria-hidden>
          {String(name || "?").trim().slice(0, 1) || "?"}
        </span>
      )}
      {unread ? <span className="friend-showcase-list__blue-dot" aria-label="업데이트됨" /> : null}
    </span>
  );
}

function filterEntries(entries, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    const hay = [e.name, e.subtitle, e.org, e.title, e.phoneDisplay, e.phone].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

/** 실제 보이는 하단 탭 높이 (빈 footer 래퍼가 아닌 pulse-root) */
function measureNavHeightPx() {
  const nav =
    document.querySelector("[data-vlue-bottom-nav]") ||
    document.querySelector(".bottom-nav-pulse-root");
  if (nav) {
    const h = Math.round(nav.getBoundingClientRect().height);
    if (h > 0) return h;
  }
  try {
    const el = document.getElementById("app-body") || document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue("--vlue-bottom-nav-offset").trim();
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  } catch {
    /* ignore */
  }
  return 48;
}

function measureSheetTops() {
  const search = document.querySelector('[data-home-anchor="search"]');
  const showcase = document.querySelector('[data-home-anchor="showcase"]');
  const searchBottom = search?.getBoundingClientRect().bottom;
  const showcaseBottom = showcase?.getBoundingClientRect().bottom;
  const nav = measureNavHeightPx();
  const vh = window.innerHeight;
  const fullTop = Math.max(48, Math.round(searchBottom || 56));
  let midTop = Math.round(showcaseBottom || vh * 0.42);
  midTop = Math.max(fullTop + 24, Math.min(midTop, vh - nav - 120));
  return { fullTop, midTop, nav };
}

export default function FriendShowcaseList({
  catalogFriends = [],
  contactMatchData = null,
  onOpenFriendSearch,
  variant = "card",
  className = ""
}) {
  const isHome = variant === "home";
  const entries = useMemo(
    () => buildFriendShowcaseEntries({ catalogFriends, contactMatchData }),
    [catalogFriends, contactMatchData]
  );
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** @type {[SheetLevel, Function]} */
  const [sheetLevel, setSheetLevel] = useState("collapsed");
  const [sheetTopPx, setSheetTopPx] = useState(null);
  const [navBottomPx, setNavBottomPx] = useState(() => (typeof window !== "undefined" ? measureNavHeightPx() : 56));
  const [activityTick, setActivityTick] = useState(0);
  const dragRef = useRef({ startY: 0, startTop: 0, dragging: false });
  const anchorsRef = useRef({ fullTop: 56, midTop: 320, nav: 56 });

  useEffect(() => {
    const onActivity = () => setActivityTick((n) => n + 1);
    window.addEventListener(FRIEND_SHOWCASE_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(FRIEND_SHOWCASE_ACTIVITY_EVENT, onActivity);
  }, []);

  const refreshAnchors = useCallback(() => {
    const a = measureSheetTops();
    anchorsRef.current = a;
    setNavBottomPx(a.nav);
    document.documentElement.style.setProperty("--vlue-bottom-nav-offset", `${a.nav}px`);
    return a;
  }, []);

  useEffect(() => {
    if (!isHome) return undefined;
    refreshAnchors();
    const onResize = () => {
      const a = refreshAnchors();
      setSheetTopPx((prev) => {
        if (sheetLevel === "mid") return a.midTop;
        if (sheetLevel === "full") return a.fullTop;
        return prev;
      });
    };
    window.addEventListener("resize", onResize);
    const t = window.setInterval(() => {
      const h = measureNavHeightPx();
      if (h !== anchorsRef.current.nav) refreshAnchors();
    }, 800);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(t);
    };
  }, [isHome, refreshAnchors, sheetLevel]);

  useEffect(() => {
    if (!isHome) return;
    document.documentElement.style.setProperty(
      "--friend-sheet-collapsed-h",
      sheetLevel === "collapsed" ? `${COLLAPSED_BAR_H}px` : "0px"
    );
  }, [isHome, sheetLevel]);

  const unreadCount = useMemo(() => {
    void activityTick;
    return countUnreadFriendShowcases(entries);
  }, [entries, activityTick]);

  const visibleEntries = useMemo(() => filterEntries(entries, searchQuery), [entries, searchQuery]);
  const sheetExpanded = isHome && sheetLevel !== "collapsed";

  const goCollapsed = useCallback(() => {
    setSheetLevel("collapsed");
    setSheetTopPx(null);
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const goMid = useCallback(() => {
    const a = refreshAnchors();
    setSheetLevel("mid");
    setSheetTopPx(a.midTop);
  }, [refreshAnchors]);

  const goFull = useCallback(() => {
    const a = refreshAnchors();
    setSheetLevel("full");
    setSheetTopPx(a.fullTop);
  }, [refreshAnchors]);

  const onLiftClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (sheetLevel === "collapsed") goMid();
      else goCollapsed();
    },
    [sheetLevel, goMid, goCollapsed]
  );

  const onSearchClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (sheetLevel === "collapsed") goMid();
      setSearchOpen((open) => {
        if (open) setSearchQuery("");
        return !open;
      });
    },
    [sheetLevel, goMid]
  );

  /* 드래그는 핸들만 — 버튼 탭과 충돌 없음 */
  const onHandlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const a = refreshAnchors();
      const currentTop =
        sheetLevel === "collapsed"
          ? window.innerHeight - a.nav - COLLAPSED_BAR_H
          : sheetTopPx ?? (sheetLevel === "full" ? a.fullTop : a.midTop);
      dragRef.current = { startY: e.clientY, startTop: currentTop, dragging: true };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [refreshAnchors, sheetLevel, sheetTopPx]
  );

  const onHandlePointerMove = useCallback(
    (e) => {
      if (!dragRef.current.dragging) return;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dy) < 4) return;
      const a = anchorsRef.current;
      const minTop = a.fullTop;
      const maxTop = window.innerHeight - a.nav - COLLAPSED_BAR_H;
      const next = Math.max(minTop, Math.min(maxTop, dragRef.current.startTop + dy));
      setSheetTopPx(next);
      if (sheetLevel === "collapsed") setSheetLevel("mid");
    },
    [sheetLevel]
  );

  const onHandlePointerUp = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const a = refreshAnchors();
    const top = sheetTopPx ?? a.midTop;
    const collapsedTop = window.innerHeight - a.nav - COLLAPSED_BAR_H;
    const dFull = Math.abs(top - a.fullTop);
    const dMid = Math.abs(top - a.midTop);
    const dCol = Math.abs(top - collapsedTop);
    const nearest = Math.min(dFull, dMid, dCol);
    if (nearest === dFull) goFull();
    else if (nearest === dMid) goMid();
    else goCollapsed();
  }, [refreshAnchors, sheetTopPx, goFull, goMid, goCollapsed]);

  const openPreview = async (friend) => {
    setSelected(friend);
    setPreviewCard(null);
    markFriendShowcaseSeen(friend.id, friend.updatedAt || Date.now());
    setActivityTick((n) => n + 1);
    if (!friend.phone) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const payload = await resolveVlueShowcaseByPhone(friend.phone);
      const tier = payload.card?.membershipTier || friend.membershipTier || "free";
      setPreviewCard({
        ...payload.card,
        name: payload.card?.name || friend.name,
        organization: payload.card?.organization || friend.org,
        title: payload.card?.title || friend.title,
        phone: payload.phone || friend.phoneDisplay || friend.phone,
        membershipTier: tier,
        photoUrl: payload.card?.photoUrl || friend.avatarUrl || "",
        avatarUrl: payload.card?.avatarUrl || friend.avatarUrl || "",
        showcaseStyle: payload.card?.showcaseStyle || createDefaultShowcaseStyle()
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setSelected(null);
    setPreviewCard(null);
  };

  const previewPaid = previewCard ? isPaidLetteringTier(previewCard.membershipTier) : false;

  const sheetActions = (
    <div className="friend-showcase-list__actions friend-showcase-list__sheet-actions">
      <button type="button" className={`friend-showcase-list__icon-btn${searchOpen ? " friend-showcase-list__icon-btn--active" : ""}`} onClick={onSearchClick} aria-label="친구 검색" aria-pressed={searchOpen}>
        <Search size={20} strokeWidth={2.2} aria-hidden />
      </button>
      {onOpenFriendSearch ? (
        <button
          type="button"
          className="friend-showcase-list__icon-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenFriendSearch();
          }}
          aria-label="친구 추가"
        >
          <UserPlus size={20} strokeWidth={2.2} aria-hidden />
        </button>
      ) : null}
    </div>
  );

  const listBody = (
    <>
      {searchOpen ? (
        <div className="friend-showcase-list__search">
          <input
            type="search"
            className="friend-showcase-list__search-input"
            placeholder="이름·직장·전화번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      ) : null}
      <div className="friend-showcase-list__scroll">
        {visibleEntries.length === 0 ? (
          <div className="friend-showcase-list__empty">
            <p className="friend-showcase-list__empty-title">
              {searchQuery.trim() ? "검색 결과가 없습니다" : "등록된 친구가 없습니다"}
            </p>
            <p className="friend-showcase-list__empty-desc">
              {searchQuery.trim()
                ? "다른 검색어로 다시 찾아보세요."
                : "친구를 등록하면 블루 쇼케이스를 바로 볼 수 있습니다."}
            </p>
            {!searchQuery.trim() && onOpenFriendSearch ? (
              <button type="button" className="friend-showcase-list__empty-btn" onClick={onOpenFriendSearch}>
                친구 찾기
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="friend-showcase-list__rows">
            {visibleEntries.map((friend) => {
              const unread = isFriendShowcaseUnread(friend);
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    className={`friend-showcase-list__row${selected?.id === friend.id ? " friend-showcase-list__row--active" : ""}${unread ? " friend-showcase-list__row--unread" : ""}`}
                    onClick={() => openPreview(friend)}
                  >
                    <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} unread={unread} />
                    <div className="friend-showcase-list__meta">
                      <p className="friend-showcase-list__name">
                        {friend.name}
                        {unread ? <span className="friend-showcase-list__update-label">업데이트</span> : null}
                      </p>
                      <p className="friend-showcase-list__subtitle">{friend.subtitle}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  /* bottom:0 으로 화면 바닥에 붙이고, 탭 높이는 padding으로만 비움 → 틈(회색 띠) 제거 */
  const panelStyle = isHome
    ? sheetExpanded && sheetTopPx != null
      ? { top: `${sheetTopPx}px`, bottom: 0, paddingBottom: `${navBottomPx}px` }
      : { bottom: 0, paddingBottom: `${navBottomPx}px` }
    : undefined;

  return (
    <>
      <section
        className={`friend-showcase-list${isHome ? " friend-showcase-list--home friend-showcase-list--sheet" : ""} ${isHome ? ` is-${sheetLevel}` : ""} ${className}`.trim()}
        aria-label="친구 쇼케이스"
      >
        {isHome ? (
          <>
            {sheetExpanded ? (
              <button type="button" className="friend-showcase-list__sheet-backdrop" aria-label="친구 쇼케이스 닫기" onClick={goCollapsed} />
            ) : null}
            <div className="friend-showcase-list__sheet-panel" style={panelStyle} data-level={sheetLevel}>
              <div className="friend-showcase-list__sheet-toggle">
                <button
                  type="button"
                  className="friend-showcase-list__sheet-handle-hit"
                  aria-label="시트 드래그"
                  onPointerDown={onHandlePointerDown}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  onPointerCancel={onHandlePointerUp}
                >
                  <span className="friend-showcase-list__sheet-handle" aria-hidden />
                </button>
                <button type="button" className="friend-showcase-list__sheet-title-btn" onClick={onLiftClick} aria-expanded={sheetExpanded}>
                  <span className="friend-showcase-list__sheet-title">
                    친구 쇼케이스
                    <span className="friend-showcase-list__count">{entries.length}</span>
                    {unreadCount > 0 ? (
                      <span className="friend-showcase-list__header-dot" title="업데이트됨" aria-label={`${unreadCount}명 업데이트`} />
                    ) : null}
                  </span>
                  <span className="friend-showcase-list__sheet-hint">
                    {sheetExpanded ? "내리기" : "올리기"}
                    {sheetExpanded ? <ChevronDown size={15} aria-hidden /> : <ChevronUp size={15} aria-hidden />}
                  </span>
                </button>
                {sheetActions}
              </div>
              {sheetExpanded ? <div className="friend-showcase-list__sheet-body">{listBody}</div> : null}
            </div>
          </>
        ) : (
          <>
            <header className="friend-showcase-list__header">
              <div className="friend-showcase-list__title-row">
                <h2 className="friend-showcase-list__title">친구 쇼케이스</h2>
                <span className="friend-showcase-list__count">{entries.length}</span>
                {unreadCount > 0 ? (
                  <span className="friend-showcase-list__header-dot" title="업데이트됨" aria-label={`${unreadCount}명 업데이트`} />
                ) : null}
              </div>
              {sheetActions}
            </header>
            {listBody}
          </>
        )}
      </section>

      <AppFullScreenView
        open={Boolean(selected)}
        onClose={closePreview}
        title={selected ? `${selected.name}님의 ${VLUE_SHOWCASE.nameKo}` : ""}
        subtitle="친구 쇼케이스"
        isDarkMode
        coverBottomNav
        hideHeader
        showFloatingClose={false}
        className="bg-[#0B101B]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {previewLoading ? (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-400">불러오는 중…</p>
          ) : previewCard ? (
            <TentShowcaseOverlay
              previewMode
              forceInteractive
              callState={CALL_STATES.CONNECTED}
              verified
              membershipTier={previewPaid ? "paid" : "free"}
              peerPhone={previewCard.phone || selected?.phoneDisplay}
              displayName={previewCard.name || selected?.name}
              organization={previewCard.organization || ""}
              card={previewCard}
              showcaseStyle={previewCard.showcaseStyle || createDefaultShowcaseStyle()}
              onClose={closePreview}
              className="tent-showcase--fill"
            />
          ) : (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-400">
              전화번호가 등록되지 않아 미리보기를 표시할 수 없습니다.
            </p>
          )}
        </div>
      </AppFullScreenView>
    </>
  );
}
