import { normalizePhoneDigits } from "./governmentHotlines.js";

/** 저장되지 않은 모르는 번호 유형 — 가족보호 장시간 통화 알림 */
export type KrPhoneKind = "mobile" | "representative" | "landline";

export function isNationwideRepresentativeDigits(d: string): boolean {
  return /^1[3-9]\d{6}$/.test(d);
}

/**
 * 일반내선 · 대표번호 · 휴대폰번호 분류.
 * - 휴대폰: 010·011·016·017·018·019
 * - 대표번호: 전국대표(15xx·16xx·18xx 등 8자리), 080 수신료
 * - 일반내선: 유선·지역번호·070·내선성 짧은 번호 등 나머지
 */
export function classifyKrPhoneKind(phone: string): KrPhoneKind {
  let d = normalizePhoneDigits(phone);
  if (!d) return "landline";
  if (d.startsWith("82") && d.length >= 10) d = `0${d.slice(2)}`;
  if (d.length === 9 && d.startsWith("0") && isNationwideRepresentativeDigits(d.slice(1))) {
    d = d.slice(1);
  }
  if (isNationwideRepresentativeDigits(d)) return "representative";
  if (d.startsWith("080")) return "representative";
  if (/^01[016789]\d{7,8}$/.test(d)) return "mobile";
  return "landline";
}

export function krPhoneKindLabel(kind: KrPhoneKind): string {
  if (kind === "mobile") return "휴대폰번호";
  if (kind === "representative") return "대표번호";
  return "일반내선";
}
