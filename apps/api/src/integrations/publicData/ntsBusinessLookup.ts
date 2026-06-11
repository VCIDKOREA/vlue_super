import { fetchPublicDataJson, postPublicDataJson } from "../../lib/publicDataServiceKey.js";

export type NtsBusinessDetail = {
  businessNumber: string;
  businessStatus: string;
  bizType: string;
  bizItem: string;
  statusCode: string;
  source: "nts_api" | "mock";
};

const STATUS_LABEL: Record<string, string> = {
  "01": "계속사업자",
  "02": "휴업자",
  "03": "폐업자"
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function formatBusinessNumber(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 10) return raw.trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function mapStatusLabel(code: string, fallback?: string): string {
  const c = String(code || "").padStart(2, "0");
  return STATUS_LABEL[c] || String(fallback || "미확인").trim() || "미확인";
}

function parseNtsRow(row: Record<string, unknown>, bno: string): NtsBusinessDetail {
  const statusCode = String(row.b_stt_cd || row.tax_type_cd || row.status || "01").padStart(2, "0");
  const statusText = mapStatusLabel(statusCode, String(row.b_stt || row.tax_type || ""));
  const bizType = String(row.tax_type || row.b_stt || row.biz_type || "일반과세").trim();
  const bizItem = String(
    row.rbf_tax_type || row.tax_type_cd_nm || row.indsSclsNm || row.indutyMclsNm || row.biz_item || ""
  ).trim();

  return {
    businessNumber: formatBusinessNumber(bno),
    businessStatus: statusText,
    bizType: bizType || "미확인",
    bizItem: bizItem || "미확인",
    statusCode,
    source: "nts_api"
  };
}

export async function lookupNtsBusinessByNumber(businessNumber: string): Promise<NtsBusinessDetail | null> {
  const bno = digitsOnly(businessNumber);
  if (bno.length !== 10) return null;

  const endpoint =
    process.env.NTS_BUSINESS_STATUS_API_URL ||
    "https://api.odcloud.kr/api/nts-businessman/v1/status";

  const postRes = await postPublicDataJson(endpoint, { returnType: "JSON" }, { b_no: [bno] });
  if (postRes.ok) {
    const rows = extractNtsRows(postRes.json);
    if (rows[0]) return parseNtsRow(rows[0], bno);
  }

  const getRes = await fetchPublicDataJson(endpoint, { returnType: "JSON", b_no: bno });
  if (getRes.ok) {
    const rows = extractNtsRows(getRes.json);
    if (rows[0]) return parseNtsRow(rows[0], bno);
  }

  return null;
}

function extractNtsRows(json: unknown): Record<string, unknown>[] {
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const items = root.items;
  if (Array.isArray(items)) return items as Record<string, unknown>[];
  return [];
}
