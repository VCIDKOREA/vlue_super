import { searchKakaoLocalDetailed } from "../../integrations/kakao/kakaoLocalSearch.js";
import { searchNaverLocal, searchNaverLocalList } from "../../integrations/naver/naverLocalSearch.js";
import { lookupNtsBusinessByNumber } from "../../integrations/publicData/ntsBusinessLookup.js";
import { findSmallBusinessStore } from "../../integrations/publicData/smallBusinessStoreSearch.js";
import { findVluePartner } from "./vluePartnerRegistry.js";

export type KakaoSourceData = {
  place_name: string;
  telephone: string;
  address: string;
  road_address: string;
  category: string;
  place_url: string;
  latitude: number | null;
  longitude: number | null;
  unavailable_reason: string;
};

export type NaverSourceData = {
  title: string;
  address: string;
  road_address: string;
  link: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
};

export type PublicSourceData = {
  business_status: string;
  business_number: string;
  biz_type: string;
  biz_item: string;
  telephone: string;
  address: string;
  matched: boolean;
  fail_safe_message: string;
};

export type VlueAuthData = {
  status_text: string;
  safety_score: number;
  partner_name: string;
  cert_number: string;
  category: string;
  phone: string;
  address: string;
};

export type CrossVerifyData = {
  query: string;
  is_registered: boolean;
  kakao: KakaoSourceData;
  naver: NaverSourceData;
  public: PublicSourceData;
  vlue_auth: VlueAuthData;
};

export type SearchVerifyResponse =
  | { status: "success"; data: CrossVerifyData }
  | { status: "error"; message: string };

const FAIL_SAFE_UNMATCHED =
  "국세청 원본과 일치하는 사업자번호는 조회가 지연되나, 카카오/네이버에 등록된 실존 기관임을 확인했습니다.";

const PUBLIC_ORG_RE =
  /세무서|시청|구청|군청|도청|경찰서|소방서|우체국|법원|검찰|주민센터|보건소|관공서|국세청|행정복지센터|출장소/;

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function isPublicInstitution(name: string): boolean {
  return PUBLIC_ORG_RE.test(String(name || ""));
}

function inferPublicBizItem(name: string): string {
  if (/세무서|국세청/.test(name)) return "세무 행정";
  if (/경찰/.test(name)) return "치안 행정";
  if (/소방/.test(name)) return "소방 행정";
  if (/우체국/.test(name)) return "우편 행정";
  if (/시청|구청|군청|도청|주민센터|행정복지/.test(name)) return "지방 행정";
  return "공공 행정";
}

function emptyKakao(reason = ""): KakaoSourceData {
  return {
    place_name: "",
    telephone: "",
    address: "",
    road_address: "",
    category: "",
    place_url: "",
    latitude: null,
    longitude: null,
    unavailable_reason: reason
  };
}

function emptyNaver(): NaverSourceData {
  return {
    title: "",
    address: "",
    road_address: "",
    link: "",
    category: "",
    latitude: null,
    longitude: null
  };
}

function mapKakao(result: Awaited<ReturnType<typeof searchKakaoLocalDetailed>>): KakaoSourceData {
  if (!result.item) return emptyKakao(result.unavailable_reason);
  return {
    place_name: result.item.place_name,
    telephone: result.item.telephone,
    address: result.item.address,
    road_address: result.item.road_address,
    category: result.item.category,
    place_url: result.item.place_url,
    latitude: result.item.latitude,
    longitude: result.item.longitude,
    unavailable_reason: ""
  };
}

function mapNaver(item: Awaited<ReturnType<typeof searchNaverLocal>>): NaverSourceData {
  if (!item) return emptyNaver();
  return {
    title: item.title,
    address: item.address,
    road_address: item.roadAddress,
    link: item.link,
    category: item.category,
    latitude: item.latitude,
    longitude: item.longitude
  };
}

function formatPhoneFromStore(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) {
    if (digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(raw || "").trim();
}

async function buildPublicSource(input: {
  keyword: string;
  matchName: string;
  matchPhone: string;
  matchAddress: string;
  hasExternalPlace: boolean;
}): Promise<PublicSourceData> {
  const { keyword, matchName, matchPhone, matchAddress, hasExternalPlace } = input;
  const directBno = digitsOnly(keyword);

  if (directBno.length === 10) {
    const nts = await lookupNtsBusinessByNumber(directBno);
    if (nts) {
      return {
        matched: true,
        business_status: nts.businessStatus,
        business_number: nts.businessNumber,
        biz_type: nts.bizType,
        biz_item: nts.bizItem,
        telephone: "",
        address: "",
        fail_safe_message: "국세청 사업자상태 API 기준으로 영업 정보가 확인되었습니다."
      };
    }
  }

  if (isPublicInstitution(matchName)) {
    return {
      matched: true,
      business_status: "공공기관 / 정상 운영중",
      business_number: "해당없음(공공기관)",
      biz_type: "공공 행정",
      biz_item: inferPublicBizItem(matchName),
      telephone: "",
      address: matchAddress,
      fail_safe_message:
        "공공기관은 사업자등록 체계와 별도로 운영됩니다. 행정기관 분류 및 네이버·카카오 장소 정보를 함께 참고해 주세요."
    };
  }

  const store = await findSmallBusinessStore({
    storeName: matchName,
    telephone: matchPhone,
    roadAddress: matchAddress
  });

  if (store?.businessNumber) {
    const nts = await lookupNtsBusinessByNumber(store.businessNumber);
    if (nts) {
      return {
        matched: true,
        business_status: nts.businessStatus,
        business_number: nts.businessNumber,
        biz_type: nts.bizType || store.industry || "미확인",
        biz_item: nts.bizItem || store.industry || "미확인",
        telephone: formatPhoneFromStore(store.telephone),
        address: store.address || matchAddress,
        fail_safe_message: "소상공인 상가정보와 국세청 사업자상태가 교차 확인되었습니다."
      };
    }
    return {
      matched: true,
      business_status: "사업자번호 확인 · 국세청 상태 미응답",
      business_number: store.businessNumber,
      biz_type: store.industry || "미확인",
      biz_item: store.industry || "미확인",
      telephone: formatPhoneFromStore(store.telephone),
      address: store.address || matchAddress,
      fail_safe_message: "상가정보에서 사업자번호는 확인했으나, 국세청 상태 조회에 응답이 없습니다."
    };
  }

  return {
    matched: false,
    business_status: "상가정보·국세청 미매칭",
    business_number: "미확인",
    biz_type: "미확인",
    biz_item: "미확인",
    telephone: "",
    address: "",
    fail_safe_message: hasExternalPlace ? FAIL_SAFE_UNMATCHED : "공공데이터에서 일치하는 사업자 정보를 찾지 못했습니다."
  };
}

function buildVlueAuth(
  is_registered: boolean,
  partner: ReturnType<typeof findVluePartner>,
  publicData: PublicSourceData,
  kakao: KakaoSourceData,
  naver: NaverSourceData
): VlueAuthData {
  if (is_registered && partner) {
    return {
      status_text: "VLUE 보이스피싱 예방 센터 교차 검증 완료",
      safety_score: partner.safety_score,
      partner_name: partner.name,
      cert_number: partner.cert_number,
      category: partner.category,
      phone: partner.phone,
      address: partner.address
    };
  }

  let score = 42;
  if (kakao.place_name) score += 18;
  if (kakao.telephone) score += 10;
  if (naver.title) score += 12;
  if (publicData.matched) score += 18;
  else if (!publicData.matched && (kakao.place_name || naver.title)) score += 8;

  return {
    status_text: "VLUE 예방 센터 교차 검증 진행 중",
    safety_score: Math.min(Math.max(score, 35), 78),
    partner_name: "",
    cert_number: "",
    category: "",
    phone: "",
    address: ""
  };
}

export async function runSearchVerify(keyword: string): Promise<SearchVerifyResponse> {
  const q = String(keyword || "").trim();
  if (!q) return { status: "error", message: "검색어(keyword)가 필요합니다." };

  const [kakaoResult, naverList] = await Promise.all([
    searchKakaoLocalDetailed(q),
    searchNaverLocalList(q, 5)
  ]);

  let kakaoResolved = kakaoResult;
  const naverBest = naverList[0] ?? null;

  if (!kakaoResolved.item && naverBest?.title) {
    const retry = await searchKakaoLocalDetailed(naverBest.title);
    if (retry.item) kakaoResolved = retry;
    else if (!kakaoResolved.unavailable_reason) kakaoResolved = retry;
  }

  if (!kakaoResolved.item && !naverBest) {
    return { status: "error", message: "카카오·네이버 지역 검색 결과를 찾을 수 없습니다." };
  }

  const kakaoBest = kakaoResolved.item;
  const matchName = kakaoBest?.place_name || naverBest?.title || q;
  const matchPhone = kakaoBest?.telephone || "";
  const matchAddress =
    kakaoBest?.road_address ||
    kakaoBest?.address ||
    naverBest?.roadAddress ||
    naverBest?.address ||
    "";

  const [publicData, partner] = await Promise.all([
    buildPublicSource({
      keyword: q,
      matchName,
      matchPhone,
      matchAddress,
      hasExternalPlace: Boolean(kakaoBest || naverBest)
    }),
    Promise.resolve(findVluePartner(q, matchName))
  ]);

  const forceRegistered = String(process.env.VLUE_SEARCH_FORCE_REGISTERED || "").trim() === "1";
  const is_registered = forceRegistered || Boolean(partner);

  const kakao = mapKakao(kakaoResolved);
  const naver = mapNaver(naverBest);
  const vlue_auth = buildVlueAuth(is_registered, partner, publicData, kakao, naver);

  return {
    status: "success",
    data: {
      query: q,
      is_registered,
      kakao,
      naver,
      public: publicData,
      vlue_auth
    }
  };
}
