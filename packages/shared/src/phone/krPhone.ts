/** 숫자만 E.164 스타일로 (KR 기본 82) — 웹·API 공통 */

function toKoreaLocalDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("82") && d.length >= 11) {
    const rest = d.slice(2);
    if (rest.startsWith("0")) return rest;
    return `0${rest}`;
  }
  if (d.startsWith("0")) return d;
  if (d.length >= 9 && d.length <= 11) return `0${d}`;
  return d;
}

export function normalizeKrPhone(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  const local = toKoreaLocalDigits(phone);
  if (local.length < 9) return undefined;
  if (local.startsWith("0")) return `+82${local.slice(1)}`;
  if (/^1[3-9]\d{6}$/.test(local)) return `+82${local}`;
  return `+82${local}`;
}
