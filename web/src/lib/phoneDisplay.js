import { formatLetteringPhoneDisplay, toKoreaNationalDigits } from "./letteringPhoneMatch.js";

/** E.164(+8210…) 또는 숫자열을 국내 표시용(010-0000-0000 등)으로만 변환 */
export function formatPhoneE164ForKoreaDisplay(e164) {
  if (e164 == null || e164 === "") return "";
  const formatted = formatLetteringPhoneDisplay(e164);
  if (formatted && formatted !== "—") return formatted;
  const d = toKoreaNationalDigits(e164);
  return d || String(e164).trim();
}
