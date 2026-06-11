import { fetchPublicDataJson, getSmallBusinessStoreServiceKey } from "../../lib/publicDataServiceKey.js";
import { searchSbizStoresInRadius } from "./sbizStoreRadiusSearch.js";

export type SmallBusinessMatch = {
  storeName: string;
  businessNumber: string;
  address: string;
  telephone: string;
  industry: string;
  source: "small_business_api" | "sbiz_store_api";
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function normalizePhone(raw: string) {
  return digitsOnly(raw);
}

function formatBusinessNumber(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 10) return raw.trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function extractRows(json: unknown): Record<string, unknown>[] {
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const body = root.body as Record<string, unknown> | undefined;
  const items = body?.items;
  if (Array.isArray(items)) return items as Record<string, unknown>[];
  const item = body?.item;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  if (item && typeof item === "object") return [item as Record<string, unknown>];
  return [];
}

function scoreRow(
  row: Record<string, unknown>,
  targetName: string,
  targetPhone: string,
  targetAddress: string
): number {
  const name = pickField(row, ["bizesNm", "상호명", "storeName", "name", "cmpnmNm"]);
  const phone = normalizePhone(pickField(row, ["telno", "전화번호", "phone", "tel"]));
  const addr = pickField(row, ["rdnmadr", "도로명주소", "roadAddress", "lnoAdr", "지번주소", "addr"]);
  let score = 0;
  const tn = targetName.replace(/\s/g, "");
  const nn = name.replace(/\s/g, "");
  if (tn && nn && (nn.includes(tn) || tn.includes(nn))) score += 5;
  if (targetPhone && phone && phone === targetPhone) score += 6;
  if (targetAddress && addr && (addr.includes(targetAddress) || targetAddress.includes(addr))) score += 3;
  return score;
}

function mapStoreRow(row: Record<string, unknown>, fallbackName: string, fallbackAddress: string, fallbackPhone: string): SmallBusinessMatch | null {
  const bno = pickField(row, [
    "bizno",
    "lcadBrn",
    "brn",
    "businessRegistrationNo",
    "사업자등록번호",
    "srbid"
  ]);
  const digits = digitsOnly(bno);
  if (digits.length !== 10) return null;

  return {
    storeName: pickField(row, ["bizesNm", "상호명", "storeName", "name"]) || fallbackName,
    businessNumber: formatBusinessNumber(digits),
    address: pickField(row, ["rdnmadr", "도로명주소", "roadAddress", "lnoAdr", "지번주소"]) || fallbackAddress,
    telephone: pickField(row, ["telno", "전화번호", "phone"]) || fallbackPhone,
    industry: pickField(row, ["indsMclsNm", "indsSclsNm", "업종", "indutyMclsNm"]),
    source: "small_business_api"
  };
}

export type SmallBusinessStoreHit = SmallBusinessMatch & {
  ceoName: string;
  score: number;
};

function pickCeoName(row: Record<string, unknown>): string {
  return pickField(row, ["rprsvNm", "reprntNm", "brnChrgNm", "ceoNm", "대표자명", "rprsntvNm"]);
}

function sbdcEndpoint(): string {
  return (
    process.env.SMALL_BUSINESS_STORE_API_URL ||
    "https://api.odcloud.kr/api/sbdcStoreInfoService/v1/getStoreInfo"
  );
}

function isSbdcUnregistered(json: unknown): boolean {
  const row = json as Record<string, unknown>;
  return String(row.code ?? "") === "-3";
}

async function searchSbdcStoresByName(name: string, max: number): Promise<SmallBusinessStoreHit[]> {
  const endpoint = sbdcEndpoint();
  const attempts: Record<string, string>[] = [
    { page: "1", perPage: String(Math.min(max * 2, 40)), returnType: "JSON", cond: `상호명::LIKE:${name}` },
    { page: "1", perPage: String(Math.min(max * 2, 40)), returnType: "JSON", cond: `bizesNm::LIKE:${name}` },
    { page: "1", perPage: String(Math.min(max * 2, 40)), returnType: "JSON", q: name }
  ];

  const seen = new Set<string>();
  const hits: SmallBusinessStoreHit[] = [];

  for (const params of attempts) {
    const res = await fetchPublicDataJson(endpoint, params, undefined, getSmallBusinessStoreServiceKey());
    if (!res.ok) {
      if (isSbdcUnregistered(res.json)) break;
      continue;
    }

    for (const row of extractRows(res.json)) {
      const mapped = mapStoreRow(row, name, "", "");
      if (!mapped) continue;
      const key = digitsOnly(mapped.businessNumber);
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        ...mapped,
        ceoName: pickCeoName(row),
        score: scoreRow(row, name, "", "")
      });
    }
    if (hits.length >= max) break;
  }

  return hits;
}

function scoreSbizName(storeName: string, keyword: string): number {
  const n = storeName.replace(/\s/g, "").toLowerCase();
  const kw = keyword.replace(/\s/g, "").toLowerCase();
  if (!n || !kw) return 0;
  if (n.includes(kw) || kw.includes(n)) return 12;
  return 0;
}

async function searchSbizStoresByName(
  name: string,
  max: number,
  context?: { latitude?: number | null; longitude?: number | null }
): Promise<SmallBusinessStoreHit[]> {
  const lat = context?.latitude;
  const lng = context?.longitude;
  if (lat == null || lng == null) return [];

  const rows = await searchSbizStoresInRadius({
    latitude: lat,
    longitude: lng,
    storeName: name,
    max: max * 2,
    radiusM: 5000
  });

  return rows
    .map((row) => ({
      storeName: row.storeName,
      businessNumber: "",
      address: row.address,
      telephone: "",
      industry: row.industry,
      source: "sbiz_store_api" as const,
      ceoName: "",
      score: scoreSbizName(row.storeName, name)
    }))
    .filter((row) => row.score > 0)
    .slice(0, max);
}

export async function searchSmallBusinessStoresByName(
  storeName: string,
  max = 15,
  context?: { latitude?: number | null; longitude?: number | null }
): Promise<SmallBusinessStoreHit[]> {
  const name = String(storeName || "").trim();
  if (!name) return [];

  const sbdcHits = await searchSbdcStoresByName(name, max);
  if (sbdcHits.length) return sbdcHits.sort((a, b) => b.score - a.score).slice(0, max);

  return searchSbizStoresByName(name, max, context);
}

export async function findSmallBusinessStore(input: {
  storeName: string;
  telephone: string;
  roadAddress: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<SmallBusinessMatch | null> {
  const endpoint = sbdcEndpoint();

  const name = String(input.storeName || "").trim();
  const phone = normalizePhone(input.telephone);
  const address = String(input.roadAddress || "").trim();
  if (!name && !phone && !address) return null;

  const attempts: Record<string, string>[] = [
    { page: "1", perPage: "20", returnType: "JSON", cond: `상호명::LIKE:${name}` },
    { page: "1", perPage: "20", returnType: "JSON", cond: `도로명주소::LIKE:${address}` },
    { page: "1", perPage: "20", returnType: "JSON", q: name }
  ];

  let best: { row: Record<string, unknown>; score: number } | null = null;

  for (const params of attempts) {
    const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => String(v).trim()));
    if (!Object.keys(filtered).length) continue;

    const res = await fetchPublicDataJson(endpoint, filtered, undefined, getSmallBusinessStoreServiceKey());
    if (!res.ok) {
      if (isSbdcUnregistered(res.json)) break;
      continue;
    }

    for (const row of extractRows(res.json)) {
      const score = scoreRow(row, name, phone, address);
      if (!best || score > best.score) best = { row, score };
    }
    if (best && best.score >= 6) break;
  }

  if (best && best.score >= 3) {
    return mapStoreRow(best.row, name, address, input.telephone);
  }

  const [sbizHit] = await searchSbizStoresByName(name, 1, input);
  if (!sbizHit) return null;

  return {
    storeName: sbizHit.storeName,
    businessNumber: "",
    address: sbizHit.address || address,
    telephone: input.telephone,
    industry: sbizHit.industry,
    source: "sbiz_store_api"
  };
}
