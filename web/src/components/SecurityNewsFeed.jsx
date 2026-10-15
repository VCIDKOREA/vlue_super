import { useEffect, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { vlueAuthHeaders } from "../lib/vlueAuthHeaders.js";

/** 카테고리 탭 및 네이버 API 검색 키워드 매핑 */
const NEWS_TABS = [
  { id: "major", label: "주요 뉴스", keyword: "보이스피싱" },
  { id: "gov", label: "정부 정보", keyword: "정부 지원금" },
  { id: "types", label: "보이스피싱 유형", keyword: "메신저사칭" },
  { id: "life", label: "생활 안심", keyword: "생활 보안" },
  { id: "fraud", label: "사기 예방", keyword: "금융사기" }
];

/** 피드 중간에 교차 삽입되는 브랜드 스폰서 카드 목록 */
const IN_FEED_SPONSOR_ADS = [
  {
    id: "knox-security",
    sponsorName: "삼성전자 Knox Vault",
    badge: "하드웨어 보안 AD",
    title: "Galaxy Knox로 완성하는 가장 완벽한 금융 보안",
    description: "독립된 보안 프로세서와 메모리로 악성 앱, 루팅, 피싱 원격제어를 원천 차단합니다.",
    actionText: "Knox 보안 살펴보기",
    link: "https://www.samsung.com/sec/apps/samsung-knox/",
    accentColor: "#3b82f6",
    bgGradient: "from-blue-950 via-slate-900 to-black"
  },
  {
    id: "genesis-connected",
    sponsorName: "GENESIS Connected Services",
    badge: "안심 모빌리티 AD",
    title: "사고 긴급출동 및 도난 추적, 24시간 안심 케어",
    description: "제네시스 커넥티드 서비스로 차량 상태 원격 진단과 안전 운행을 완벽히 지원합니다.",
    actionText: "커넥티드 서비스 확인",
    link: "https://www.genesis.com",
    accentColor: "#f59e0b",
    bgGradient: "from-zinc-900 via-neutral-900 to-black"
  },
  {
    id: "fsc-safeguard",
    sponsorName: "금융위원회 · 금융감독원",
    badge: "안심금융 공익 AD",
    title: "원스톱 본인계좌 일괄지급정지로 피해 예방",
    description: "의심 통화나 스미싱 링크 접속 시 즉시 전 금융권 출금을 동시에 동결하세요.",
    actionText: "계좌정보통합관리 확인",
    link: "https://www.payinfo.or.kr",
    accentColor: "#10b981",
    bgGradient: "from-emerald-950 via-slate-900 to-black"
  }
];

export default function SecurityNewsFeed({ className = "", isDarkMode = false }) {
  const [activeTabId, setActiveTabId] = useState("major");
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState({});

  const activeTab = NEWS_TABS.find((t) => t.id === activeTabId) || NEWS_TABS[0];

  useEffect(() => {
    let cancelled = false;
    const currentKeyword = activeTab.keyword;

    // 이미 캐시되어 있으면 즉시 노출
    if (cache[currentKeyword]) {
      setNewsItems(cache[currentKeyword]);
      return;
    }

    setLoading(true);
    const url = apiUrl(`/api/v1/search/news?query=${encodeURIComponent(currentKeyword)}&display=12`);

    fetch(url, {
      headers: { ...vlueAuthHeaders() }
    })
      .then((res) => {
        if (!res.ok) throw new Error("뉴스 데이터를 가져오지 못했습니다.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setNewsItems(items);
        setCache((prev) => ({ ...prev, [currentKeyword]: items }));
      })
      .catch(() => {
        if (cancelled) return;
        // 클라이언트 Fallback 데이터 세팅
        setNewsItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab.keyword, cache]);

  const handleOpenLink = (link) => {
    if (!link) return;
    try {
      const native = typeof window !== "undefined" ? window.Android || window.VlueLettering : null;
      if (native && typeof native.openExternalUrl === "function") {
        native.openExternalUrl(link);
        return;
      }
    } catch {
      /* ignore */
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className={`security-news-feed w-full select-none px-2.5 pt-3 pb-8 ${className}`.trim()}
      aria-label="보안 및 생활정보 뉴스 피드"
    >
      {/* 섹션 타이틀 헤더 */}
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">📰</span>
          <h3 className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white">
            실시간 보안 · 안심 생활 브리핑
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">네이버 뉴스 API</span>
      </div>

      {/* 5개 카테고리 탭 (가로 스크롤 가능) */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NEWS_TABS.map((tab) => {
          const isSelected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-black transition-all duration-200 ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950 scale-[1.02]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 뉴스 피드 리스트 + 중간 AD 스폰서 카드 교차 삽입 */}
      <div className="mt-1 space-y-2.5">
        {loading && newsItems.length === 0 ? (
          // 스켈레톤 로딩
          <div className="space-y-2.5 py-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900"
              >
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-1.5 h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          newsItems.map((news, index) => {
            // 3번째 뉴스(index 2, 5, 8...)마다 중간 AD 스폰서 카드 교차 삽입
            const showSponsorAfter = (index + 1) % 3 === 0;
            const sponsorAd = IN_FEED_SPONSOR_ADS[Math.floor(index / 3) % IN_FEED_SPONSOR_ADS.length];

            return (
              <div key={news.link || `${news.title}-${index}`} className="space-y-2.5">
                {/* 뉴스 카드 */}
                <article
                  onClick={() => handleOpenLink(news.link || news.originallink)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm transition-all duration-150 active:scale-[0.99] hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9.5px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {news.source || "보안 리포트"}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                      {news.formattedDate || "최근"}
                    </span>
                  </div>

                  <h4 className="mt-2 line-clamp-2 text-[13.5px] font-black leading-snug text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-sky-400">
                    {news.title}
                  </h4>

                  <p className="mt-1.5 line-clamp-2 text-[11.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {news.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400">
                      원문 기사 읽기
                    </span>
                    <span className="text-[11px] text-slate-400">›</span>
                  </div>
                </article>

                {/* 중간 교차 삽입 브랜드 스폰서 카드 */}
                {showSponsorAfter && sponsorAd ? (
                  <aside
                    onClick={() => handleOpenLink(sponsorAd.link)}
                    className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r p-3.5 text-white shadow-md transition-all duration-150 active:scale-[0.99]"
                    style={{
                      backgroundImage: `linear-gradient(to right, #0f172a, #1e293b)`
                    }}
                    aria-label="스폰서 추천 광고"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[8.5px] font-black text-white ring-1 ring-white/20">
                          AD
                        </span>
                        <span
                          className="text-[10px] font-black"
                          style={{ color: sponsorAd.accentColor || "#38bdf8" }}
                        >
                          {sponsorAd.sponsorName}
                        </span>
                      </div>
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[8.5px] font-semibold text-white/80">
                        {sponsorAd.badge}
                      </span>
                    </div>

                    <h5 className="mt-2 text-[12.5px] font-black leading-snug text-white">
                      {sponsorAd.title}
                    </h5>

                    <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-300">
                      {sponsorAd.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className="text-[10px] font-black tracking-tight"
                        style={{ color: sponsorAd.accentColor || "#38bdf8" }}
                      >
                        {sponsorAd.actionText} ›
                      </span>
                      <span className="text-[9px] font-medium text-white/50">VLUÉ 공식 파트너</span>
                    </div>
                  </aside>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
