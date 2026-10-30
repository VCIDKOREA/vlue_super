/**
 * 한국 번호 → +82… E.164 정규화.
 * Google 주소록이 +82 010-xxxx / 82010xxxx 형태로 내보내는 경우도
 * 표준 +8210xxxx 로 합친다.
 */

export function digitsOnlyPhone(input: string): string {
  return String(input || "").replace(/\D/g, "");
}

/** 국내 표기(010…)로 통일한 뒤 E.164 후보를 만든다 */
export function toKoreaLocalDigits(input: string): string {
  let d = digitsOnlyPhone(input);
  if (!d) return "";
  /* 국제 트렁크 00 */
  if (d.startsWith("00")) d = d.slice(2);
  /* +82 / 82 뒤에 국내 0이 남은 경우 (+82 010…) */
  if (d.startsWith("82") && d.length >= 11) {
    const rest = d.slice(2);
    if (rest.startsWith("0")) return rest;
    return `0${rest}`;
  }
  if (d.startsWith("0")) return d;
  if (d.length >= 9 && d.length <= 11) return `0${d}`;
  return d;
}

/** 한국 번호를 +82… E.164 형태로 정규화 (매칭·가입용) */
export function normalizeToE164KR(input: string): string | null {
  const local = toKoreaLocalDigits(input);
  if (!local) return null;

  /* 전국 대표번호 8자리 (1577·1588·1600·1800 등) */
  if (/^1[3-9]\d{6}$/.test(local.replace(/^0/, "")) && local.length === 8) {
    return `+82${local}`;
  }
  if (/^01[016789]\d{7,8}$/.test(local) || /^0[2-6]\d{7,9}$/.test(local)) {
    return `+82${local.slice(1)}`;
  }
  if (/^1[3-9]\d{6}$/.test(local)) {
    return `+82${local}`;
  }
  /* 이미 정규화된 형태에 가까운 숫자만 남은 경우 */
  const d = digitsOnlyPhone(input);
  if (d.startsWith("82") && d.length >= 10) {
    const collapsed = toKoreaLocalDigits(d);
    if (collapsed.startsWith("0") && collapsed.length >= 9) {
      return `+82${collapsed.slice(1)}`;
    }
  }
  if (local.length >= 9 && local.length <= 12 && local.startsWith("0")) {
    return `+82${local.slice(1)}`;
  }
  return null;
}

/**
 * DB phoneE164 가 +8210… / 8210… / 010… 등으로 섞여 있어도
 * 매칭되도록 동일 번호의 변형 집합을 만든다.
 */
export function phoneMatchVariants(input: string): string[] {
  const e164 = normalizeToE164KR(input);
  const local = toKoreaLocalDigits(input);
  const out = new Set<string>();
  if (e164) {
    out.add(e164);
    const digits = e164.replace(/\D/g, "");
    out.add(digits);
    out.add(`+${digits}`);
  }
  if (local) {
    out.add(local);
    out.add(local.replace(/\D/g, ""));
    if (local.startsWith("0") && local.length >= 10) {
      out.add(`82${local.slice(1)}`);
      out.add(`+82${local.slice(1)}`);
    }
  }
  return [...out].filter(Boolean);
}
