import { normalizeToE164KR } from "./phoneE164.js";

/** E.164 / 국내 번호 → 010-0000-0000 표시 */
export function formatPhoneDisplayKR(raw: string): string {
  const e164 = normalizeToE164KR(raw) || String(raw || "").trim();
  const digits = e164.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("82")) local = `0${local.slice(2)}`;
  if (local.length === 11 && local.startsWith("010")) {
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10 && local.startsWith("02")) {
    return `${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
  }
  if (local.length >= 9 && local.length <= 11 && local.startsWith("0")) {
    const head = local.length === 10 ? 3 : 3;
    const mid = local.length === 10 ? 3 : 4;
    return `${local.slice(0, head)}-${local.slice(head, head + mid)}-${local.slice(head + mid)}`;
  }
  return raw || e164;
}
