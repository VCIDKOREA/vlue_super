import { fetchPublicDataJson } from "../../lib/publicDataServiceKey.js";

export type SbizStoreHit = {
  storeName: string;
  branchName: string;
  address: string;
  industry: string;
  latitude: number;
  longitude: number;
  source: "sbiz_radius_api";
};

function normalizeName(raw: string): string {
  return String(raw || "").replace(/\s/g, "").toLowerCase();
}

function scoreName(storeName: string, keyword: string): number {
  const name = normalizeName(storeName);
  const kw = normalizeName(keyword);
  if (!name || !kw) return 0;
  if (name === kw) return 20;
  if (name.includes(kw) || kw.includes(name)) return 14;
  const tokens = kw.split(/\s+/).filter((t) => t.length >= 2);
  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 4;
  }
  return score;
}

function mapRow(row: Record<string, unknown>): SbizStoreHit | null {
  const storeName = String(row.bizesNm || "").trim();
  if (!storeName) return null;
  const industry = [
    String(row.indsLclsNm || "").trim(),
    String(row.indsMclsNm || "").trim(),
    String(row.indsSclsNm || "").trim()
  ]
    .filter(Boolean)
    .join(" > ");

  return {
    storeName,
    branchName: String(row.brchNm || "").trim(),
    address: String(row.rdnmAdr || row.lnoAdr || "").trim(),
    industry: industry || "미확인",
    latitude: Number(row.lat || 0),
    longitude: Number(row.lon || 0),
    source: "sbiz_radius_api"
  };
}

export async function searchSbizStoresInRadius(input: {
  longitude: number;
  latitude: number;
  storeName?: string;
  radiusM?: number;
  max?: number;
}): Promise<SbizStoreHit[]> {
  const cx = Number(input.longitude);
  const cy = Number(input.latitude);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) return [];

  const endpoint =
    process.env.SBIZ_STORE_RADIUS_API_URL ||
    "http://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius";

  const radiusM = Math.min(Math.max(input.radiusM ?? 2000, 300), 10000);
  const max = Math.min(Math.max(input.max ?? 15, 1), 50);
  const keyword = String(input.storeName || "").trim();

  const res = await fetchPublicDataJson(endpoint, {
    pageNo: "1",
    numOfRows: String(Math.min(max * 8, 500)),
    type: "json",
    radius: String(radiusM),
    cx: String(cx),
    cy: String(cy)
  });

  if (!res.ok) return [];

  const items = (res.json as { body?: { items?: Array<Record<string, unknown>> } })?.body?.items;
  if (!Array.isArray(items)) return [];

  const parsed = items
    .map(mapRow)
    .filter((row): row is SbizStoreHit => Boolean(row))
    .map((row) => ({ row, score: keyword ? scoreName(row.storeName, keyword) : 1 }))
    .filter((entry) => (keyword ? entry.score >= 8 : true))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.row);

  return parsed.slice(0, max);
}
