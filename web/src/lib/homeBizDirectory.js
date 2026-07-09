import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { resolveLetteringDemoLogoUrl } from "./letteringDemoAssets.js";

export const BIZ_DIRECTORY_CATEGORIES = [
  { id: "food", label: "식음료", subcats: ["커피", "중식", "브런치", "레스토랑", "패스트푸드", "야식", "분식", "한식", "치킨", "피자"] },
  { id: "beautyFashion", label: "뷰티·패션", subcats: ["여성의류", "남성의류", "브랜드", "네일", "올리브영", "선케어", "태닝", "왁싱", "미용실"] },
  { id: "education", label: "교육", subcats: ["태권도", "영수학원", "과외", "인터넷강의", "초등교육", "중등교육", "고등교육", "교육과제물"] },
  { id: "repair", label: "정비", subcats: ["자동차정비", "이륜차정비", "튜닝", "용품"] },
  { id: "recruit", label: "채용", subcats: ["공식 채용정보", "구인업체", "구직지원"] },
  { id: "medical", label: "의료", subcats: ["종합병원", "대학병원", "요양병원", "소아과", "내과", "외과", "피부과", "성형외과"] }
];

function cardFor(org, name, title, department, phone, website = "") {
  return normalizeLetteringCard({
    organization: org,
    name,
    displayName: name,
    title,
    department,
    phone,
    website,
    membershipTier: "paid",
    designTemplate: "classic-light",
    logoUrl: resolveLetteringDemoLogoUrl({ organization: org }),
    feedType: "company"
  });
}

/** 노출 허용(publicExposure) 업체만 검색·명함 조회 대상 */
export const BIZ_DIRECTORY_BASE = [
  {
    id: "biz-food-1",
    categoryId: "food",
    categoryLabel: "식음료",
    subcat: "커피",
    name: "소울 커피 로스터스",
    popular: 97,
    distance: 0.2,
    rating: 4.9,
    likes: 2210,
    roomId: "subscribe:soul-cafe",
    phone: "02-1234-5678",
    address: "서울 강남구 테헤란로 12",
    intro: "스페셜티 원두와 브런치가 강점인 카페",
    menu: ["시그니처 라떼", "플랫화이트", "바질 샌드위치"],
    showcaseTags: ["#소금빵", "#대구소금빵"],
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80",
    publicExposure: true,
    card: cardFor("소울 커피 로스터스", "김소울", "매니저", "운영팀", "02-1234-5678", "soulcoffee.kr")
  },
  {
    id: "biz-food-2",
    categoryId: "food",
    categoryLabel: "식음료",
    subcat: "중식",
    name: "청담 만리장성",
    popular: 88,
    distance: 0.8,
    rating: 4.6,
    likes: 980,
    roomId: "friends:friend-kim",
    phone: "02-7777-1111",
    address: "서울 강남구 청담동 100",
    intro: "직화 짜장과 탕수육이 인기인 중식당",
    menu: ["유니짜장", "탕수육", "고추잡채"],
    img: "https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?w=900&q=80",
    publicExposure: true,
    card: cardFor("청담 만리장성", "이청담", "점장", "홀운영", "02-7777-1111")
  },
  {
    id: "biz-beauty-1",
    categoryId: "beautyFashion",
    categoryLabel: "뷰티·패션",
    subcat: "미용실",
    name: "청담 헤어 라운지",
    popular: 98,
    distance: 0.3,
    rating: 4.9,
    likes: 1240,
    roomId: "subscribe:blue-repair",
    phone: "02-1111-2222",
    address: "서울 강남구 청담로 21",
    intro: "예약 기반 프리미엄 헤어 디자인",
    menu: ["컷/펌", "컬러", "클리닉"],
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
    publicExposure: true,
    card: cardFor("청담 헤어 라운지", "박디자인", "수석 디자이너", "헤어팀", "02-1111-2222")
  },
  {
    id: "biz-edu-1",
    categoryId: "education",
    categoryLabel: "교육",
    subcat: "영수학원",
    name: "강남 영수 에이스",
    popular: 90,
    distance: 1.4,
    rating: 4.7,
    likes: 760,
    roomId: "friends:brother",
    phone: "02-3333-4444",
    address: "서울 강남구 역삼동 77",
    intro: "초중고 영수 집중 코칭",
    menu: ["중등 수학", "고등 영어", "내신 대비"],
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80",
    publicExposure: true,
    card: cardFor("강남 영수 에이스", "최원장", "원장", "입시팀", "02-3333-4444")
  },
  {
    id: "biz-repair-1",
    categoryId: "repair",
    categoryLabel: "정비",
    subcat: "자동차정비",
    name: "블루 모터스",
    popular: 95,
    distance: 0.6,
    rating: 4.8,
    likes: 1120,
    roomId: "subscribe:blue-repair",
    phone: "02-4444-5555",
    address: "서울 강남구 논현로 90",
    intro: "국산/수입차 경정비 전문",
    menu: ["엔진오일", "브레이크 점검", "타이어 정렬"],
    img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=900&q=80",
    publicExposure: true,
    card: cardFor("블루 모터스", "정정비", "공업사장", "정비팀", "02-4444-5555", "bluemotors.kr")
  },
  {
    id: "biz-recruit-1",
    categoryId: "recruit",
    categoryLabel: "채용",
    subcat: "공식 채용정보",
    name: "커리어 센터",
    popular: 89,
    distance: 1.2,
    rating: 4.7,
    likes: 680,
    roomId: "subscribe:career-center",
    phone: "02-5555-6666",
    address: "서울 강남구 선릉로 55",
    intro: "공식 채용공고와 면접 매칭 지원",
    menu: ["채용 상담", "이력서 코칭", "면접 대비"],
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80",
    publicExposure: true,
    card: cardFor("커리어 센터", "한매니저", "채용 매니저", "HR팀", "02-5555-6666")
  },
  {
    id: "biz-med-1",
    categoryId: "medical",
    categoryLabel: "의료",
    subcat: "내과",
    name: "강남 메디컬 내과",
    popular: 94,
    distance: 0.5,
    rating: 4.8,
    likes: 920,
    roomId: "work:park",
    phone: "02-6666-7777",
    address: "서울 강남구 강남대로 130",
    intro: "건강검진과 만성질환 진료 중심",
    menu: ["검진센터", "내과진료", "영양수액"],
    img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=80",
    publicExposure: true,
    card: cardFor("강남 메디컬 내과", "윤내과", "과장", "내과", "02-6666-7777")
  },
  {
    id: "biz-hidden-1",
    categoryId: "food",
    categoryLabel: "식음료",
    subcat: "브런치",
    name: "비공개 테스트 카페",
    popular: 50,
    distance: 2.0,
    rating: 4.0,
    likes: 10,
    roomId: "",
    phone: "02-0000-0000",
    address: "비공개",
    intro: "노출 미허용 샘플",
    menu: [],
    img: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&q=80",
    publicExposure: false,
    card: cardFor("비공개 테스트", "비공개", "—", "—", "02-0000-0000")
  }
];

function normalizeExposedPost(p) {
  if (!p || p.publicExposure === false) return null;
  const org = String(p.name || p.organization || "활동 등록 업체").trim();
  return {
    id: p.id || `cp-${Math.random().toString(36).slice(2)}`,
    categoryId: p.categoryId || "food",
    categoryLabel: BIZ_DIRECTORY_CATEGORIES.find((c) => c.id === p.categoryId)?.label || "기타",
    subcat: p.subcat || "",
    name: org,
    popular: Number(p.popular || 80),
    distance: Number(p.distance || 0.5),
    rating: Number(p.rating || 4.5),
    likes: Number(p.likes || 0),
    roomId: p.roomId || "",
    phone: p.phone || "",
    address: p.address || "",
    intro: String(p.intro || ""),
    menu: Array.isArray(p.menu) ? p.menu : [],
    img: String(p.img || ""),
    publicExposure: true,
    card: p.card || cardFor(org, "담당자", "매니저", p.subcat || "", p.phone || "")
  };
}

export function buildSearchableBusinesses(categoryExposedPosts = []) {
  const fromPosts = (Array.isArray(categoryExposedPosts) ? categoryExposedPosts : [])
    .map(normalizeExposedPost)
    .filter(Boolean);
  const base = BIZ_DIRECTORY_BASE.filter((b) => b.publicExposure !== false);
  const seen = new Set(base.map((b) => b.id));
  const merged = [...base];
  for (const p of fromPosts) {
    if (!seen.has(p.id)) merged.push(p);
  }
  return merged;
}

function tokenize(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchScore(biz, tokens) {
  if (!tokens.length) return 1;
  const tagBlob = (Array.isArray(biz.showcaseTags) ? biz.showcaseTags : [])
    .map((t) => String(t).toLowerCase())
    .join(" ");
  const blob = [
    biz.name,
    biz.subcat,
    biz.categoryLabel,
    biz.intro,
    biz.card?.organization,
    biz.card?.name,
    biz.card?.title,
    biz.card?.department,
    tagBlob,
    ...(biz.menu || [])
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const t of tokens) {
    const bare = t.replace(/^#/, "");
    if (blob.includes(t) || (bare && blob.includes(bare))) score += 2;
    if (biz.name.toLowerCase().includes(t) || (bare && biz.name.toLowerCase().includes(bare))) score += 3;
    if (biz.subcat.toLowerCase().includes(t)) score += 2;
    if (tagBlob && (tagBlob.includes(t) || (bare && tagBlob.includes(`#${bare}`)) || (bare && tagBlob.includes(bare)))) {
      score += 5;
    }
  }
  return score;
}

export function searchBusinessDirectory(query, { sort = "popular", categoryExposedPosts = [] } = {}) {
  const tokens = tokenize(query);
  const all = buildSearchableBusinesses(categoryExposedPosts);
  let results = all;
  if (tokens.length) {
    results = all
      .map((b) => ({ biz: b, score: matchScore(b, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.biz);
  }
  const arr = [...results];
  if (sort === "distance") {
    arr.sort((a, b) => a.distance - b.distance);
  } else {
    arr.sort((a, b) => b.popular - a.popular);
  }
  return arr;
}

export function suggestIndustries(query, { limit = 8 } = {}) {
  const tokens = tokenize(query);
  const q = tokens.join(" ");
  const bareQ = q.replace(/^#/, "").toLowerCase();
  const items = [];

  const tagHints = new Set();
  if (bareQ) {
    for (const biz of BIZ_DIRECTORY_BASE) {
      for (const tag of biz.showcaseTags || []) {
        const t = String(tag).trim();
        if (!t) continue;
        const normalized = t.startsWith("#") ? t : `#${t}`;
        const bare = normalized.slice(1).toLowerCase();
        if (bare.includes(bareQ) || normalized.toLowerCase().includes(q.toLowerCase())) {
          tagHints.add(normalized);
        }
      }
    }
  }
  for (const tag of tagHints) {
    items.push({ type: "hashtag", label: tag, value: tag });
  }

  for (const cat of BIZ_DIRECTORY_CATEGORIES) {
    if (!q || cat.label.toLowerCase().includes(q)) {
      items.push({ type: "category", label: cat.label, value: cat.label, categoryId: cat.id });
    }
    for (const sub of cat.subcats) {
      if (!q || sub.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)) {
        items.push({ type: "subcat", label: `${cat.label} · ${sub}`, value: sub, categoryId: cat.id, subcat: sub });
      }
    }
  }
  const seen = new Set();
  return items
    .filter((it) => {
      const k = it.label;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}
