import { normalizeToE164KR } from "./phoneE164.js";

/** E.164 / 국내 번호 → 010-0000-0000 / 1577-8746 표시 */
export function formatPhoneDisplayKR(raw: string): string {
  const e164 = normalizeToE164KR(raw) || String(raw || "").trim();
  let local = e164.replace(/\D/g, "");
  if (local.startsWith("00")) local = local.slice(2);
  if (local.startsWith("82")) local = local.slice(2);
  if (local.startsWith("0") && local.length === 9 && /^1[3-9]\d{6}$/.test(local.slice(1))) {
    local = local.slice(1);
  }
  if (/^1[3-9]\d{6}$/.test(local)) {
    return `${local.slice(0, 4)}-${local.slice(4)}`;
  }
  if (!local.startsWith("0")) local = `0${local}`;
  if (local.length === 11 && local.startsWith("010")) {
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10 && local.startsWith("02")) {
    return `${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
  }
  if (local.length >= 9 && local.length <= 11 && local.startsWith("0")) {
    const mid = local.length === 10 ? 3 : 4;
    return `${local.slice(0, 3)}-${local.slice(3, 3 + mid)}-${local.slice(3 + mid)}`;
  }
  return raw || e164;
}
