import {
  fetchPublicDataJson,
  getPublicDataServiceKey,
  postPublicDataJson
} from "../../lib/publicDataServiceKey.js";

export type NtsVerifyInput = {
  businessRegistrationNo: string;
  representativeName: string;
  openDate: string;
};

export type NtsVerifyResult = {
  ok: boolean;
  statusCode: string;
  statusLabel: string;
  matched: boolean;
  source: "nts_api" | "mock";
  reason?: string;
  /** 국세청 응답에 상호/개업일/대표가 있으면 참고용 */
  ntsCompanyName?: string;
  ntsOpenDate?: string;
  ntsRepresentativeName?: string;
};

const ACTIVE_CODES = new Set(["01"]);
const ACTIVE_LABELS: Record<string, string> = {
  "01": "계속사업자",
  "02": "휴업자",
  "03": "폐업자"
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function normalizeOpenDate(raw: string) {
  const d = digitsOnly(raw);
  if (d.length === 8) return d;
  if (d.length === 6) return `20${d}`;
  return d;
}

function normalizeName(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function extractNtsRows(json: unknown): Record<string, unknown>[] {
  const root = (json || {}) as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
  return [];
}

function mapRowToResult(
  row: Record<string, unknown>,
  input: NtsVerifyInput,
  source: "nts_api" | "mock"
): NtsVerifyResult {
  const statusCode = String(row.b_stt_cd || row.tax_type_cd || row.status || "").padStart(2, "0");
  const statusLabel =
    ACTIVE_LABELS[statusCode] || String(row.b_stt || row.tax_type || "미확인").trim() || "미확인";
  const ntsRep = String(row.p_nm || row.repr_nm || "").trim();
  const ntsOpen = normalizeOpenDate(String(row.start_dt || row.opn_dt || ""));
  const ntsName = String(row.t_nm || row.company || row.corp_nm || "").trim();

  const repOk = !ntsRep || normalizeName(ntsRep) === normalizeName(input.representativeName);
  const openOk = !ntsOpen || ntsOpen === normalizeOpenDate(input.openDate);
  const active = ACTIVE_CODES.has(statusCode);

  return {
    ok: active && repOk && openOk,
    statusCode: statusCode || "00",
    statusLabel,
    matched: repOk && openOk,
    source,
    reason: !active
      ? statusCode === "02"
        ? "SUSPENDED_BUSINESS"
        : statusCode === "03"
          ? "CLOSED_BUSINESS"
          : "NOT_CONTINUING_BUSINESS"
      : !repOk || !openOk
        ? "FIELD_MISMATCH"
        : undefined,
    ntsCompanyName: ntsName || undefined,
    ntsOpenDate: ntsOpen || undefined,
    ntsRepresentativeName: ntsRep || undefined
  };
}

async function callDataGoKrNts(input: NtsVerifyInput): Promise<NtsVerifyResult | null> {
  if (!getPublicDataServiceKey()) return null;

  const endpoint =
    process.env.NTS_BUSINESS_STATUS_API_URL ||
    "https://api.odcloud.kr/api/nts-businessman/v1/status";
  const bno = digitsOnly(input.businessRegistrationNo);

  const postRes = await postPublicDataJson(endpoint, { returnType: "JSON" }, { b_no: [bno] });
  if (postRes.ok) {
    const rows = extractNtsRows(postRes.json);
    if (!rows[0]) {
      return {
        ok: false,
        statusCode: "00",
        statusLabel: "조회결과없음",
        matched: false,
        source: "nts_api",
        reason: "NOT_FOUND"
      };
    }
    return mapRowToResult(rows[0]!, input, "nts_api");
  }

  const getRes = await fetchPublicDataJson(endpoint, { returnType: "JSON", b_no: bno });
  if (getRes.ok) {
    const rows = extractNtsRows(getRes.json);
    if (!rows[0]) {
      return {
        ok: false,
        statusCode: "00",
        statusLabel: "조회결과없음",
        matched: false,
        source: "nts_api",
        reason: "NOT_FOUND"
      };
    }
    return mapRowToResult(rows[0]!, input, "nts_api");
  }

  return {
    ok: false,
    statusCode: "ERR",
    statusLabel: "조회실패",
    matched: false,
    source: "nts_api",
    reason:
      getPublicDataServiceKey() && (postRes.status === 0 || getRes.status === 0)
        ? "NTS_API_EXCEPTION"
        : "NTS_API_HTTP_ERROR"
  };
}

function mockNtsVerify(input: NtsVerifyInput): NtsVerifyResult {
  const bno = digitsOnly(input.businessRegistrationNo);
  if (bno.length !== 10) {
    return {
      ok: false,
      statusCode: "00",
      statusLabel: "번호오류",
      matched: false,
      source: "mock",
      reason: "INVALID_BIZ_NO"
    };
  }
  if (bno.endsWith("99")) {
    return {
      ok: false,
      statusCode: "03",
      statusLabel: "폐업자",
      matched: true,
      source: "mock",
      reason: "CLOSED_BUSINESS"
    };
  }
  if (bno.endsWith("88")) {
    return {
      ok: false,
      statusCode: "01",
      statusLabel: "계속사업자",
      matched: false,
      source: "mock",
      reason: "FIELD_MISMATCH"
    };
  }
  return {
    ok: true,
    statusCode: "01",
    statusLabel: "계속사업자",
    matched: true,
    source: "mock"
  };
}

export function isNtsBusinessMockEnabled(): boolean {
  return process.env.NTS_BUSINESS_MOCK === "1";
}

/**
 * 국세청 사업자등록 상태조회.
 * @param opts.allowSilentMock 키 없을 때/실패 시 mock 폴백 (가입 파이프라인용).
 *   온보딩 「국세청 대조」 버튼은 allowSilentMock=false 로 호출한다.
 */
export async function verifyNtsBusinessStatus(
  input: NtsVerifyInput,
  opts?: { allowSilentMock?: boolean }
): Promise<NtsVerifyResult> {
  const bno = digitsOnly(input.businessRegistrationNo);
  const rep = String(input.representativeName || "").trim();
  const open = normalizeOpenDate(input.openDate);
  if (bno.length !== 10 || !rep || open.length !== 8) {
    return {
      ok: false,
      statusCode: "00",
      statusLabel: "입력오류",
      matched: false,
      source: "mock",
      reason: "INVALID_INPUT"
    };
  }

  const normalized = { ...input, businessRegistrationNo: bno, representativeName: rep, openDate: open };

  if (isNtsBusinessMockEnabled()) {
    return mockNtsVerify(normalized);
  }

  const live = await callDataGoKrNts(normalized);
  if (live) return live;

  if (opts?.allowSilentMock !== false && process.env.NODE_ENV !== "production") {
    return mockNtsVerify(normalized);
  }

  return {
    ok: false,
    statusCode: "ERR",
    statusLabel: "조회실패",
    matched: false,
    source: "nts_api",
    reason: "PUBLIC_DATA_SERVICE_KEY_MISSING"
  };
}
