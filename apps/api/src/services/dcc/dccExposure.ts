/**
 * DCC 검색·팔로우 노출 — 전화/주소만 마스킹.
 * 통화 오버레이·공유 링크·수락된 지인 친구는 이 모듈을 타지 않거나 full 로 통과한다.
 */

export type DccExposurePurpose = "search" | "follow" | "full";

export type DccExposureFlags = {
  isPhoneSearchAllowed: boolean;
  isAddressSearchAllowed: boolean;
  isPhoneFollowersAllowed: boolean;
  isAddressFollowersAllowed: boolean;
};

export type DccExposureChoice = {
  phoneSearch: boolean | null;
  addressSearch: boolean | null;
  phoneFollow: boolean | null;
  addressFollow: boolean | null;
};

export const MASKED_KR_MOBILE = "010-****-****";

/** 저장 전 — 검색/팔로우 전화·주소 4항목이 모두 지정돼야 함 */
export function isDccExposureComplete(choice: DccExposureChoice): boolean {
  return (
    typeof choice.phoneSearch === "boolean" &&
    typeof choice.addressSearch === "boolean" &&
    typeof choice.phoneFollow === "boolean" &&
    typeof choice.addressFollow === "boolean"
  );
}

export function digitsOnlyPhone(raw: unknown): string {
  return String(raw || "").replace(/\D/g, "");
}

function toKoreaNationalDigits(raw: unknown): string {
  let d = digitsOnlyPhone(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("82")) {
    const rest = d.slice(2);
    d = rest.startsWith("0") ? rest : `0${rest}`;
  }
  return d;
}

/**
 * 검색·팔로우 비공개 번호 표시. 실제 자릿수는 응답에 넣지 않는다.
 * 휴대는 010-****-****, 그 외 국내번호는 국번만 남긴다.
 */
export function maskKrPhoneForDirectory(raw: unknown): string {
  const d = toKoreaNationalDigits(raw);
  if (!d) return MASKED_KR_MOBILE;
  if (d.startsWith("01") && d.length >= 9) return MASKED_KR_MOBILE;
  if (d.startsWith("02")) return "02-****-****";
  if (d.startsWith("0") && d.length >= 9) return `${d.slice(0, 3)}-****-****`;
  return MASKED_KR_MOBILE;
}

export function isMaskedPhoneDisplay(raw: unknown): boolean {
  return String(raw || "").includes("*");
}

/**
 * 도로명·지번 주소에서 시·도 + 시/군/구(+구)만 남긴다.
 * 상세(동·로·번지)는 제거.
 */
export function extractKoreanAddressRegion(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const compact = s.replace(/\s+/g, " ");
  const tokens = compact.split(" ");
  if (!tokens.length) return "";

  const regionBits: string[] = [];
  for (const tok of tokens) {
    if (
      /(특별시|광역시|특별자치시|특별자치도|도)$/.test(tok) ||
      tok === "서울" ||
      tok === "세종"
    ) {
      regionBits.push(tok);
      continue;
    }
    if (/(시|군|구)$/.test(tok)) {
      regionBits.push(tok);
      continue;
    }
    break;
  }
  if (regionBits.length) return regionBits.join(" ");

  const m = compact.match(
    /^((?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|강원특별자치도|전북특별자치도|[가-힣]+도|[가-힣]+시)\s*(?:[가-힣]+시)?\s*(?:[가-힣]+군)?\s*(?:[가-힣]+구)?)/
  );
  return m ? m[1].trim() : compact.split(" ").slice(0, 2).join(" ");
}

export function resolveDirectoryPhone(opts: {
  rawPhone: string;
  allowed: boolean;
  fullAccess: boolean;
}): { phone: string; phoneVisible: boolean; phoneDialEnabled: boolean } {
  const raw = String(opts.rawPhone || "").trim();
  if (opts.fullAccess) {
    return { phone: raw, phoneVisible: Boolean(raw), phoneDialEnabled: Boolean(raw) };
  }
  if (opts.allowed && raw) {
    return { phone: raw, phoneVisible: true, phoneDialEnabled: true };
  }
  return {
    phone: raw ? maskKrPhoneForDirectory(raw) : MASKED_KR_MOBILE,
    phoneVisible: false,
    phoneDialEnabled: false
  };
}

export function resolveDirectoryAddress(opts: {
  rawAddress: string;
  allowed: boolean;
  fullAccess: boolean;
}): { address: string; addressVisible: boolean } {
  const raw = String(opts.rawAddress || "").trim();
  if (!raw) return { address: "", addressVisible: false };
  if (opts.fullAccess || opts.allowed) {
    return { address: raw, addressVisible: true };
  }
  return { address: extractKoreanAddressRegion(raw), addressVisible: false };
}

export function directoryFieldAllowed(
  flags: DccExposureFlags,
  field: "phone" | "address",
  purpose: DccExposurePurpose,
  isActiveFollower: boolean
): boolean {
  if (purpose === "full") return true;
  if (purpose === "search") {
    return field === "phone" ? flags.isPhoneSearchAllowed : flags.isAddressSearchAllowed;
  }
  if (purpose === "follow") {
    if (!isActiveFollower) {
      return field === "phone" ? flags.isPhoneSearchAllowed : flags.isAddressSearchAllowed;
    }
    return field === "phone" ? flags.isPhoneFollowersAllowed : flags.isAddressFollowersAllowed;
  }
  return true;
}
