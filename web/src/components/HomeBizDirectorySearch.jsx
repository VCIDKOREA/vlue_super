import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import "../styles.css";
import { suggestIndustries } from "../lib/homeBizDirectory.js";
import {
  detectShowcaseSearchMode,
  searchShowcaseByTag
} from "../lib/showcase/showcaseTagsApi.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { resolveVlueShowcaseByPhone } from "../lib/resolveVlueShowcaseByPhone.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES } from "../lib/showcase/tentShowcaseTypes.js";
import { VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import TentShowcaseOverlay from "./showcase/TentShowcaseOverlay.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { VlueBrandLogo } from "./VlueBrandLogo.jsx";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-eye-logo.svg?url";
import "./friend-showcase-list.css";

/**
 * 앱 홈 검색 — 키워드는 #해시태그 쇼케이스 프로필 목록 (웹 공공사업자 표는 미사용)
 * 인기순 / 거리순 정렬, 팔로우는 쇼케이스 안에서만
 */

function BizSearchBar({ query, onQueryChange, onSubmit, logoSize = 22 }) {
  return (
    <div className="home-biz-search__shell">
      <div className="home-biz-search__naver">
        <VlueBrandLogo size={logoSize} className="home-biz-search__logo" alt="" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit?.();
            }
          }}
          placeholder="해시태그·상호·쇼케이스 검색"
          className="home-biz-search__input"
          enterKeyHint="search"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="home-biz-search__clear"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button type="button" onClick={onSubmit} className="home-biz-search__submit" aria-label="검색">
          검색
        </button>
      </div>
    </div>
  );
}

function ResultSortBar({ sort, onSortChange }) {
  return (
    <div className="home-biz-search__sort home-biz-search__sort--list" role="group" aria-label="정렬">
      <button type="button" data-active={sort === "popular"} onClick={() => onSortChange("popular")}>
        인기순
      </button>
      <span className="home-biz-search__sort-divider" aria-hidden>
        |
      </span>
      <button type="button" data-active={sort === "distance"} onClick={() => onSortChange("distance")}>
        거리순
      </button>
    </div>
  );
}

/** 앱: 전화·아이디 외 키워드는 #해시태그 쇼케이스 검색 */
function resolveAppShowcaseSearch(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  const detected = detectShowcaseSearchMode(q);
  if (detected === "phone") return { q, mode: "phone", tagLabel: "" };
  if (detected === "id") return { q, mode: "id", tagLabel: "" };
  const bare = q.replace(/^#/, "").trim();
  if (!bare) return null;
  return { q: `#${bare}`, mode: "hashtag", tagLabel: bare };
}

function popularScore(hit) {
  const tier = String(hit.membershipTier || "free").toLowerCase();
  if (tier === "premium" || tier === "b2b") return 100;
  if (tier === "paid" || tier === "standard") return 80;
  const tags = Array.isArray(hit.tags) ? hit.tags.length : 0;
  return 40 + Math.min(20, tags * 4);
}

function mapHitToRow(hit, i, tagLabel) {
  const userId = String(hit.userId || "").trim();
  const displayName = hit.displayName || "";
  const nameOk = hit.nameVisible === true && displayName && displayName !== "비공개 회원";
  const handle = String(hit.publicHandle || "").replace(/^@/, "");
  const org = hit.orgVisible ? String(hit.organization || "").trim() : "";
  const name = nameOk
    ? displayName
    : handle
      ? `@${handle}`
      : org || "비공개 회원";
  const tags = Array.isArray(hit.tags) ? hit.tags : [];
  const tier = String(hit.membershipTier || "free").toLowerCase();
  return {
    id: `sc-${userId || i}`,
    userId,
    name,
    subtitle: tagLabel
      ? `#${tagLabel}`
      : tags[0]
        ? String(tags[0])
        : handle
          ? `@${handle}`
          : "쇼케이스",
    phone: hit.phoneVisible ? hit.phone || "" : "",
    phoneDisplay: hit.phoneVisible ? hit.phone || "" : "",
    avatarUrl: String(hit.logoUrl || "").trim(),
    publicHandle: handle,
    membershipTier: tier,
    hasShowcase: true,
    hasDigitalCard: isPaidLetteringTier(tier),
    tags,
    popular: popularScore(hit),
    distance: typeof hit.distanceKm === "number" ? hit.distanceKm : Number(hit.distance) || 999 + i
  };
}

function VlueLogoAvatar({ avatarUrl }) {
  return (
    <span className="friend-showcase-list__avatar-wrap">
      {avatarUrl ? (
        <img className="friend-showcase-list__avatar" src={avatarUrl} alt="" />
      ) : (
        <span className="friend-showcase-list__avatar friend-showcase-list__avatar--brand" aria-hidden>
          <img src={VLUE_BRAND_LOGO} alt="" className="friend-showcase-list__avatar-logo" />
        </span>
      )}
    </span>
  );
}

export default function HomeBizDirectorySearch({
  categoryExposedPosts: _categoryExposedPosts = [],
  onOpenBusinessRoom: _onOpenBusinessRoom
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [apiHits, setApiHits] = useState([]);
  const [tagLabel, setTagLabel] = useState("");
  const [apiSearching, setApiSearching] = useState(false);
  const [apiError, setApiError] = useState("");
  const [previewRow, setPreviewRow] = useState(null);
  const [previewKind, setPreviewKind] = useState(/** @type {'showcase'|'idcard'} */ ("showcase"));
  const [previewCard, setPreviewCard] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const stickySentinelRef = useRef(null);

  const rows = useMemo(() => {
    const mapped = apiHits.map((hit, i) => mapHitToRow(hit, i, tagLabel));
    const list = [...mapped];
    if (sort === "distance") {
      list.sort((a, b) => a.distance - b.distance || b.popular - a.popular);
    } else {
      list.sort((a, b) => b.popular - a.popular || a.name.localeCompare(b.name, "ko"));
    }
    return list;
  }, [apiHits, tagLabel, sort]);

  const suggestions = useMemo(() => suggestIndustries(query), [query]);

  useEffect(() => {
    const resolved = resolveAppShowcaseSearch(query);
    if (!resultsOpen || !resolved) {
      setApiHits([]);
      setTagLabel("");
      setApiError("");
      setApiSearching(false);
      return undefined;
    }
    let cancelled = false;
    setApiSearching(true);
    const timer = setTimeout(() => {
      searchShowcaseByTag(resolved.q, { mode: resolved.mode }).then((res) => {
        if (cancelled) return;
        setApiSearching(false);
        if (!res.ok) {
          setApiHits([]);
          setTagLabel(resolved.tagLabel || "");
          setApiError(res.error || "검색에 실패했습니다.");
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("vlue-showcase-search-auth", {
                detail: {
                  code: res.code,
                  error: res.error,
                  meta: res.meta,
                  status: res.status
                }
              })
            );
          }
          return;
        }
        setApiError("");
        setTagLabel(resolved.tagLabel || "");
        setApiHits(res.items || []);
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, resultsOpen]);

  useEffect(() => {
    const sentinel = stickySentinelRef.current;
    if (!sentinel) return undefined;
    const root = sentinel.closest(".home-main-feed");
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: root || null, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const openResults = () => setResultsOpen(true);
  const closeResults = () => setResultsOpen(false);

  const applySuggestion = (item) => {
    setQuery(item.value);
    setResultsOpen(true);
  };

  const openPreview = async (row, kind) => {
    setPreviewRow(row);
    setPreviewKind(kind);
    setPreviewCard(null);
    if (!row.phone && !row.phoneDisplay) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const payload = await resolveVlueShowcaseByPhone(row.phone || row.phoneDisplay);
      const tier = payload.card?.membershipTier || row.membershipTier || "free";
      setPreviewCard({
        ...payload.card,
        userId: payload.card?.userId || row.userId || "",
        ownerUserId: payload.card?.ownerUserId || payload.card?.userId || row.userId || "",
        name: payload.card?.name || row.name,
        phone: payload.phone || row.phoneDisplay || row.phone,
        membershipTier: tier,
        photoUrl: payload.card?.photoUrl || row.avatarUrl || "",
        showcaseStyle: payload.card?.showcaseStyle || createDefaultShowcaseStyle()
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewRow(null);
    setPreviewCard(null);
    setPreviewKind("showcase");
  };

  const previewPaid = previewCard ? isPaidLetteringTier(previewCard.membershipTier) : false;
  const activeTag = tagLabel || query.replace(/^#/, "").trim();

  const emptyMessage = (() => {
    if (apiSearching) return "검색 중…";
    if (apiError) return apiError;
    if (query.trim()) {
      return activeTag
        ? `#${activeTag} 태그를 쓴 공개 쇼케이스가 없습니다.`
        : "검색 결과가 없습니다.";
    }
    return "검색어를 입력하면 #해시태그 쇼케이스 프로필이 표시됩니다.";
  })();

  return (
    <>
      <div ref={stickySentinelRef} className="home-biz-search__sentinel" aria-hidden />

      {resultsOpen ? (
        <button
          type="button"
          className="home-biz-search__backdrop"
          aria-label="검색 닫기"
          onClick={closeResults}
        />
      ) : null}

      <section
        className={`home-biz-search home-biz-search--sticky ${stuck || resultsOpen ? "home-biz-search--stuck" : ""} ${resultsOpen ? "home-biz-search--active" : ""}`}
        aria-label="쇼케이스 해시태그 검색"
      >
        <BizSearchBar query={query} onQueryChange={setQuery} onSubmit={openResults} />

        {resultsOpen ? (
          <div className="home-biz-search__sheet" role="dialog" aria-modal="true" aria-label="쇼케이스 검색 결과">
            <div className="home-biz-search__sheet-head shrink-0">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 text-[11px] font-black text-slate-700">
                  {apiSearching
                    ? "검색 중…"
                    : activeTag
                      ? `#${activeTag} · 쇼케이스 ${rows.length}건`
                      : `쇼케이스 ${rows.length}건`}
                </p>
                <ResultSortBar sort={sort} onSortChange={setSort} />
                <button type="button" onClick={closeResults} className="shrink-0 text-[12px] font-black text-blue-600">
                  닫기
                </button>
              </div>
            </div>

            {suggestions.length > 0 ? (
              <div className="home-biz-search__sheet-tags shrink-0">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"
                  >
                    #{String(s.value || s.label).replace(/^#/, "")}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="home-biz-search__sheet-body vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {rows.length === 0 ? (
                <div className="mx-2 mb-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[12px] font-semibold text-slate-500">
                  {emptyMessage}
                </div>
              ) : (
                <ul className="friend-showcase-list__rows px-0 pb-2">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <div className="friend-showcase-list__row friend-showcase-list__row--ig">
                        <div className="friend-showcase-list__row-main">
                          <VlueLogoAvatar avatarUrl={row.avatarUrl} />
                          <div className="friend-showcase-list__meta">
                            <p className="friend-showcase-list__name">{row.name}</p>
                            <p className="friend-showcase-list__subtitle">
                              {row.subtitle}
                              {sort === "distance" && row.distance < 900
                                ? ` · ${row.distance.toFixed?.(1) ?? row.distance}km`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="friend-showcase-list__actions-col">
                          <div className="friend-showcase-list__product-btns">
                            <button
                              type="button"
                              className="friend-showcase-list__product-btn friend-showcase-list__product-btn--showcase"
                              onClick={() => openPreview(row, "showcase")}
                            >
                              쇼케이스
                            </button>
                            {row.hasDigitalCard ? (
                              <button
                                type="button"
                                className="friend-showcase-list__product-btn friend-showcase-list__product-btn--card"
                                onClick={() => openPreview(row, "idcard")}
                              >
                                명함
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <AppFullScreenView
        open={Boolean(previewRow)}
        onClose={closePreview}
        title={
          previewRow
            ? previewKind === "idcard"
              ? `${previewRow.name} · 디지털 인증명함`
              : `${previewRow.name}님의 ${VLUE_SHOWCASE.nameKo}`
            : ""
        }
        subtitle={previewKind === "idcard" ? "디지털 인증명함" : "쇼케이스"}
        isDarkMode={false}
        coverBottomNav
        hideHeader
        showFloatingClose={false}
        className="bg-white"
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
              <p className="px-6 py-16 text-center text-[13px] font-semibold text-slate-500">
                이 회원은 디지털 인증명함이 없습니다. 쇼케이스로 확인해 주세요.
              </p>
            )
          ) : previewCard ? (
            <TentShowcaseOverlay
              previewMode
              forceInteractive
              callState={CALL_STATES.CONNECTED}
              verified
              membershipTier={previewPaid ? "paid" : "free"}
              peerPhone={previewCard.phone || previewRow?.phoneDisplay}
              displayName={previewCard.name || previewRow?.name}
              organization={previewCard.organization || ""}
              card={previewCard}
              showcaseStyle={previewCard.showcaseStyle || createDefaultShowcaseStyle()}
              onClose={closePreview}
              className="tent-showcase--fill"
            />
          ) : (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-500">
              전화번호가 공개되지 않아 미리보기를 열 수 없습니다. 쇼케이스 안에서 팔로우할 수 있습니다.
            </p>
          )}
        </div>
      </AppFullScreenView>
    </>
  );
}
