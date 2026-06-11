import { searchNaverLocal } from "../../integrations/naver/naverLocalSearch.js";
import { lookupNtsBusinessByNumber } from "../../integrations/publicData/ntsBusinessLookup.js";
import { findSmallBusinessStore } from "../../integrations/publicData/smallBusinessStoreSearch.js";

export type SearchVerifyData = {
  company_name: string;
  telephone: string;
  address: string;
  business_number: string;
  business_status: string;
  biz_type: string;
  biz_item: string;
};

export type SearchVerifyResponse =
  | { status: "success"; data: SearchVerifyData }
  | { status: "error"; message: string };

const PUBLIC_ORG_RE =
  /세무서|시청|구청|군청|도청|경찰서|소방서|우체국|법원|검찰|주민센터|보건소|관공서|국세청|세무서|행정복지센터|출장소/;

function inferPublicBizItem(name: string): string {
  if (/세무서|국세청/.test(name)) return "세무 행정";
  if (/경찰/.test(name)) return "치안 행정";
  if (/소방/.test(name)) return "소방 행정";
  if (/우체국/.test(name)) return "우편 행정";
  if (/시청|구청|군청|도청|주민센터|행정복지/.test(name)) return "지방 행정";
  return "공공 행정";
}

function isPublicInstitution(name: string): boolean {
  return PUBLIC_ORG_RE.test(String(name || ""));
}

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function formatBusinessNumber(raw: string): string {
  const d = digitsOnly(raw);
  if (d.length !== 10) return String(raw || "").trim();
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function buildPublicInstitutionFallback(input: {
  companyName: string;
  telephone: string;
  address: string;
}): SearchVerifyData {
  return {
    company_name: input.companyName,
    telephone: input.telephone,
    address: input.address,
    business_number: "해당없음(공공기관)",
    business_status: "공공기관 / 정상 운영중",
    biz_type: "공공 행정",
    biz_item: inferPublicBizItem(input.companyName)
  };
}

function mergeNtsStatus(base: SearchVerifyData, nts: {
  businessNumber: string;
  businessStatus: string;
  bizType: string;
  bizItem: string;
}): SearchVerifyData {
  return {
    ...base,
    business_number: nts.businessNumber || base.business_number,
    business_status: nts.businessStatus,
    biz_type: nts.bizType || base.biz_type,
    biz_item: nts.bizItem || base.biz_item
  };
}

export async function runSearchVerify(keyword: string): Promise<SearchVerifyResponse> {
  const q = String(keyword || "").trim();
  if (!q) return { status: "error", message: "검색어(keyword)가 필요합니다." };

  const directBno = digitsOnly(q);
  if (directBno.length === 10) {
    const nts = await lookupNtsBusinessByNumber(directBno);
    if (nts) {
      return {
        status: "success",
        data: {
          company_name: q,
          telephone: "",
          address: "",
          business_number: nts.businessNumber,
          business_status: nts.businessStatus,
          biz_type: nts.bizType,
          biz_item: nts.bizItem
        }
      };
    }
  }

  const naver = await searchNaverLocal(q);
  if (!naver) {
    return { status: "error", message: "네이버 지역 검색 결과를 찾을 수 없습니다." };
  }

  const base: SearchVerifyData = {
    company_name: naver.title || q,
    telephone: naver.telephone,
    address: naver.roadAddress || naver.address,
    business_number: "",
    business_status: "조회중",
    biz_type: naver.category || "미확인",
    biz_item: "미확인"
  };

  const store = await findSmallBusinessStore({
    storeName: base.company_name,
    telephone: base.telephone,
    roadAddress: base.address
  });

  if (store?.businessNumber) {
    base.business_number = store.businessNumber;
    if (store.industry) base.biz_item = store.industry;
    const nts = await lookupNtsBusinessByNumber(store.businessNumber);
    if (nts) return { status: "success", data: mergeNtsStatus(base, nts) };
    return {
      status: "success",
      data: {
        ...base,
        business_status: "사업자번호 확인 · 국세청 상태 미응답"
      }
    };
  }

  if (isPublicInstitution(base.company_name)) {
    return {
      status: "success",
      data: buildPublicInstitutionFallback({
        companyName: base.company_name,
        telephone: base.telephone,
        address: base.address
      })
    };
  }

  const ntsRetry = await lookupNtsBusinessByNumber(directBno.length === 10 ? directBno : "");
  if (ntsRetry) {
    return { status: "success", data: mergeNtsStatus(base, ntsRetry) };
  }

  return {
    status: "success",
    data: {
      ...base,
      business_number: "미확인",
      business_status: "상가정보·국세청 미매칭",
      biz_type: base.biz_type || "미확인",
      biz_item: base.biz_item || "미확인"
    }
  };
}
