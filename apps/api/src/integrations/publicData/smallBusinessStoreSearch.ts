import { fetchPublicDataJson } from "../../lib/publicDataServiceKey.js";

export type SmallBusinessMatch = {
  storeName: string;
  businessNumber: string;
  address: string;
  telephone: string;
  industry: string;
  source: "small_business_api";
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

export async function findSmallBusinessStore(input: {
  storeName: string;
  telephone: string;
  roadAddress: string;
}): Promise<SmallBusinessMatch | null> {
  const endpoint =
    process.env.SMALL_BUSINESS_STORE_API_URL ||
    "https://api.odcloud.kr/api/sbdcStoreInfoService/v1/getStoreInfo";

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

    const res = await fetchPublicDataJson(endpoint, filtered);
    if (!res.ok) continue;

    for (const row of extractRows(res.json)) {
      const score = scoreRow(row, name, phone, address);
      if (!best || score > best.score) best = { row, score };
    }
    if (best && best.score >= 6) break;
  }

  if (!best || best.score < 3) return null;

  const bno = pickField(best.row, [
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
    storeName: pickField(best.row, ["bizesNm", "상호명", "storeName", "name"]) || name,
    businessNumber: formatBusinessNumber(digits),
    address: pickField(best.row, ["rdnmadr", "도로명주소", "roadAddress"]) || address,
    telephone: pickField(best.row, ["telno", "전화번호", "phone"]) || input.telephone,
    industry: pickField(best.row, ["indsMclsNm", "indsSclsNm", "업종", "indutyMclsNm"]),
    source: "small_business_api"
  };
}
