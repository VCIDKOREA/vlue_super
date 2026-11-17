import { searchKakaoLocalDetailed } from "../../integrations/kakao/kakaoLocalSearch.js";
import { searchNaverLocalList } from "../../integrations/naver/naverLocalSearch.js";
import { findSmallBusinessStore } from "../../integrations/publicData/smallBusinessStoreSearch.js";
import {
  lookupPublicDirectoryByPhone,
  searchPublicDirectory
} from "../search/publicDirectoryService.js";
import type { BizcardFields } from "./bizcardStructuredParse.js";

export type BizcardBadge = "DB 검증 완료" | "위치 실존 확인" | "부분 일치" | "미확인";

export type BizcardTrust = {
  score: number;
  badge: BizcardBadge;
  dbMatched: boolean;
  placeMatched: boolean;
  partial: boolean;
  notes: string[];
};

function digits(raw: string | null | undefined) {
  return String(raw || "").replace(/\D/g, "");
}

function compactName(raw: string | null | undefined) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\(주\)|㈜|주식회사|유한회사|\s+/g, "");
}

export function namesClose(left: string | null | undefined, right: string | null | undefined) {
  const a = compactName(left);
  const b = compactName(right);
  if (a.length < 2 || b.length < 2) return false;
  return a.includes(b) || b.includes(a);
}

function phonesClose(left: string | null | undefined, right: string | null | undefined) {
  const a = digits(left);
  const b = digits(right);
  if (a.length < 8 || b.length < 8) return false;
  return a.endsWith(b.slice(-8)) || b.endsWith(a.slice(-8));
}

function addressClose(left: string | null | undefined, right: string | null | undefined) {
  const a = String(left || "");
  const b = String(right || "");
  if (a.length < 4 || b.length < 4) return false;
  const token = a.match(/[가-힣0-9]{2,}(?:로|길|동|읍|면)/);
  return Boolean(token && b.includes(token[0]));
}

async function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function decideBizcardTrust(input: {
  dbPhone: boolean;
  dbName: boolean;
  dbAddress: boolean;
  placeName: boolean;
  placePhone: boolean;
  placeAddress: boolean;
  publicStore: boolean;
  phoneHint?: boolean;
}): BizcardTrust {
  const dbMatched = input.dbPhone || (input.dbName && (input.dbAddress || input.publicStore));
  const placeMatched = input.placeName && (input.placePhone || input.placeAddress);
  const placeNameOnly = input.placeName && !placeMatched;
  const partial =
    !dbMatched &&
    !placeMatched &&
    (input.dbName || placeNameOnly || input.dbAddress || input.placeAddress || Boolean(input.phoneHint));
  let score = 12;
  const notes: string[] = [];
  if (input.dbPhone) {
    score += 48;
    notes.push("공공 디렉터리 전화번호 일치");
  } else if (input.dbName && input.dbAddress) {
    score += 36;
    notes.push("공공 디렉터리 상호·주소 일치");
  } else if (input.dbName) {
    score += 16;
    notes.push("공공 디렉터리 상호 일부 일치");
  }
  if (input.publicStore) {
    score += 18;
    notes.push("소상공인 공공데이터 일치");
  }
  if (placeMatched) {
    score += 28;
    notes.push("지도 검색에서 사업장 확인");
  } else if (placeNameOnly) {
    score += 12;
    notes.push("상호는 검색되나 전화·주소는 다름");
  }
  let badge: BizcardBadge = "미확인";
  if (dbMatched) badge = "DB 검증 완료";
  else if (placeMatched) badge = "위치 실존 확인";
  else if (partial) badge = "부분 일치";
  return {
    score: Math.max(0, Math.min(100, score)),
    badge,
    dbMatched,
    placeMatched,
    partial,
    notes
  };
}

export async function scoreBizcardTrust(card: BizcardFields): Promise<BizcardTrust> {
  const company = card.company || "";
  const tel = card.tel || "";
  const address = card.address || "";
  const [directoryPhone, directoryName, kakao, naver, store] = await Promise.all([
    withTimeout(lookupPublicDirectoryByPhone(tel, { force: true }), 2500, null),
    withTimeout(company ? searchPublicDirectory({ query: company, limit: 5 }) : Promise.resolve([]), 2500, []),
    withTimeout(company ? searchKakaoLocalDetailed(company) : Promise.resolve(null), 2500, null),
    withTimeout(company ? searchNaverLocalList(company, 5) : Promise.resolve([]), 2500, []),
    withTimeout(
      company || tel
        ? findSmallBusinessStore({ storeName: company, telephone: tel, roadAddress: address })
        : Promise.resolve(null),
      2500,
      null
    )
  ]);

  const directoryRows = [
    ...(directoryPhone ? [directoryPhone] : []),
    ...directoryName
  ];
  const phoneHit = directoryRows.some((row) => phonesClose(tel, row.phoneE164 || row.phoneDigits));
  const dbPhone = phoneHit && directoryRows.some((row) => phonesClose(tel, row.phoneE164 || row.phoneDigits) && namesClose(company, row.displayName));
  const dbName = directoryRows.some((row) => namesClose(company, row.displayName));
  const dbAddress = directoryRows.some((row) => namesClose(company, row.displayName) && addressClose(address, row.address));
  const kakaoItem = kakao && "item" in kakao ? kakao.item : null;
  const naverItem = naver.find((item) => namesClose(company, item.title)) || null;
  const place = kakaoItem && namesClose(company, kakaoItem.place_name) ? kakaoItem : null;
  const placeName = Boolean(place || naverItem);
  const placePhone = Boolean(
    (place && phonesClose(tel, place.telephone)) || (naverItem && phonesClose(tel, naverItem.telephone))
  );
  const placeAddress = Boolean(
    (place && addressClose(address, place.road_address || place.address)) ||
      (naverItem && addressClose(address, naverItem.roadAddress || naverItem.address))
  );
  return decideBizcardTrust({
    dbPhone: dbPhone || Boolean(store && phonesClose(tel, store.telephone) && namesClose(company, store.storeName)),
    dbName: dbName || Boolean(store && namesClose(company, store.storeName)),
    dbAddress,
    placeName,
    placePhone,
    placeAddress,
    publicStore: Boolean(store && namesClose(company, store.storeName)),
    phoneHint: phoneHit && !dbPhone
  });
}
