import { useEffect, useMemo, useRef, useState } from "react";
import { ADMOB_TEST } from "../lib/ads/adMobUnitIds.js";
import { openAdMobShowcase } from "../lib/ads/openAdMobShowcase.js";

/** 세로형 카드 규격 (약 9:16) */
const CARD_W = 140;
const CARD_H = 248;

/** localStorage 일일 캐싱 키 */
const DAILY_SPONSOR_STORAGE_KEY = "vlue_daily_sponsor_cards_v1";

/**
 * 대기업 브랜드/명품/IT/자동차 컨셉의 프리미엄 하우스 스폰서 풀 (12종)
 * 당일 날짜(YYYY-MM-DD) 기반으로 매일 자정 6종이 고정 선정되어 하루 동안 동일 유지
 */
const HOUSE_BRAND_POOL = [
  {
    id: "samsung-galaxy",
    brand: "SAMSUNG",
    badge: "AI 플래그십",
    headline: "Galaxy S26 Ultra",
    body: "Galaxy AI와 2억 화소 쿼드 카메라의 압도적 혁신",
    category: "전자기기 / IT",
    accentColor: "#38bdf8",
    bgImage: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80",
    ctaLabel: "자세히 보기",
    link: "https://www.samsung.com/sec/smartphones/galaxy-s/",
    specs: ["Galaxy AI", "2억 화소 쿼드", "Knox Vault 보안", "티타늄 프레임"]
  },
  {
    id: "genesis-g90",
    brand: "GENESIS",
    badge: "럭셔리 모빌리티",
    headline: "GENESIS G90 Black",
    body: "대한민국 럭셔리 플래그십 세단의 가장 순수한 정점",
    category: "자동차",
    accentColor: "#fbbf24",
    bgImage: "https://images.unsplash.com/photo-1555353540-64580b51c258?w=800&q=80",
    ctaLabel: "시승 예약",
    link: "https://www.genesis.com/kr/ko/models/luxury-sedan-genesis/g90.html",
    specs: ["럭셔리 플래그십", "AWD 드라이브", "VIP 리어 시트", "프리미엄 안심케어"]
  },
  {
    id: "tesla-fsd",
    brand: "TESLA",
    badge: "완전 자율주행",
    headline: "Tesla CyberCab & S",
    body: "0-100km/h 2.1초, 하드웨어 4.0 기반 AI 오토파일럿",
    category: "미래 모빌리티",
    accentColor: "#f87171",
    bgImage: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600&q=80",
    ctaLabel: "주문하기",
    link: "https://www.tesla.com/ko_kr",
    specs: ["FSD 완전자율주행", "0-100km 2.1s", "OTA 업데이트", "AI 슈퍼컴퓨팅"]
  },
  {
    id: "apple-iphone",
    brand: "Apple",
    badge: "프리미엄 테크",
    headline: "iPhone 18 Pro Max",
    body: "항공우주 티타늄과 3나노 A19 Pro 칩의 초월적 성능",
    category: "IT 디바이스",
    accentColor: "#fcd34d",
    bgImage: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80",
    ctaLabel: "구입하기",
    link: "https://www.apple.com/kr/iphone/",
    specs: ["A19 Pro 칩셋", "항공우주 티타늄", "ProMotion 120Hz", "공간 음향"]
  },
  {
    id: "maybach-eqs",
    brand: "MAYBACH",
    badge: "하이엔드 럭셔리",
    headline: "Maybach EQS 680",
    body: "퍼스트 클래스 리어 시트와 전동 럭셔리의 극치",
    category: "명품 자동차",
    accentColor: "#34d399",
    bgImage: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&q=80",
    ctaLabel: "브로슈어 신청",
    link: "https://www.mercedes-benz.co.kr",
    specs: ["하이엔드 럭셔리", "퍼스트 클래스 리어", "Burmester® 4D", "에어매틱"]
  },
  {
    id: "lg-signature",
    brand: "LG SIGNATURE",
    badge: "프리미엄 가전",
    headline: "LG 올레드 M4 무선",
    body: "세계 최초 무선 4K 144Hz AV 전송, 공간의 예술",
    category: "프리미엄 라이프",
    accentColor: "#a78bfa",
    bgImage: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&q=80",
    ctaLabel: "체험관 안내",
    link: "https://www.lge.co.kr",
    specs: ["무선 4K 144Hz", "올레드 evo", "α11 AI 프로세서", "돌비 비전"]
  },
  {
    id: "porsche-taycan",
    brand: "PORSCHE",
    badge: "하이퍼 EV",
    headline: "Porsche Taycan Turbo GT",
    body: "최고출력 1,034마력, 뉘르부르크링 랩타임 신기록의 전기 스포츠카",
    category: "명품 자동차",
    accentColor: "#c084fc",
    bgImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    ctaLabel: "나만의 포르쉐",
    link: "https://www.porsche.com/korea/ko/",
    specs: ["최고출력 1,034hp", "Launch Control", "800V 초고속충전", "액티브 라이드"]
  },
  {
    id: "dyson-airwrap",
    brand: "dyson",
    badge: "뷰티 테크",
    headline: "다이슨 에어랩 i.d.™",
    body: "블루투스 무선 연동과 지능형 열제어로 완성하는 손상 없는 스타일링",
    category: "프리미엄 라이프",
    accentColor: "#f472b6",
    bgImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80",
    ctaLabel: "신제품 보기",
    link: "https://www.dyson.co.kr",
    specs: ["지능형 열제어", "코안다 스타일링", "블루투스 무선연동", "손상 없는 케어"]
  },
  {
    id: "bmw-i7",
    brand: "BMW",
    badge: "럭셔리 클래스",
    headline: "BMW i7 M70 xDrive",
    body: "31.3인치 BMW 시어터 스크린과 이그제큐티브 라운지의 절대적 안락함",
    category: "자동차",
    accentColor: "#60a5fa",
    bgImage: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80",
    ctaLabel: "시승 신청",
    link: "https://www.bmw.co.kr",
    specs: ["31.3인치 시어터", "이그제큐티브 라운지", "M 스포츠 xDrive", "크리스탈 라이트"]
  },
  {
    id: "sony-alpha",
    brand: "SONY",
    badge: "프로페셔널",
    headline: "Sony α9 III 글로벌 셔터",
    body: "초당 120연사 무왜곡 촬영, 세계 최초 풀프레임 글로벌 셔터",
    category: "전자기기 / IT",
    accentColor: "#fb923c",
    bgImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
    ctaLabel: "자세히 보기",
    link: "https://www.sony.co.kr",
    specs: ["글로벌 셔터", "초당 120연사", "AI 피사체 인식", "블랙아웃 프리"]
  },
  {
    id: "bo-beolab",
    brand: "BANG & OLUFSEN",
    badge: "하이엔드 사운드",
    headline: "B&O Beolab 50",
    body: "공간 음향 빔 제어와 2,100W 출력의 마스터피스 어쿠스틱",
    category: "명품 가전",
    accentColor: "#facc15",
    bgImage: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80",
    ctaLabel: "체험 예약",
    link: "https://www.bang-olufsen.com/ko/kr",
    specs: ["2,100W 출력", "어쿠스틱 렌즈", "액티브 룸 보정", "명품 사운드"]
  },
  {
    id: "rolex-submariner",
    brand: "ROLEX",
    badge: "타임피스",
    headline: "Oyster Perpetual Submariner",
    body: "수심 300미터 방수 오이스터스틸과 세라크롬 베젤의 독보적 위상",
    category: "명품 워치",
    accentColor: "#10b981",
    bgImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    ctaLabel: "컬렉션 보기",
    link: "https://www.rolex.com/ko",
    specs: ["수심 300m 방수", "오이스터스틸", "세라크롬 베젤", "최상급 크로노미터"]
  }
];

/** 오늘 날짜 문자열 반환 (YYYY-MM-DD) */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 당일 날짜(YYYY-MM-DD) 기준 24시간 캐싱 및 결정적 6개 카드 선정 알고리즘
 * - 당일 접속 시에는 항상 동일한 6개가 고정 노출 (새로고침/재방문 시 무작위 변경 방지)
 * - 매일 자정 00:00(날짜 변경 시) 자동으로 다음 6개 세트로 로테이션 갱신
 */
function getDailyRotatedSponsors(dateStr) {
  // 1. localStorage 캐시 확인
  try {
    const cachedRaw = localStorage.getItem(DAILY_SPONSOR_STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (
        parsed?.date === dateStr &&
        Array.isArray(parsed?.cards) &&
        parsed.cards.length === 6
      ) {
        return parsed.cards;
      }
    }
  } catch {
    /* ignore storage errors */
  }

  // 2. 날짜 문자열(YYYY-MM-DD) 기반 의사 난수 시드 계산
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  }

  // 3. 풀에서 결정적 6개 카드 선정 (중복 없이 순서 일관성 보장)
  const poolCopy = [...HOUSE_BRAND_POOL];
  const selected = [];
  const targetCount = 6;

  for (let i = 0; i < targetCount && poolCopy.length > 0; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const index = seed % poolCopy.length;
    selected.push(poolCopy[index]);
    poolCopy.splice(index, 1);
  }

  // 4. localStorage에 당일 날짜로 캐싱
  try {
    localStorage.setItem(
      DAILY_SPONSOR_STORAGE_KEY,
      JSON.stringify({ date: dateStr, cards: selected })
    );
  } catch {
    /* ignore storage errors */
  }

  return selected;
}

export default function SponsorAdSwiper({ className = "" }) {
  // 1. 당일 날짜 상태 및 6개 카드 캐싱 목록
  const [currentDate, setCurrentDate] = useState(() => getTodayDateString());
  const [dailyCards, setDailyCards] = useState(() =>
    getDailyRotatedSponsors(getTodayDateString())
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const scrollRef = useRef(null);

  // AdMob 네이티브 광고 연동 상태
  const [adMobStatus, setAdMobStatus] = useState("idle");
  const [adMobAsset, setAdMobAsset] = useState(null);

  const bridge = typeof window !== "undefined" ? window.VlueLettering || window.Android : null;
  const hasBridge = typeof bridge?.showNativeAdFallback === "function";

  // 2. 자정 00:00(24시간 갱신) 감지 타이머
  useEffect(() => {
    const checkMidnight = () => {
      const today = getTodayDateString();
      if (today !== currentDate) {
        setCurrentDate(today);
        setDailyCards(getDailyRotatedSponsors(today));
        setActiveIndex(0);
      }
    };

    const midnightInterval = window.setInterval(checkMidnight, 30 * 1000);
    return () => window.clearInterval(midnightInterval);
  }, [currentDate]);

  // 3. 구글 AdMob Native Ad 연동 (브랜드/전자기기/자동차/명품/IT 카테고리 필터링)
  useEffect(() => {
    if (!hasBridge) {
      setAdMobStatus("unsupported");
      return;
    }

    const onAdStatus = (ev) => {
      const payload = ev?.detail;
      if (!payload || typeof payload !== "object") return;
      const st = String(payload.status || "");
      if (st === "loaded" || payload.headline || payload.mediaUrl) {
        setAdMobStatus("loaded");
        setAdMobAsset({
          id: "admob-native",
          brand: payload.advertiser || "스폰서 광고주",
          badge: "맞춤 스폰서",
          headline: payload.headline || "추천 브랜드 스폰서",
          body: payload.body || "Google AdMob 프리미엄 파트너십",
          category: "브랜드 제휴",
          accentColor: "#38bdf8",
          bgImage: payload.mediaUrl || "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80",
          ctaLabel: payload.ctaLabel || "자세히 보기",
          isAdMob: true
        });
      } else if (st === "failed" || st === "timeout") {
        setAdMobStatus("fallback");
      }
    };

    window.addEventListener("vlue-native-ad-status", onAdStatus);

    try {
      bridge.showNativeAdFallback?.(
        JSON.stringify({
          visible: true,
          unitId: ADMOB_TEST.NATIVE,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          keywords: [
            "samsung", "galaxy", "hyundai", "genesis", "tesla",
            "apple", "mercedes", "luxury", "electronics", "automotive", "it"
          ],
          categories: ["brand", "electronics", "automotive", "luxury", "it"],
          contentRating: "MAX_AD_CONTENT_RATING_G"
        })
      );
    } catch {
      setAdMobStatus("fallback");
    }

    return () => {
      window.removeEventListener("vlue-native-ad-status", onAdStatus);
    };
  }, [hasBridge, bridge]);

  // 4. 당일 6개 카드 목록 확정
  const sponsorCards = useMemo(() => {
    return dailyCards.map((card, idx) => {
      if (idx === 0 && adMobAsset) {
        return adMobAsset;
      }
      return card;
    });
  }, [dailyCards, adMobAsset]);

  // 5. 카드 내 카운트다운 타이머 (00:04 등 롤링)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setActiveIndex((currentIdx) => {
            const nextIdx = (currentIdx + 1) % sponsorCards.length;
            if (scrollRef.current) {
              const targetLeft = nextIdx * (CARD_W + 10);
              scrollRef.current.scrollTo({ left: targetLeft, behavior: "smooth" });
            }
            return nextIdx;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sponsorCards.length]);

  // 6. 가로 스크롤 감지하여 인디케이터 닷 동기화
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const itemWidth = CARD_W + 10;
    const index = Math.round(scrollLeft / itemWidth);
    if (index >= 0 && index < sponsorCards.length) {
      setActiveIndex(index);
    }
  };

  /**
   * 세로 AD 카드 탭 시:
   * 4번 밋밋한 팝업 모달 대신 3번 사진과 동일한 VLUÉ Full-Screen 스폰서 쇼케이스 뷰어(ShowcaseViewer)로 바로 열기
   */
  const handleCardClick = (card) => {
    openAdMobShowcase({
      headline: card.headline,
      body: card.body,
      advertiser: card.brand || "스폰서 광고주",
      mediaUrl: card.bgImage || card.mediaUrl,
      ctaLabel: card.ctaLabel || "자세히 보기",
      landingUrl: card.link,
      link: card.link,
      iconUrl: card.iconUrl || card.bgImage,
      badge: card.badge,
      category: card.category,
      accentColor: card.accentColor,
      specs: card.specs,
      hasVideoContent: false,
      isAdMob: Boolean(card.isAdMob)
    });
  };

  const formattedTimer = `00:${String(countdown).padStart(2, "0")}`;

  return (
    <section
      className={`sponsor-ad-swiper relative w-full shrink-0 select-none px-2.5 py-2 ${className}`.trim()}
      aria-label="추천 스폰서 쇼케이스"
    >
      {/* 상단 헤더: 타이틀 + 당일 고정 배지 + 6개 인디케이터 닷 */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          <p className="text-[12px] font-black tracking-tight text-slate-800 dark:text-slate-100">
            추천 스폰서 쇼케이스
          </p>
          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-600 dark:text-sky-300">
            오늘의 브랜드 AD
          </span>
        </div>

        {/* 6개 인디케이터 닷 */}
        <div className="flex items-center gap-1">
          {sponsorCards.map((card, i) => (
            <button
              key={card.id || i}
              type="button"
              aria-label={`스폰서 카드 ${i + 1}`}
              onClick={() => {
                setActiveIndex(i);
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ left: i * (CARD_W + 10), behavior: "smooth" });
                }
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-4 bg-sky-500 shadow-sm"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 가로 스와이프 캐러셀 영역 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {sponsorCards.map((card, index) => {
          const isCurrent = index === activeIndex;
          return (
            <div
              key={card.id || index}
              onClick={() => handleCardClick(card)}
              className="relative shrink-0 snap-start overflow-hidden rounded-[18px] bg-slate-900 text-left shadow-md transition-transform duration-200 active:scale-[0.98] cursor-pointer"
              style={{ width: CARD_W, height: CARD_H }}
            >
              {/* 
                1. 원본 브랜드 고화질 이미지 — 쨍하고 선명하게 100% 명확히 노출
                어두운 전체 오버레이 필터를 완전히 제거하여 브랜드 제품의 선명도 극대화
              */}
              {card.bgImage ? (
                <img
                  src={card.bgImage}
                  alt={card.headline}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
              ) : null}

              {/* 
                2. 최하단 글자 가독성을 위한 최소한의 은은한 그라디언트 (최하단 35% 영역만 최소 적용)
                상단/중앙 영역은 투명 처리되어 원본 사진이 쨍하게 보임
              */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

              {/* 상단 태그 및 카운트다운 타이머 뱃지 */}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                <span className="rounded-md bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[8.5px] font-black text-white/95 ring-1 ring-white/15">
                  AD
                </span>
                <span className="rounded-md bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[8.5px] font-black text-sky-300 ring-1 ring-sky-500/30">
                  ⏱️ {isCurrent ? formattedTimer : "00:04"}
                </span>
              </div>

              {/* 하단 텍스트 및 CTA */}
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <div className="flex items-center gap-1">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider drop-shadow-sm"
                    style={{ color: card.accentColor || "#38bdf8" }}
                  >
                    {card.brand}
                  </span>
                  <span className="text-[8px] text-white/70">· {card.category}</span>
                </div>

                <h4 className="mt-0.5 line-clamp-1 text-[12px] font-black leading-snug text-white drop-shadow-sm">
                  {card.headline}
                </h4>

                <p className="mt-0.5 line-clamp-1 text-[9.5px] font-medium leading-tight text-slate-200 drop-shadow-sm">
                  {card.body}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center text-[9px] font-bold text-sky-300">
                    {card.ctaLabel || "보기"} ›
                  </span>
                  <span className="rounded-full bg-white/20 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-semibold text-white/90">
                    {card.badge}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
