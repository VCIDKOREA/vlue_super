import { searchBusinessesByTradeName, type TradeNameBusinessCandidate } from "../../integrations/publicData/businessTradeNameSearch.js";
import { lookupNtsBusinessByNumber } from "../../integrations/publicData/ntsBusinessLookup.js";

export type PublicBusinessSearchOptions = {
  latitude?: number | null;
  longitude?: number | null;
};

export type PublicBusinessSearchResult = {
  query: string;
  matched: boolean;
  message: string;
  candidates: TradeNameBusinessCandidate[];
  primary: TradeNameBusinessCandidate | null;
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function formatBusinessNumber(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 10) return String(raw || "").trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

const UNREGISTERED_MESSAGE = "등록되지 않은 사업자입니다";

/**
 * 상호명(또는 사업자번호)으로 공공데이터 기업·사업자 정보를 실시간 조회합니다.
 * - 금융위 기업기본정보 · 소상공인 상가정보 · 국세청 사업자상태
 */
export async function runPublicBusinessSearch(
  keyword: string,
  options: PublicBusinessSearchOptions = {}
): Promise<PublicBusinessSearchResult> {
  const q = String(keyword || "").trim();
  if (!q) {
    return {
      query: "",
      matched: false,
      message: "상호명을 입력해 주세요.",
      candidates: [],
      primary: null
    };
  }

  const directBno = digitsOnly(q);
  if (directBno.length === 10) {
    const nts = await lookupNtsBusinessByNumber(directBno);
    if (nts) {
      const primary: TradeNameBusinessCandidate = {
        store_name: q,
        business_number: nts.businessNumber,
        ceo_name: "",
        business_status: nts.businessStatus,
        biz_type: nts.bizType,
        biz_item: nts.bizItem,
        address: "",
        telephone: "",
        source: nts.source
      };
      return {
        query: q,
        matched: true,
        message: "국세청 사업자상태 API 기준으로 영업 정보가 확인되었습니다.",
        candidates: [primary],
        primary
      };
    }
    return {
      query: q,
      matched: false,
      message: UNREGISTERED_MESSAGE,
      candidates: [],
      primary: null
    };
  }

  const candidates = await searchBusinessesByTradeName(q, 15, {
    matchName: q,
    latitude: options.latitude ?? null,
    longitude: options.longitude ?? null
  });

  const primary = candidates[0] || null;
  if (!primary || digitsOnly(primary.business_number).length !== 10) {
    return {
      query: q,
      matched: false,
      message: UNREGISTERED_MESSAGE,
      candidates: [],
      primary: null
    };
  }

  return {
    query: q,
    matched: true,
    message: `${candidates.length}건의 사업자 정보를 공공데이터에서 확인했습니다.`,
    candidates: candidates.map((row) => ({
      ...row,
      business_number: formatBusinessNumber(row.business_number)
    })),
    primary: {
      ...primary,
      business_number: formatBusinessNumber(primary.business_number)
    }
  };
}
