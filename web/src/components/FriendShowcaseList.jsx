import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { buildFriendShowcaseEntries } from "../lib/friendShowcaseEntries.js";
import { resolveVlueShowcaseByPhone } from "../lib/resolveVlueShowcaseByPhone.js";
import { VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import TentShowcaseOverlay from "./showcase/TentShowcaseOverlay.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { readShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES } from "../lib/showcase/tentShowcaseTypes.js";
import "./friend-showcase-list.css";
import "../styles/tent-showcase.css";

function FriendAvatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return <img className="friend-showcase-list__avatar" src={avatarUrl} alt="" />;
  }
  const initial = String(name || "?").trim().slice(0, 1) || "?";
  return (
    <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial" aria-hidden>
      {initial}
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

  const visibleEntries = useMemo(() => filterEntries(entries, searchQuery), [entries, searchQuery]);

  const openPreview = async (friend) => {
    setSelected(friend);
    setPreviewCard(null);
    if (!friend.phone) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const payload = await resolveVlueShowcaseByPhone(friend.phone);
      const tier = payload.card?.membershipTier || friend.membershipTier || "free";
      setPreviewCard(
        applyShowcaseStyleToCard(
          {
            ...payload.card,
            name: payload.card?.name || friend.name,
            organization: payload.card?.organization || friend.org,
            title: payload.card?.title || friend.title,
            phone: payload.phone || friend.phoneDisplay || friend.phone,
            membershipTier: tier,
            photoUrl: payload.card?.photoUrl || friend.avatarUrl || "",
            avatarUrl: payload.card?.avatarUrl || friend.avatarUrl || ""
          },
          isPaidLetteringTier(tier) ? tier : "free"
        )
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setSelected(null);
    setPreviewCard(null);
  };

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  };

  const previewPaid = previewCard ? isPaidLetteringTier(previewCard.membershipTier) : false;

  return (
    <>
      <section
        className={`friend-showcase-list${isHome ? " friend-showcase-list--home" : ""} ${className}`.trim()}
        aria-label="친구 쇼케이스"
      >
        <header className="friend-showcase-list__header">
          <div className="friend-showcase-list__title-row">
            <h2 className="friend-showcase-list__title">친구 쇼케이스</h2>
            <span className="friend-showcase-list__count">{entries.length}</span>
          </div>
          <div className="friend-showcase-list__actions">
            <button
              type="button"
              className={`friend-showcase-list__icon-btn${searchOpen ? " friend-showcase-list__icon-btn--active" : ""}`}
              onClick={toggleSearch}
              aria-label="친구 검색"
              aria-pressed={searchOpen}
            >
              <Search size={20} strokeWidth={2.2} aria-hidden />
            </button>
            {onOpenFriendSearch ? (
              <button
                type="button"
                className="friend-showcase-list__icon-btn"
                onClick={onOpenFriendSearch}
                aria-label="친구 추가"
              >
                <UserPlus size={20} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </div>
        </header>

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
              {visibleEntries.map((friend) => (
                <li key={friend.id}>
                  <button
                    type="button"
                    className={`friend-showcase-list__row${selected?.id === friend.id ? " friend-showcase-list__row--active" : ""}`}
                    onClick={() => openPreview(friend)}
                  >
                    <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} />
                    <div className="friend-showcase-list__meta">
                      <p className="friend-showcase-list__name">{friend.name}</p>
                      <p className="friend-showcase-list__subtitle">{friend.subtitle}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
              showcaseStyle={previewCard.showcaseStyle || readShowcaseStyle()}
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
