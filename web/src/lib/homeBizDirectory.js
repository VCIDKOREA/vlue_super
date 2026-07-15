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

/** 데모 업체 목록 — 프로덕션에서는 비움. 실제 검색은 쇼케이스 API. */
export const BIZ_DIRECTORY_BASE = [];

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
  const seen = new Set();
  const merged = [];
  for (const p of fromPosts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
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

function phoneDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function matchScore(biz, tokens) {
  if (!tokens.length) return 1;
  const tagBlob = (Array.isArray(biz.showcaseTags) ? biz.showcaseTags : [])
    .map((t) => String(t).toLowerCase())
    .join(" ");
  const phoneBlob = phoneDigits(biz.phone || biz.card?.phone || "");
  const blob = [
    biz.name,
    biz.subcat,
    biz.categoryLabel,
    biz.intro,
    biz.card?.organization,
    biz.card?.name,
    biz.card?.title,
    biz.card?.department,
    biz.publicHandle,
    tagBlob,
    ...(biz.menu || [])
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const t of tokens) {
    const bare = t.replace(/^#/, "");
    const tDigits = phoneDigits(t);
    if (blob.includes(t) || (bare && blob.includes(bare))) score += 2;
    if (biz.name.toLowerCase().includes(t) || (bare && biz.name.toLowerCase().includes(bare))) score += 3;
    if (biz.subcat.toLowerCase().includes(t)) score += 2;
    if (tDigits.length >= 4 && phoneBlob.includes(tDigits)) score += 6;
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
  const items = [];

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
