import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import "../styles.css";
import {
  searchBusinessDirectory,
  suggestIndustries
} from "../lib/homeBizDirectory.js";
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

export default function HomeBizDirectorySearch({
  categoryExposedPosts = [],
  onOpenBusinessRoom
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("popular");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [stuck, setStuck] = useState(false);
  const stickySentinelRef = useRef(null);

  const results = useMemo(
    () => searchBusinessDirectory(query, { sort, categoryExposedPosts }),
    [query, sort, categoryExposedPosts]
  );

  const suggestions = useMemo(() => suggestIndustries(query), [query]);

  const selected = useMemo(
    () => results.find((b) => b.id === selectedId) || null,
    [results, selectedId]
  );

  useEffect(() => {
    if (!resultsOpen) setSelectedId("");
  }, [resultsOpen]);

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
                    {query.trim() ? `검색 ${results.length}건` : `노출 ${results.length}건`}
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
                      노출 허용된 업체가 없습니다.
                      <br />
                      다른 검색어·업종을 시도해 보세요.
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
                              <p className="mt-1 text-[10px] font-bold text-slate-400">
                                {sort === "distance"
                                  ? `${biz.distance}km`
                                  : `⭐ ${biz.rating} · ❤ ${Number(biz.likes || 0).toLocaleString("ko-KR")}`}
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
                  <div className="h-32 w-full overflow-hidden">
                    <img src={selected.img} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-black text-blue-600">
                      {selected.categoryLabel} · {selected.subcat}
                    </p>
                    <h3 className="mt-0.5 text-[16px] font-black text-slate-900">{selected.name}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-slate-600">{selected.address}</p>
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
                    <p className="py-6 text-center text-[11px] text-slate-400">등록된 명함이 없습니다.</p>
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
                    onClick={() => {
                      try {
                        window.location.href = `tel:${selected.phone}`;
                      } catch {
                        /* noop */
                      }
                    }}
                    className="rounded-xl bg-slate-900 py-2.5 text-[12px] font-black text-white active:opacity-90"
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
