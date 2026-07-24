/**
 * 한국저작권위원회 저작권등록정보서비스(신규) — 공공데이터포털 OpenAPI 클라이언트
 *
 * 환경 변수 (Railway / apps/api/.env):
 *   COPYRIGHT_API_KEY          — 공공데이터포털 인증키 (우선)
 *   PUBLIC_DATA_SERVICE_KEY    — 공용 키 폴백 (기존 NTS 등과 동일)
 *   COPYRIGHT_API_BASE_URL     — 기본 https://apis.data.go.kr/B552461/CopyrightRegistrationInfoService
 *   COPYRIGHT_API_LIST_PATH    — 기본 /getCopyrightRegistrationList
 *
 * 포털: https://www.data.go.kr/data/15106731/openapi.do
 * VLUE는 저작권을 최종 인증하지 않으며, 등록 검색·참고용으로만 사용합니다.
 */
import { fetchPublicDataJson, getPublicDataServiceKey } from "../../lib/publicDataServiceKey.js";

const DEFAULT_BASE =
  "https://apis.data.go.kr/B552461/CopyrightRegistrationInfoService";
const DEFAULT_LIST_PATH = "/getCopyrightRegistrationList";

export type CopyrightVerifyQuery = {
  title?: string;
  author?: string;
  registrationNo?: string;
  pageNo?: number;
  numOfRows?: number;
};

export type CopyrightRegistrationItem = {
  registrationNo: string;
  title: string;
  author: string;
  rightHolder: string;
  category: string;
  registeredAt: string;
  reason: string;
  raw: Record<string, unknown>;
};

export type CopyrightVerifyResult = {
  ok: boolean;
  configured: boolean;
  queried: { title: string; author: string; registrationNo: string };
  registeredFound: boolean;
  totalCount: number;
  items: CopyrightRegistrationItem[];
  message?: string;
  source: "copyright_commission_openapi";
  disclaimer: string;
};

function getCopyrightServiceKey(): string {
  return String(
    process.env.COPYRIGHT_API_KEY || getPublicDataServiceKey() || ""
  ).trim();
}

function listEndpoint(): string {
  const base = String(process.env.COPYRIGHT_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  const path = String(process.env.COPYRIGHT_API_LIST_PATH || DEFAULT_LIST_PATH);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function normalizeItem(raw: unknown): CopyrightRegistrationItem | null {
  const row = asRecord(raw);
  if (!Object.keys(row).length) return null;
  const title = pickStr(row, [
    "title",
    "titleNm",
    "titl",
    "wrkTitl",
    "저작물명",
    "저작물제목"
  ]);
  const author = pickStr(row, [
    "author",
    "authorNm",
    "authrNm",
    "작가명",
    "저작자명",
    "저작자"
  ]);
  const registrationNo = pickStr(row, [
    "registrationNo",
    "regNo",
    "registNo",
    "rgstNo",
    "등록번호"
  ]);
  if (!title && !author && !registrationNo) return null;
  return {
    registrationNo,
    title,
    author,
    rightHolder: pickStr(row, ["rightHolder", "rgtOwnrNm", "권리자", "등록권리자"]),
    category: pickStr(row, ["category", "clsfNm", "wrkClsf", "저작물분류"]),
    registeredAt: pickStr(row, ["registeredAt", "regDt", "rgstDt", "등록일자"]),
    reason: pickStr(row, ["reason", "regRsn", "등록사유"]),
    raw: row
  };
}

function extractItems(json: unknown): { items: CopyrightRegistrationItem[]; totalCount: number } {
  const root = asRecord(json);
  const response = asRecord(root.response);
  const body = asRecord(response.body || root.body || root);
  const header = asRecord(response.header || root.header);
  const resultCode = String(header.resultCode || root.resultCode || "");
  if (resultCode && resultCode !== "00" && resultCode !== "0" && resultCode !== "NORMAL") {
    return { items: [], totalCount: 0 };
  }

  const itemsNode = body.items ?? root.items ?? body.itemList;
  let list: unknown[] = [];
  if (Array.isArray(itemsNode)) list = itemsNode;
  else if (itemsNode && typeof itemsNode === "object") {
    const item = (itemsNode as Record<string, unknown>).item;
    if (Array.isArray(item)) list = item;
    else if (item) list = [item];
  }

  const items = list.map(normalizeItem).filter(Boolean) as CopyrightRegistrationItem[];
  const totalCount = Number(body.totalCount ?? root.totalCount ?? items.length) || items.length;
  return { items, totalCount };
}

/**
 * 저작물명·저작자명 등으로 등록정보 검색.
 * 결과가 없어도 "미등록 확정"이 아니라 registeredFound=false 만 반환합니다.
 */
export async function verifyCopyrightRegistration(
  query: CopyrightVerifyQuery
): Promise<CopyrightVerifyResult> {
  const title = String(query.title || "").trim();
  const author = String(query.author || "").trim();
  const registrationNo = String(query.registrationNo || "").trim();
  const pageNo = Math.max(1, Number(query.pageNo) || 1);
  const numOfRows = Math.min(50, Math.max(1, Number(query.numOfRows) || 10));

  const disclaimer =
    "VLUE는 저작권을 최종 인증·판매하지 않습니다. 본 검색은 한국저작권위원회 등록정보 참고용이며, 권리·책임은 등록자에게 있습니다.";

  const key = getCopyrightServiceKey();
  if (!key) {
    return {
      ok: false,
      configured: false,
      queried: { title, author, registrationNo },
      registeredFound: false,
      totalCount: 0,
      items: [],
      message:
        "COPYRIGHT_API_KEY(또는 PUBLIC_DATA_SERVICE_KEY)가 없습니다. 공공데이터포털에서 한국저작권위원회_저작권등록정보서비스(신규) 활용신청 후 키를 등록하세요.",
      source: "copyright_commission_openapi",
      disclaimer
    };
  }

  if (!title && !author && !registrationNo) {
    return {
      ok: false,
      configured: true,
      queried: { title, author, registrationNo },
      registeredFound: false,
      totalCount: 0,
      items: [],
      message: "저작물명(title) 또는 저작자명(author) 또는 등록번호를 입력해 주세요.",
      source: "copyright_commission_openapi",
      disclaimer
    };
  }

  const params: Record<string, string> = {
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    type: "json"
  };
  if (title) {
    params.title = title;
    params.titleNm = title;
  }
  if (author) {
    params.author = author;
    params.authorNm = author;
  }
  if (registrationNo) {
    params.regNo = registrationNo;
    params.registrationNo = registrationNo;
  }

  const fetched = await fetchPublicDataJson(listEndpoint(), params, undefined, key);
  if (!fetched.ok) {
    const errBody = asRecord(fetched.json);
    return {
      ok: false,
      configured: true,
      queried: { title, author, registrationNo },
      registeredFound: false,
      totalCount: 0,
      items: [],
      message:
        String(errBody.resultMsg || errBody.message || errBody.error || "") ||
        `저작권 등록정보 API 호출 실패 (${fetched.status || "network"})`,
      source: "copyright_commission_openapi",
      disclaimer
    };
  }

  const { items, totalCount } = extractItems(fetched.json);
  return {
    ok: true,
    configured: true,
    queried: { title, author, registrationNo },
    registeredFound: items.length > 0,
    totalCount,
    items,
    source: "copyright_commission_openapi",
    disclaimer
  };
}
