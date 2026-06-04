import { readCardWallet } from "./cardWalletStorage.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";

/** 무료 회원(VLUE 일반번호) 접힘 — 주의 문구 */
export const VLUE_FREE_TIER_CAUTION =
  "주의: 유선상로 금전거래 또는 정보 유출에 주의바랍니다.";

/** 지갑에 저장된 명함에서 번호 일치 시 성명 조회 */
export function findWalletSavedNameForPhone(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";

  for (const item of readCardWallet()) {
    const snap = item?.snapshot;
    if (!snap || typeof snap !== "object") continue;
    const snapDigits = normalizePhoneDigits(snap.phone);
    if (snapDigits && snapDigits === digits) {
      const name = String(snap.name || snap.legalName || "").trim();
      if (name) return name;
    }
  }
  return "";
}

/**
 * 무료 회원 접힘 영역 — 전화번호+V 또는 저장된 번호·성명
 * @param {{ incomingNumber?: string, cardPhone?: string, savedContactName?: string, savedContactPhone?: string }} input
 */
export function resolveFreeTierSummary({
  incomingNumber = "",
  cardPhone = "",
  savedContactName = "",
  savedContactPhone = ""
} = {}) {
  const phoneRaw = String(savedContactPhone || incomingNumber || cardPhone || "").trim();
  const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw);
  const savedName = String(savedContactName || "").trim() || findWalletSavedNameForPhone(phoneRaw);

  if (savedName) {
    return {
      mode: "saved",
      primary: savedName,
      secondary: phoneDisplay,
      phoneDisplay
    };
  }

  return {
    mode: "phone",
    primary: phoneDisplay,
    secondary: "",
    phoneDisplay
  };
}
