import { maskCeoName } from "../../lib/maskCeoName.js";
import {
  searchKakaoLocalDetailed,
  searchKakaoLocalList,
  type KakaoLocalItem,
  type KakaoSearchCenter
} from "../../integrations/kakao/kakaoLocalSearch.js";
import { searchNaverLocal, searchNaverLocalList } from "../../integrations/naver/naverLocalSearch.js";
import { lookupNtsBusinessByNumber } from "../../integrations/publicData/ntsBusinessLookup.js";
import { searchBusinessesByTradeName, type TradeNameBusinessCandidate } from "../../integrations/publicData/businessTradeNameSearch.js";
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

export type PublicBusinessCandidate = TradeNameBusinessCandidate;

export type PublicSourceData = {
  store_name: string;
  category: string;
  business_status: string;
  business_number: string;
  biz_type: string;
  biz_item: string;
  ceo_name: string;
  telephone: string;
  address: string;
  matched: boolean;
  fail_safe_message: string;
  candidates: PublicBusinessCandidate[];
};

export type PlaceBranchItem = {
  place_name: string;
  category: string;
  telephone: string;
  address: string;
  road_address: string;
  place_url: string;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
};

export type SearchVerifyOptions = {
  userLatitude?: number | null;
  userLongitude?: number | null;
};

export type VlueAuthData = {
  status_text: string;
  safety_score: number;
  partner_name: string;
  partner_id: string;
  store_id: string;
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
  place_branches: PlaceBranchItem[];
  location_sorted: boolean;
};

export type SearchVerifyResponse =
  | { status: "success"; data: CrossVerifyData }
  | { status: "error"; message: string };

const FAIL_SAFE_UNMATCHED =
  "등록되지 않은 사업자입니다. 카카오/네이버 장소에는 있으나 공공·국세청 사업자 원본과 일치하지 않습니다.";

const FAIL_SAFE_NO_PUBLIC = "등록되지 않은 사업자입니다";

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

function emptyPublicFields(storeName = "", category = ""): Pick<
  PublicSourceData,
  | "store_name"
  | "category"
  | "business_status"
  | "business_number"
  | "biz_type"
  | "biz_item"
  | "ceo_name"
  | "telephone"
  | "address"
> {
  return {
    store_name: storeName,
    category,
    business_status: "미확인",
    business_number: "미확인",
    biz_type: "미확인",
    biz_item: "미확인",
    ceo_name: "",
    telephone: "",
    address: ""
  };
}

function mapPlaceBranches(items: KakaoLocalItem[]): PlaceBranchItem[] {
  return items.map((item) => ({
    place_name: item.place_name,
    category: item.category,
    telephone: item.telephone,
    address: item.address,
    road_address: item.road_address,
    place_url: item.place_url,
    latitude: item.latitude,
    longitude: item.longitude,
    distance_m: item.distance_m
  }));
}

function userSearchCenter(options: SearchVerifyOptions): KakaoSearchCenter | undefined {
  const lat = Number(options.userLatitude);
  const lng = Number(options.userLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { latitude: lat, longitude: lng };
}

function fromCandidate(
  candidate: PublicBusinessCandidate,
  fallback: { storeName: string; category: string; telephone: string; address: string }
): Pick<
  PublicSourceData,
  | "store_name"
  | "category"
  | "business_status"
  | "business_number"
  | "biz_type"
  | "biz_item"
  | "ceo_name"
  | "telephone"
  | "address"
  | "matched"
> {
  return {
    matched: true,
    store_name: candidate.store_name || fallback.storeName,
    category: fallback.category,
    business_status: candidate.business_status,
    business_number: candidate.business_number,
    biz_type: candidate.biz_type,
    biz_item: candidate.biz_item,
    ceo_name: candidate.ceo_name ? maskCeoName(candidate.ceo_name) : "",
    telephone: formatPhoneFromStore(candidate.telephone || fallback.telephone),
    address: candidate.address || fallback.address
  };
}

async function buildPublicSource(input: {
  keyword: string;
  matchName: string;
  matchPhone: string;
  matchAddress: string;
  matchCategory: string;
  latitude: number | null;
  longitude: number | null;
  extraNames: string[];
  hasExternalPlace: boolean;
}): Promise<PublicSourceData> {
  const { keyword, matchName, matchPhone, matchAddress, matchCategory, latitude, longitude, extraNames, hasExternalPlace } =
    input;
  const placeFallback = {
    storeName: matchName,
    category: matchCategory,
    telephone: matchPhone,
    address: matchAddress
  };
  const directBno = digitsOnly(keyword);
  const searchTerms = [
    ...new Set([keyword, matchName, ...extraNames.slice(0, 2)].map((v) => String(v || "").trim()).filter(Boolean))
  ].slice(0, 3);
  const searchContext = {
    matchName,
    matchPhone,
    matchAddress,
    latitude,
    longitude
  };

  if (directBno.length === 10) {
    const nts = await lookupNtsBusinessByNumber(directBno);
    if (nts) {
      return {
        ...emptyPublicFields(matchName, matchCategory),
        matched: true,
        business_status: nts.businessStatus,
        business_number: nts.businessNumber,
        biz_type: nts.bizType,
        biz_item: nts.bizItem,
        telephone: matchPhone,
        address: matchAddress,
        fail_safe_message: "국세청 사업자상태 API 기준으로 영업 정보가 확인되었습니다.",
        candidates: []
      };
    }
  }

  if (isPublicInstitution(matchName)) {
      return {
      ...emptyPublicFields(matchName, matchCategory),
      matched: true,
      business_status: "공공기관 / 정상 운영중",
      business_number: "해당없음(공공기관)",
      biz_type: "공공 행정",
      biz_item: inferPublicBizItem(matchName),
      telephone: matchPhone,
      address: matchAddress,
      fail_safe_message:
        "공공기관은 사업자등록 체계와 별도로 운영됩니다. 행정기관 분류 및 네이버·카카오 장소 정보를 함께 참고해 주세요.",
      candidates: []
    };
  }

  const [store, ...nameSearchBatches] = await Promise.all([
    findSmallBusinessStore({
      storeName: matchName,
      telephone: matchPhone,
      roadAddress: matchAddress,
      latitude,
      longitude
    }),
    ...searchTerms.map((term) => searchBusinessesByTradeName(term, 15, searchContext))
  ]);

  const candidateMap = new Map<string, PublicBusinessCandidate>();
  for (const batch of nameSearchBatches) {
    for (const row of batch) candidateMap.set(row.business_number, row);
  }

  if (store?.businessNumber) {
    const existing = candidateMap.get(store.businessNumber);
    candidateMap.set(store.businessNumber, {
      store_name: store.storeName,
      business_number: store.businessNumber,
      ceo_name: existing?.ceo_name || "",
      business_status: existing?.business_status || "미확인",
      biz_type: existing?.biz_type || store.industry || "미확인",
      biz_item: existing?.biz_item || store.industry || "미확인",
      address: store.address || matchAddress,
      telephone: store.telephone || matchPhone,
      source: existing?.source || store.source
    });
    const nts = await lookupNtsBusinessByNumber(store.businessNumber);
    const merged = candidateMap.get(store.businessNumber)!;
    if (nts) {
      merged.business_status = nts.businessStatus;
      if (merged.biz_type === "미확인") merged.biz_type = nts.bizType;
      if (merged.biz_item === "미확인") merged.biz_item = nts.bizItem;
    }
  }

  const candidates = [...candidateMap.values()]
    .map((row) => ({
      ...row,
      ceo_name: row.ceo_name ? maskCeoName(row.ceo_name) : ""
    }))
    .slice(0, 15);
  const primary = candidates[0] || null;

  if (primary) {
    const fromStoreExact = store?.businessNumber === primary.business_number;
    const fromHint = primary.source?.includes("public_hint_registry");
    return {
      ...fromCandidate(primary, placeFallback),
      fail_safe_message: fromStoreExact
        ? "소상공인 상가정보·금융위 기업기본정보 교차 조회로 사업자 정보를 확인했습니다."
        : fromHint
          ? "공공·국세청 교차 조회로 사업자등록번호와 대표자명을 확인했습니다. 대표자명은 보안을 위해 일부 마스킹됩니다."
          : candidates.length > 1
            ? `상호명 기준 ${candidates.length}건의 유사 사업자를 조회했습니다. 아래 목록에서 해당 지점을 선택해 주세요.`
            : "상호명 기준 사업자등록번호·대표자명을 조회했습니다.",
      candidates
    };
  }

  return {
    ...emptyPublicFields(matchName, matchCategory),
    matched: false,
    telephone: matchPhone,
    address: matchAddress,
    fail_safe_message: hasExternalPlace ? FAIL_SAFE_UNMATCHED : FAIL_SAFE_NO_PUBLIC,
    candidates: []
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
      partner_id: partner.id,
      store_id: partner.store_id,
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
    partner_id: "",
    store_id: "",
    cert_number: "",
    category: "",
    phone: "",
    address: ""
  };
}

export async function runSearchVerify(
  keyword: string,
  options: SearchVerifyOptions = {}
): Promise<SearchVerifyResponse> {
  const q = String(keyword || "").trim();
  if (!q) return { status: "error", message: "검색어(keyword)가 필요합니다." };

  const userCenter = userSearchCenter(options);
  const [kakaoList, naverList] = await Promise.all([
    searchKakaoLocalList(q, 15, userCenter),
    searchNaverLocalList(q, 5)
  ]);

  let kakaoResolved: Awaited<ReturnType<typeof searchKakaoLocalDetailed>> = {
    item: kakaoList[0] ?? null,
    unavailable_reason: kakaoList[0] ? "" : "카카오에서 일치하는 장소를 찾지 못했습니다.",
    http_status: kakaoList.length ? 200 : null
  };
  const naverBest = naverList[0] ?? null;

  if (!kakaoResolved.item && naverBest?.title) {
    const retryList = await searchKakaoLocalList(naverBest.title, 5, userCenter);
    if (retryList[0]) {
      kakaoResolved = { item: retryList[0], unavailable_reason: "", http_status: 200 };
    }
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
      matchCategory: kakaoBest?.category || naverBest?.category || "",
      latitude: kakaoBest?.latitude ?? naverBest?.latitude ?? null,
      longitude: kakaoBest?.longitude ?? naverBest?.longitude ?? null,
      extraNames: kakaoList.map((item) => item.place_name).filter(Boolean),
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
      vlue_auth,
      place_branches: mapPlaceBranches(kakaoList),
      location_sorted: Boolean(userCenter)
    }
  };
}
