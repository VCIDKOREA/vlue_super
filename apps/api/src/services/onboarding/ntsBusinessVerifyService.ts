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

async function callDataGoKrNts(input: NtsVerifyInput): Promise<NtsVerifyResult | null> {
  const key = String(process.env.DATA_GO_KR_SERVICE_KEY || process.env.NTS_BUSINESS_API_KEY || "").trim();
  if (!key) return null;

  const endpoint =
    process.env.NTS_BUSINESS_STATUS_API_URL ||
    "https://api.odcloud.kr/api/nts-businessman/v1/status";

  const bno = digitsOnly(input.businessRegistrationNo);
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("returnType", "JSON");
  url.searchParams.set("b_no", bno);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        statusCode: "ERR",
        statusLabel: "조회실패",
        matched: false,
        source: "nts_api",
        reason: "NTS_API_HTTP_ERROR"
      };
    }

    const items = Array.isArray(json.data) ? json.data : [];
    const row = (items[0] || {}) as Record<string, string>;
    const statusCode = String(row.b_stt_cd || row.tax_type_cd || row.status || "01").padStart(2, "0");
    const statusLabel = ACTIVE_LABELS[statusCode] || String(row.b_stt || row.tax_type || "미확인");
    const repOk =
      !row.p_nm ||
      normalizeName(row.p_nm) === normalizeName(input.representativeName);
    const openOk =
      !row.start_dt || normalizeOpenDate(row.start_dt) === normalizeOpenDate(input.openDate);

    const active = ACTIVE_CODES.has(statusCode);
    return {
      ok: active && repOk && openOk,
      statusCode,
      statusLabel,
      matched: repOk && openOk,
      source: "nts_api",
      reason: !active ? "NOT_CONTINUING_BUSINESS" : !repOk || !openOk ? "FIELD_MISMATCH" : undefined
    };
  } catch {
    return {
      ok: false,
      statusCode: "ERR",
      statusLabel: "조회실패",
      matched: false,
      source: "nts_api",
      reason: "NTS_API_EXCEPTION"
    };
  }
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

export async function verifyNtsBusinessStatus(input: NtsVerifyInput): Promise<NtsVerifyResult> {
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

  const useMock =
    process.env.NTS_BUSINESS_MOCK === "1" ||
    (process.env.NODE_ENV !== "production" &&
      !process.env.DATA_GO_KR_SERVICE_KEY &&
      !process.env.NTS_BUSINESS_API_KEY);

  if (useMock) return mockNtsVerify({ ...input, businessRegistrationNo: bno, openDate: open });

  const live = await callDataGoKrNts({ ...input, businessRegistrationNo: bno, openDate: open });
  return live || mockNtsVerify({ ...input, businessRegistrationNo: bno, openDate: open });
}
