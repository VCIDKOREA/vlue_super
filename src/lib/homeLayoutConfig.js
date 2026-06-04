export const HQ_HOME_LAYOUT_CHANGED = "vlue-home-layout-changed";
export const HQ_HOME_LAYOUT_CACHE_KEY = "vlue_home_layout_live_v1";

export const DEFAULT_HOME_LAYOUT = {
  vluePick: [
    {
      id: "ad-myeonggyeong",
      subLabel: "의료",
      title: "성주 명경체용양병원",
      tagline: "정형·재활·체형교정, 성주 지역 맞춤 케어",
      cta: "병원 소개",
      imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80"
    },
    {
      id: "ad-jhtc",
      subLabel: "글로벌 HR",
      title: "JHTC 글로벌 네트워크 센터",
      tagline: "캄보디아 기술학교 연계 · 교육·파견·채용",
      cta: "사업 안내",
      imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80"
    },
    {
      id: "ad-humancurating",
      subLabel: "PG",
      title: "휴먼큐레이팅 (PG사)",
      tagline: "결제·정산 자동화 파트너",
      cta: "서비스 소개",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80"
    }
  ],
  aiRecommend: [
    { id: "r1", tag: "동네", title: "강남역 야경 카페 5곳", desc: "AI가 골랐어요 · 오늘의 픽", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80" },
    { id: "r2", tag: "전국", title: "이번 주 핫한 보안 트렌드", desc: "큐레이션 · 3분 요약", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" },
    { id: "r3", tag: "동네", title: "역삼 골목 맛집 지도", desc: "거리 기반 추천", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80" }
  ],
  hotPlaces: [
    { id: "l1", name: "청담 헤어 라운지", distance: 0.3, rating: 4.9, likes: 1240, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80", tag: "오늘의 매장" },
    { id: "l2", name: "역삼 브런치 하우스", distance: 0.6, rating: 4.7, likes: 980, img: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&q=80", tag: "인기" },
    { id: "l3", name: "강남 필라테스", distance: 1.1, rating: 4.8, likes: 860, img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80", tag: "주변" },
    { id: "l4", name: "논현 꽃집 블루", distance: 1.4, rating: 4.6, likes: 770, img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&q=80", tag: "추천" }
  ],
  categories: [
    { id: "food", label: "식음료", emoji: "☕" },
    { id: "beautyFashion", label: "뷰티·패션", emoji: "✨" },
    { id: "education", label: "교육", emoji: "📚" },
    { id: "repair", label: "정비", emoji: "🔧" },
    { id: "recruit", label: "채용", emoji: "💼" },
    { id: "medical", label: "의료", emoji: "🏥" }
  ]
};

function pickSection(partialItems, defaultItems, minLen = 1) {
  if (!Array.isArray(partialItems) || partialItems.length < minLen) return structuredClone(defaultItems);
  return partialItems;
}

export function mergeHomeLayout(partial) {
  if (!partial || typeof partial !== "object") return structuredClone(DEFAULT_HOME_LAYOUT);
  return {
    vluePick: pickSection(partial.vluePick, DEFAULT_HOME_LAYOUT.vluePick),
    aiRecommend: pickSection(partial.aiRecommend, DEFAULT_HOME_LAYOUT.aiRecommend),
    hotPlaces: pickSection(partial.hotPlaces, DEFAULT_HOME_LAYOUT.hotPlaces),
    categories: pickSection(partial.categories, DEFAULT_HOME_LAYOUT.categories)
  };
}

export function readCachedHomeLayout() {
  try {
    const raw = localStorage.getItem(HQ_HOME_LAYOUT_CACHE_KEY);
    if (!raw) return null;
    return mergeHomeLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeCachedHomeLayout(layout) {
  try {
    localStorage.setItem(HQ_HOME_LAYOUT_CACHE_KEY, JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent(HQ_HOME_LAYOUT_CHANGED, { detail: layout }));
  } catch {
    /* ignore */
  }
}
