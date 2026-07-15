import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import "../styles.css";
import {
  searchBusinessDirectory,
  suggestIndustries
} from "../lib/homeBizDirectory.js";
import {
  detectShowcaseSearchMode,
  searchShowcaseByTag
} from "../lib/showcase/showcaseTagsApi.js";
import LetteringBusinessCardPanel from "./LetteringBusinessCardPanel.jsx";
import LetteringBizcardScaledPreview from "./LetteringBizcardScaledPreview.jsx";
import LetteringBizcardSecureFrame from "./LetteringBizcardSecureFrame.jsx";
import { VlueBrandLogo } from "./VlueBrandLogo.jsx";

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
          placeholder="업체명·쇼케이스·명함 검색"
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

function modeLabel(mode) {
  if (mode === "phone") return "전화번호";
  if (mode === "name") return "실명·상호";
  if (mode === "id") return "아이디·활동명";
  if (mode === "hashtag") return "해시태그";
  return "쇼케이스";
}

function mapApiHitToBiz(hit, i, mode) {
  const displayName = hit.displayName || hit.name || "";
  const phone = hit.phoneVisible ? hit.phone || "" : "";
  const nameOk = hit.nameVisible !== false && displayName && displayName !== "비공개 회원";
  const org = String(hit.organization || "").trim();
  const titleName = org || (nameOk ? displayName : displayName || "비공개 회원");
  const handle = hit.publicHandle || "";
  const card =
    nameOk || phone || org
      ? {
          name: nameOk ? displayName : "",
          displayName: nameOk ? displayName : "",
          organization: org,
          phone,
          title: hit.title || "",
          logoUrl: hit.logoUrl || "",
          membershipTier: hit.membershipTier || "paid",
          feedId: hit.userId ? `user-${hit.userId}` : "",
          userId: hit.userId || ""
        }
      : null;

  return {
    id: `api-${hit.userId || phone || handle || i}`,
    categoryId: "showcase",
    categoryLabel: "쇼케이스·명함",
    subcat: modeLabel(mode),
    name: titleName,
    popular: 90,
    distance: 0,
    rating: 5,
    likes: 0,
    roomId: null,
    phone,
    phoneVisible: Boolean(hit.phoneVisible),
    idInquiryEnabled: Boolean(hit.idInquiryEnabled),
    publicHandle: handle,
    address: "",
    intro:
      (hit.tags || []).join(" ") ||
      [org, nameOk ? displayName : "", handle ? `@${handle}` : ""].filter(Boolean).join(" · ") ||
      "검색 공개된 쇼케이스",
    menu: [],
    showcaseTags: hit.tags || [],
    img:
      hit.logoUrl ||
      "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect fill="#e2e8f0" width="112" height="112"/><text x="56" y="62" text-anchor="middle" fill="#64748b" font-size="28" font-family="sans-serif">${String(
            titleName
          )
            .slice(0, 1)
            .toUpperCase()}</text></svg>`
        ),
    publicExposure: true,
    card,
    userId: hit.userId || ""
  };
}

export default function HomeBizDirectorySearch({
  categoryExposedPosts = [],
  onOpenBusinessRoom
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [stuck, setStuck] = useState(false);
  const [apiHits, setApiHits] = useState([]);
  const [apiMode, setApiMode] = useState(null);
  const [apiSearching, setApiSearching] = useState(false);
  const [apiError, setApiError] = useState("");
  const stickySentinelRef = useRef(null);

  const localResults = useMemo(
    () => searchBusinessDirectory(query, { sort, categoryExposedPosts }),
    [query, sort, categoryExposedPosts]
  );

  const results = useMemo(() => {
    const mapped = apiHits.map((hit, i) => mapApiHitToBiz(hit, i, apiMode));
    if (!mapped.length) return localResults;
    const seen = new Set(mapped.map((b) => b.id));
    const localExtra = localResults.filter((b) => !seen.has(b.id) && !seen.has(`api-${b.userId}`));
    return [...mapped, ...localExtra];
  }, [localResults, apiHits, apiMode]);

  const suggestions = useMemo(() => suggestIndustries(query), [query]);

  const selected = useMemo(
    () => results.find((b) => b.id === selectedId) || null,
    [results, selectedId]
  );

  useEffect(() => {
    if (!resultsOpen) setSelectedId("");
  }, [resultsOpen]);

  useEffect(() => {
    const q = query.trim();
    const mode = detectShowcaseSearchMode(q);
    if (!resultsOpen || !mode) {
      setApiHits([]);
      setApiMode(null);
      setApiError("");
      setApiSearching(false);
      return undefined;
    }
    let cancelled = false;
    setApiSearching(true);
    const timer = setTimeout(() => {
      searchShowcaseByTag(q, { mode }).then((res) => {
        if (cancelled) return;
        setApiSearching(false);
        if (!res.ok) {
          setApiHits([]);
          setApiMode(mode);
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
        setApiMode(res.mode || mode);
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

  const openResults = () => {
    setResultsOpen(true);
    setSelectedId("");
  };

  const closeResults = () => {
    setResultsOpen(false);
    setSelectedId("");
  };

  const applySuggestion = (item) => {
    setQuery(item.value);
    setResultsOpen(true);
    setSelectedId("");
  };

  const emptyMessage = (() => {
    if (apiSearching) return "검색 중…";
    if (apiError) return apiError;
    if (query.trim()) {
      return "검색 결과가 없습니다. 상대가 검색 공개를 허용했는지, 본인 쇼케이스가 활성화됐는지 확인해 보세요.";
    }
    return "검색어를 입력하면 공개된 쇼케이스·명함이 표시됩니다.";
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
        aria-label="업체·디지털명함 검색"
      >
        <BizSearchBar query={query} onQueryChange={setQuery} onSubmit={openResults} />

        {resultsOpen ? (
          <div
            className={`home-biz-search__sheet ${selectedId ? "home-biz-search__sheet--detail" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="업체 검색 결과"
          >
            <div className="home-biz-search__sheet-head shrink-0">
              {selectedId && selected ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId("")}
                    className="text-[12px] font-black text-blue-600"
                  >
                    ← 목록
                  </button>
                  <p className="min-w-0 flex-1 truncate text-center text-[13px] font-black text-slate-900">
                    {selected.name}
                  </p>
                  <button type="button" onClick={closeResults} className="text-[12px] font-black text-blue-600">
                    닫기
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 text-[11px] font-black text-slate-700">
                    {apiSearching
                      ? "검색 중…"
                      : query.trim()
                        ? `검색 ${results.length}건`
                        : `노출 ${results.length}건`}
                  </p>
                  <ResultSortBar sort={sort} onSortChange={setSort} />
                  <button type="button" onClick={closeResults} className="shrink-0 text-[12px] font-black text-blue-600">
                    닫기
                  </button>
                </div>
              )}
            </div>

            {!selectedId ? (
              <>
                {suggestions.length > 0 && (
                  <div className="home-biz-search__sheet-tags shrink-0">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="home-biz-search__sheet-body vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {results.length === 0 ? (
                    <div className="mx-2 mb-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[12px] font-semibold text-slate-500">
                      {emptyMessage}
                    </div>
                  ) : (
                    <ul className="px-2 pb-2">
                      {results.map((biz) => (
                        <li key={biz.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(biz.id)}
                            className="flex w-full gap-3 border-b border-slate-100 py-3 text-left last:border-b-0 active:bg-slate-50"
                          >
                            <img src={biz.img} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-black text-slate-900">{biz.name}</p>
                              <p className="mt-0.5 text-[11px] font-semibold text-blue-600">
                                {biz.categoryLabel} · {biz.subcat}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">{biz.intro}</p>
                              {Array.isArray(biz.showcaseTags) && biz.showcaseTags.length > 0 ? (
                                <p className="mt-1 truncate text-[10px] font-bold text-indigo-500">
                                  {biz.showcaseTags.slice(0, 4).join(" ")}
                                </p>
                              ) : null}
                              <p className="mt-1 text-[10px] font-bold text-slate-400">
                                {sort === "distance"
                                  ? `${biz.distance}km`
                                  : biz.phoneVisible && biz.phone
                                    ? biz.phone
                                    : biz.publicHandle
                                      ? `@${biz.publicHandle}`
                                      : `⭐ ${biz.rating}`}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : selected ? (
              <div className="home-biz-search__sheet-body vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
                <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-32 w-full overflow-hidden bg-slate-100">
                    <img src={selected.img} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-black text-blue-600">
                      {selected.categoryLabel} · {selected.subcat}
                    </p>
                    <h3 className="mt-0.5 text-[16px] font-black text-slate-900">{selected.name}</h3>
                    {selected.address ? (
                      <p className="mt-1 text-[12px] font-semibold text-slate-600">{selected.address}</p>
                    ) : null}
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-700">{selected.intro}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[12px] font-black text-slate-900">디지털인증명함</p>
                  {selected.card ? (
                    <LetteringBizcardScaledPreview isDarkMode={false}>
                      <LetteringBizcardSecureFrame
                        designTemplate={selected.card.designTemplate || "classic-light"}
                        card={selected.card}
                        cardId={selected.id}
                      >
                        <LetteringBusinessCardPanel card={selected.card} />
                      </LetteringBizcardSecureFrame>
                    </LetteringBizcardScaledPreview>
                  ) : (
                    <p className="py-6 text-center text-[11px] text-slate-400">
                      검색 공개 범위에 따라 명함 상세가 제한될 수 있습니다.
                    </p>
                  )}
                </div>

                <div className="home-biz-search-panel__actions mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2.5">
                  {selected.roomId ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeResults();
                        onOpenBusinessRoom?.(selected.roomId);
                      }}
                      className="rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white active:opacity-90"
                    >
                      문의 채팅
                    </button>
                  ) : selected.idInquiryEnabled && selected.publicHandle ? (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(`@${selected.publicHandle}`);
                        } catch {
                          /* noop */
                        }
                      }}
                      className="rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white active:opacity-90"
                    >
                      @{selected.publicHandle}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-slate-200 py-2.5 text-[12px] font-black text-slate-500"
                    >
                      채팅 없음
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!selected.phone}
                    onClick={() => {
                      if (!selected.phone) return;
                      try {
                        window.location.href = `tel:${selected.phone}`;
                      } catch {
                        /* noop */
                      }
                    }}
                    className={`rounded-xl py-2.5 text-[12px] font-black active:opacity-90 ${
                      selected.phone ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    전화 문의
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}
