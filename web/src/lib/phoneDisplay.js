/** E.164(+8210…) 또는 숫자열을 국내 표시용(010-0000-0000 등)으로만 변환 */
export function formatPhoneE164ForKoreaDisplay(e164) {
  if (e164 == null || e164 === "") return "";
  const digits = String(e164).replace(/\D/g, "");
  if (!digits) return String(e164).trim();
  let d = digits;
  if (digits.startsWith("82")) d = `0${digits.slice(2)}`;
  if (d.length === 11 && d.startsWith("010")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10 && d.startsWith("02")) {
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return String(e164).trim();
}
