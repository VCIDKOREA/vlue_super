import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import {
  FRIEND_SHOWCASE_ACTIVITY_EVENT,
  countUnreadFriendShowcases,
  isFriendShowcaseUnread,
  markFriendShowcaseSeen
} from "../lib/friendShowcaseActivity.js";
import {
  loadFollowShowcaseLists,
  mapHashtagSearchHits
} from "../lib/followShowcaseEntries.js";
import { searchShowcaseByTag } from "../lib/showcase/showcaseTagsApi.js";
import { resolveVlueShowcasePeer } from "../lib/resolveVlueShowcasePeer.js";
import { VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import PeerShowcasePreview from "./showcase/PeerShowcasePreview.jsx";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-eye-logo.svg?url";
import UserCaseArchiveView from "./mycase/UserCaseArchiveView.jsx";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../lib/showcase/closeShowcaseOverlays.js";
import "./friend-showcase-list.css";
import "../styles/tent-showcase.css";

/** @typedef {'collapsed' | 'mid' | 'full'} SheetLevel */
/** @typedef {'showcase'|'idcard'} PreviewKind */

const COLLAPSED_BAR_H = 52;
const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function filterRows(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((e) => {
    const hay = [e.name, e.subtitle, e.publicHandle, e.phoneDisplay, e.phone, ...(e.tags || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function VlueLogoAvatar({ avatarUrl, unread }) {
  return (
    <span className={`friend-showcase-list__avatar-wrap${unread ? " has-update" : ""}`}>
      {avatarUrl ? (
        <img className="friend-showcase-list__avatar" src={avatarUrl} alt="" />
      ) : (
        <span className="friend-showcase-list__avatar friend-showcase-list__avatar--brand" aria-hidden>
          <img src={VLUE_BRAND_LOGO} alt="" className="friend-showcase-list__avatar-logo" />
        </span>
      )}
      {unread ? <span className="friend-showcase-list__blue-dot" aria-label="업데이트됨" /> : null}
    </span>
  );
}

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

/**
 * 인스타형 행 — 로고형 아바타 + 쇼케이스/명함 분리 버튼 + 팔로우
 */
function FollowShowcaseRow({ row, selected, unread, onOpenShowcase, onOpenIdCard, onOpenCaseArchive }) {
  const showCardBtn = Boolean(row.hasDigitalCard);
  const canOpenArchive = Boolean(row.userId && OWNER_UUID_RE.test(String(row.userId)));
  return (
    <li>
      <div
        className={`friend-showcase-list__row friend-showcase-list__row--ig${selected?.id === row.id ? " friend-showcase-list__row--active" : ""}${unread ? " friend-showcase-list__row--unread" : ""}`}
      >
        <button
          type="button"
          className="friend-showcase-list__row-main friend-showcase-list__row-main--profile"
          onClick={() => {
            if (canOpenArchive && onOpenCaseArchive) onOpenCaseArchive(row);
            else onOpenShowcase(row);
          }}
          aria-label={`${row.name} 케이스함 보기`}
        >
          <VlueLogoAvatar avatarUrl={row.avatarUrl} unread={unread} />
          <div className="friend-showcase-list__meta">
            <p className="friend-showcase-list__name">
              {row.name}
              {unread ? <span className="friend-showcase-list__update-label">업데이트</span> : null}
            </p>
            <p className="friend-showcase-list__subtitle">{row.subtitle}</p>
          </div>
        </button>
        <div className="friend-showcase-list__actions-col">
          <div className="friend-showcase-list__product-btns">
            <button
              type="button"
              className="friend-showcase-list__product-btn friend-showcase-list__product-btn--showcase"
              onClick={() => onOpenShowcase(row)}
            >
              쇼케이스
            </button>
            {showCardBtn ? (
              <button
                type="button"
                className="friend-showcase-list__product-btn friend-showcase-list__product-btn--card"
                onClick={() => onOpenIdCard(row)}
              >
                명함
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** @typedef {'trending'|'nearby'|'hashtag'|'following'} FollowTabId */

const FOLLOW_TABS = [
  { id: "trending", label: "인기" },
  { id: "nearby", label: "주변" },
  { id: "hashtag", label: "#태그" },
  { id: "following", label: "팔로잉" }
];

export default function FriendShowcaseList({
  catalogFriends = [],
  contactMatchData = null,
  onOpenFriendSearch,
  variant = "card",
  className = ""
}) {
  const isHome = variant === "home";
  const [following, setFollowing] = useState([]);
  const [trending, setTrending] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [hashtagRows, setHashtagRows] = useState([]);
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [hashtagSearching, setHashtagSearching] = useState(false);
  const [geoGranted, setGeoGranted] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(/** @type {FollowTabId} */ ("trending"));
  const [selected, setSelected] = useState(null);
  const [caseArchiveUser, setCaseArchiveUser] = useState(null);
  const [previewKind, setPreviewKind] = useState(/** @type {PreviewKind} */ ("showcase"));
  const [previewCard, setPreviewCard] = useState(null);
  const [previewSessionKey, setPreviewSessionKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** @type {[SheetLevel, Function]} */
  const [sheetLevel, setSheetLevel] = useState("collapsed");
  const [sheetTopPx, setSheetTopPx] = useState(null);
  const [navBottomPx, setNavBottomPx] = useState(() =>
    typeof window !== "undefined" ? measureNavHeightPx() : 56
  );
  const [activityTick, setActivityTick] = useState(0);
  const dragRef = useRef({ startY: 0, startTop: 0, dragging: false });
  const anchorsRef = useRef({ fullTop: 56, midTop: 320, nav: 56 });
  const geoRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;
    navigator.geolocation.getCurrentPosition(
      () => {
        geoRef.current = true;
        setGeoGranted(true);
      },
      () => {
        geoRef.current = false;
        setGeoGranted(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const reloadLists = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await loadFollowShowcaseLists({
        catalogFriends,
        contactMatchData,
        geoGranted: geoRef.current
      });
      setFollowing(data.following);
      setTrending(data.trending);
      setNearby(data.nearby);
    } finally {
      setListLoading(false);
    }
  }, [catalogFriends, contactMatchData]);

  useEffect(() => {
    reloadLists();
  }, [reloadLists, geoGranted]);

  useEffect(() => {
    const onActivity = () => setActivityTick((n) => n + 1);
    window.addEventListener(FRIEND_SHOWCASE_ACTIVITY_EVENT, onActivity);
    return () => window.removeEventListener(FRIEND_SHOWCASE_ACTIVITY_EVENT, onActivity);
  }, []);

  useEffect(() => {
    const q = hashtagQuery.trim();
    if (!q || q.length < 1) {
      setHashtagRows([]);
      setHashtagSearching(false);
      return undefined;
    }
    let cancelled = false;
    setHashtagSearching(true);
    const timer = window.setTimeout(() => {
      const tag = q.startsWith("#") ? q : `#${q}`;
      searchShowcaseByTag(tag, { mode: "hashtag" }).then((res) => {
        if (cancelled) return;
        setHashtagSearching(false);
        setHashtagRows(res.ok ? mapHashtagSearchHits(res.items || []) : []);
      });
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hashtagQuery]);

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
    return countUnreadFriendShowcases(following);
  }, [following, activityTick]);

  const visibleFollowing = useMemo(() => filterRows(following, searchQuery), [following, searchQuery]);
  const visibleTrending = useMemo(() => filterRows(trending, searchQuery), [trending, searchQuery]);
  const visibleNearby = useMemo(() => filterRows(nearby, searchQuery), [nearby, searchQuery]);
  const visibleHashtag = useMemo(
    () => filterRows(hashtagRows, searchQuery),
    [hashtagRows, searchQuery]
  );

  const activeRows =
    activeTab === "nearby"
      ? visibleNearby
      : activeTab === "hashtag"
        ? visibleHashtag
        : activeTab === "following"
          ? visibleFollowing
          : visibleTrending;

  const activeEmptyText =
    activeTab === "nearby"
      ? geoGranted
        ? "주변에 추천할 쇼케이스가 없습니다"
        : "위치 권한을 허용하면 주변 쇼케이스를 볼 수 있습니다"
      : activeTab === "hashtag"
        ? hashtagQuery.trim()
          ? "해당 해시태그 쇼케이스가 없습니다"
          : "해시태그를 입력해 보세요"
        : activeTab === "following"
          ? "팔로잉 중인 쇼케이스가 없습니다"
          : "지금 급상승 중인 쇼케이스가 없습니다";

  const headerCount = following.length + trending.length + nearby.length + hashtagRows.length;
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

  const openPreview = async (row, kind) => {
    setPreviewSessionKey((k) => k + 1);
    setSelected(row);
    setPreviewKind(kind);
    setPreviewCard(null);
    markFriendShowcaseSeen(row.id, row.updatedAt || Date.now());
    setActivityTick((n) => n + 1);
    const uid = OWNER_UUID_RE.test(String(row.userId || "")) ? String(row.userId).trim() : "";
    const handle = String(row.publicHandle || "").replace(/^@/, "").trim();
    const phone = row.phone || row.phoneDisplay || "";
    if (!uid && !handle && !phone) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const payload = await resolveVlueShowcasePeer({
        userId: uid,
        handle,
        phone,
        displayName: row.name || "",
        membershipTier: row.membershipTier || "free",
        avatarUrl: row.avatarUrl || "",
        forceStyle: false
      });
      const tier = payload.card?.membershipTier || row.membershipTier || "free";
      const peerUid = String(
        payload.card?.userId || (OWNER_UUID_RE.test(String(row.userId || "")) ? row.userId : "")
      ).trim();
      setPreviewCard({
        ...payload.card,
        userId: peerUid,
        ownerUserId: payload.card?.ownerUserId || peerUid,
        name: payload.card?.name || row.name,
        phone: payload.phone || row.phoneDisplay || row.phone || "",
        membershipTier: tier,
        photoUrl: payload.card?.photoUrl || row.avatarUrl || "",
        avatarUrl: payload.card?.avatarUrl || row.avatarUrl || "",
        email: payload.card?.email || "",
        organization: payload.card?.organization || "",
        website: payload.card?.website || "",
        authCycleEndAt: payload.card?.authCycleEndAt || payload.card?.cycleEndAt || null,
        authPaidAt: payload.card?.authPaidAt || null,
        cycleEndAt: payload.card?.authCycleEndAt || payload.card?.cycleEndAt || null,
        showcaseStyle: payload.showcaseStyle || payload.card?.showcaseStyle || createDefaultShowcaseStyle()
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setSelected(null);
    setPreviewCard(null);
    setPreviewKind("showcase");
  };

  useEffect(() => {
    const onCloseOverlays = () => closePreview();
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
  }, []);

  const previewPaid = previewCard ? isPaidLetteringTier(previewCard.membershipTier) : false;

  const sheetActions = (
    <div className="friend-showcase-list__actions friend-showcase-list__sheet-actions">
      <button
        type="button"
        className={`friend-showcase-list__icon-btn${searchOpen ? " friend-showcase-list__icon-btn--active" : ""}`}
        onClick={onSearchClick}
        aria-label="팔로우 검색"
        aria-pressed={searchOpen}
      >
        <Search size={20} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );

  const rowHandlers = {
    onOpenShowcase: (row) => openPreview(row, "showcase"),
    onOpenIdCard: (row) => openPreview(row, "idcard"),
    onOpenCaseArchive: (row) => {
      if (row?.userId && OWNER_UUID_RE.test(String(row.userId))) {
        setCaseArchiveUser({
          userId: row.userId,
          name: row.name || row.publicHandle || "케이스함"
        });
      }
    }
  };

  const listBody = (
    <>
      {searchOpen ? (
        <div className="friend-showcase-list__search">
          <input
            type="search"
            className="friend-showcase-list__search-input"
            placeholder="이름·아이디·전화번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      ) : null}

      <div className="friend-showcase-list__tabs" role="tablist" aria-label="팔로우 쇼케이스 분류">
        {FOLLOW_TABS.map((tab) => {
          const isOn = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isOn}
              className={`friend-showcase-list__tab${isOn ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="friend-showcase-list__scroll" role="tabpanel">
        {listLoading ? (
          <div className="friend-showcase-list__empty">
            <p className="friend-showcase-list__empty-desc">불러오는 중…</p>
          </div>
        ) : (
          <>
            {activeTab === "hashtag" ? (
              <div className="friend-showcase-list__hashtag-box">
                <span className="friend-showcase-list__hashtag-hash" aria-hidden>
                  #
                </span>
                <input
                  type="search"
                  className="friend-showcase-list__hashtag-input"
                  placeholder="카페, VLUE…"
                  value={hashtagQuery.replace(/^#/, "")}
                  onChange={(e) => setHashtagQuery(e.target.value.replace(/^#/, ""))}
                />
              </div>
            ) : null}

            {hashtagSearching && activeTab === "hashtag" ? (
              <p className="friend-showcase-list__section-empty">검색 중…</p>
            ) : activeRows.length === 0 ? (
              <div className="friend-showcase-list__empty">
                <p className="friend-showcase-list__empty-title">{activeEmptyText}</p>
                {activeTab === "following" && onOpenFriendSearch ? (
                  <button type="button" className="friend-showcase-list__empty-btn" onClick={onOpenFriendSearch}>
                    회원 찾기
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="friend-showcase-list__rows">
                {activeRows.map((row) => (
                  <FollowShowcaseRow
                    key={row.id}
                    row={row}
                    selected={selected}
                    unread={activeTab === "following" ? isFriendShowcaseUnread(row) : false}
                    {...rowHandlers}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );

  const panelStyle = isHome
    ? sheetExpanded && sheetTopPx != null
      ? { top: `${sheetTopPx}px`, bottom: 0, paddingBottom: `${navBottomPx}px` }
      : { bottom: 0, paddingBottom: `${navBottomPx}px` }
    : undefined;

  return (
    <>
      <section
        className={`friend-showcase-list friend-showcase-list--light${isHome ? " friend-showcase-list--home friend-showcase-list--sheet" : ""} ${isHome ? ` is-${sheetLevel}` : ""} ${className}`.trim()}
        aria-label="팔로우 쇼케이스"
      >
        {isHome ? (
          <>
            {sheetExpanded ? (
              <button
                type="button"
                className="friend-showcase-list__sheet-backdrop"
                aria-label="팔로우 쇼케이스 닫기"
                onClick={goCollapsed}
              />
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
                <button
                  type="button"
                  className="friend-showcase-list__sheet-title-btn"
                  onClick={onLiftClick}
                  aria-expanded={sheetExpanded}
                >
                  <span className="friend-showcase-list__sheet-title">
                    팔로우 쇼케이스
                    <span className="friend-showcase-list__count">{headerCount}</span>
                    {unreadCount > 0 ? (
                      <span
                        className="friend-showcase-list__header-dot"
                        title="업데이트됨"
                        aria-label={`${unreadCount}명 업데이트`}
                      />
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
                <h2 className="friend-showcase-list__title">팔로우 쇼케이스</h2>
                <span className="friend-showcase-list__count">{headerCount}</span>
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
        title={
          selected
            ? previewKind === "idcard"
              ? `${selected.name} · 디지털 인증명함`
              : `${selected.name}님의 ${VLUE_SHOWCASE.nameKo}`
            : ""
        }
        subtitle={previewKind === "idcard" ? "디지털 인증명함" : "팔로우 쇼케이스"}
        isDarkMode={previewKind !== "idcard"}
        coverBottomNav
        hideHeader
        showFloatingClose={previewKind === "idcard"}
        className={previewKind === "idcard" ? "bg-white" : "bg-[#0B101B]"}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {previewLoading ? (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-500">불러오는 중…</p>
          ) : previewCard && previewKind === "idcard" ? (
            previewPaid ? (
              <div className="friend-showcase-list__idcard-wrap">
                <LetteringDigitalReception
                  card={previewCard}
                  verified
                  embeddedInPush
                  previewMode
                  enableContactLinks
                  face="front"
                />
              </div>
            ) : (
              <p className="py-16 text-center text-[13px] font-semibold text-slate-500 px-6">
                이 회원은 디지털 인증명함이 없습니다. 쇼케이스로 확인해 주세요.
              </p>
            )
          ) : previewCard ? (
            <PeerShowcasePreview
              key={`peer-${previewCard.userId || "x"}-${previewSessionKey}`}
              card={previewCard}
              onClose={closePreview}
              includeDigitalCard={
                previewPaid && previewCard.showcaseStyle?.includeDigitalCard !== false
              }
            />
          ) : (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-500">
              미리보기를 표시할 수 없습니다. 아이디·쇼케이스 공개 설정을 확인해 주세요.
            </p>
          )}
        </div>
      </AppFullScreenView>

      <UserCaseArchiveView
        open={Boolean(caseArchiveUser?.userId)}
        userId={caseArchiveUser?.userId || null}
        displayName={caseArchiveUser?.name || ""}
        onClose={() => setCaseArchiveUser(null)}
      />
    </>
  );
}
