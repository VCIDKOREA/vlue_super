import { naverCoordsFromRaw } from "../../lib/mapInfo.js";

export type NaverLocalItem = {
  title: string;
  telephone: string;
  roadAddress: string;
  address: string;
  category: string;
  link: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  categoryTags: string[];
  rank: number;
};

function stripHtmlTags(raw: string): string {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) {
    if (digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 8 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  const trimmed = String(raw || "").trim();
  return trimmed;
}

function scoreNaverItem(item: Record<string, string>, keyword: string): number {
  const title = stripHtmlTags(item.title || "").replace(/\s/g, "").toLowerCase();
  const kw = String(keyword || "").replace(/\s/g, "").toLowerCase();
  const tokens = String(keyword || "")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  let score = 0;
  if (kw && title.includes(kw)) score += 12;
  for (const token of tokens) {
    const compact = token.replace(/\s/g, "");
    if (compact && title.includes(compact)) score += 4;
  }
  if (normalizePhone(item.telephone || "")) score += 2;
  if (naverCoordsFromRaw(item.mapx, item.mapy)) score += 1;
  return score;
}

function parseNaverItem(item: Record<string, string>, keyword: string, rank: number): NaverLocalItem {
  const roadAddress = stripHtmlTags(item.roadAddress || item.address || "");
  const address = stripHtmlTags(item.address || roadAddress);
  const category = stripHtmlTags(item.category || "");
  const coords = naverCoordsFromRaw(item.mapx, item.mapy);
  const categoryTags = category
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title: stripHtmlTags(item.title || keyword),
    telephone: normalizePhone(item.telephone || ""),
    roadAddress: roadAddress || address,
    address,
    category,
    link: String(item.link || "").trim(),
    description: stripHtmlTags(item.description || ""),
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    categoryTags,
    rank
  };
}

async function fetchNaverLocalItems(keyword: string, display = 10): Promise<Record<string, string>[]> {
  const clientId = String(process.env.NAVER_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.NAVER_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return [];

  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", String(Math.min(Math.max(display, 1), 10)));
  url.searchParams.set("sort", "comment");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        Accept: "application/json"
      }
    });
    const json = (await res.json().catch(() => ({}))) as {
      items?: Array<Record<string, string>>;
    };
    if (!res.ok) return [];
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

/** 네이버 API 노출 순서(관련도) 그대로, 관련 결과만 반환 */
export async function searchNaverLocalList(keyword: string, max = 10): Promise<NaverLocalItem[]> {
  const items = await fetchNaverLocalItems(keyword, max);
  const q = String(keyword || "").trim();
  const parsed = items.map((item, index) => parseNaverItem(item, q, index + 1));

  const relevant = parsed.filter((item, index) => scoreNaverItem(items[index]!, q) > 0);
  return relevant.length ? relevant : parsed.slice(0, 1);
}

export async function searchNaverLocal(keyword: string): Promise<NaverLocalItem | null> {
  const list = await searchNaverLocalList(keyword, 10);
  return list[0] ?? null;
}
