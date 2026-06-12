import { fetchPublicDataJson, getFscCorpServiceKey } from "../../lib/publicDataServiceKey.js";

export type FscCorpRecord = {
  corpName: string;
  businessNumber: string;
  ceoName: string;
  address: string;
  telephone: string;
  industry: string;
  source: "fsc_corp_api";
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function formatBusinessNumber(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 10) return String(raw || "").trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function extractFscItems(json: unknown): Record<string, unknown>[] {
  const root = json as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  const body = (response?.body ?? root.body ?? root) as Record<string, unknown>;
  const items = body.items as Record<string, unknown> | undefined;
  if (!items) return [];
  const item = items.item;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  if (item && typeof item === "object") return [item as Record<string, unknown>];
  return [];
}

function basDtCandidates(max = 8): string[] {
  const out: string[] = [];
  const cursor = new Date();
  for (let i = 2; i < max + 2; i += 1) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}${m}${day}`);
  }
  return out;
}

function mapFscRow(row: Record<string, unknown>): FscCorpRecord | null {
  const bno = digitsOnly(pickField(row, ["bzno", "bizno", "businessNumber"]));
  if (bno.length !== 10) return null;
  const corpName = pickField(row, ["corpNm", "enpPbanCmpyNm", "corpEnsnNm"]);
  const ceoName = pickField(row, ["enpRprFnm", "ceoNm", "rprsvNm"]);
  const addr = [pickField(row, ["enpBsadr"]), pickField(row, ["enpDtadr"])].filter(Boolean).join(" ");
  const industry = pickField(row, ["enpMainBizNm", "sicNm", "indsMclsNm", "bizType"]);
  return {
    corpName: corpName || "미확인",
    businessNumber: formatBusinessNumber(bno),
    ceoName,
    address: addr,
    telephone: pickField(row, ["enpTlno", "telno", "phone"]),
    industry: industry || "미확인",
    source: "fsc_corp_api"
  };
}

function scoreName(corpName: string, keyword: string): number {
  const n = corpName.replace(/\s/g, "").toLowerCase();
  const kw = keyword.replace(/\s/g, "").toLowerCase();
  if (!n || !kw) return 0;
  if (n === kw) return 20;
  if (n.includes(kw) || kw.includes(n)) return 14;
  const tokens = kw.split(/\s+/).filter((t) => t.length >= 2);
  let score = 0;
  for (const token of tokens) {
    if (n.includes(token)) score += 4;
  }
  return score;
}

async function fetchFscByBasDt(
  endpoint: string,
  name: string,
  basDt: string,
  max: number
): Promise<FscCorpRecord[]> {
  const res = await fetchPublicDataJson(
    endpoint,
    {
      pageNo: "1",
      numOfRows: String(Math.min(Math.max(max, 1), 30)),
      resultType: "json",
      basDt,
      corpNm: name
    },
    undefined,
    getFscCorpServiceKey()
  );

  if (!res.ok) return [];

  const header = (res.json as { response?: { header?: { resultCode?: string } } })?.response?.header;
  if (header?.resultCode && header.resultCode !== "00") return [];

  return extractFscItems(res.json)
    .map(mapFscRow)
    .filter((row): row is FscCorpRecord => Boolean(row))
    .sort((a, b) => scoreName(b.corpName, name) - scoreName(a.corpName, name));
}

export async function searchFscCorpByName(corpNm: string, max = 15): Promise<FscCorpRecord[]> {
  const name = String(corpNm || "").trim();
  if (!name) return [];

  const endpoint =
    process.env.FSC_CORP_BASIC_API_URL ||
    "https://apis.data.go.kr/1160100/service/GetCorpBasicInfoService_V2/getCorpOutline_V2";

  const dates = basDtCandidates(4);
  const batches = await Promise.all(dates.map((basDt) => fetchFscByBasDt(endpoint, name, basDt, max)));
  const merged = new Map<string, FscCorpRecord>();
  for (const rows of batches) {
    for (const row of rows) merged.set(row.businessNumber, row);
  }
  return [...merged.values()].slice(0, max);
}
