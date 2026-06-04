/** 한국 번호를 +82… E.164 형태로 단순 정규화 (데모·매칭용) */
export function normalizeToE164KR(input: string): string | null {
  const d = String(input || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("82") && d.length >= 10) return `+${d}`;
  if (d.startsWith("0") && d.length >= 9) return `+82${d.slice(1)}`;
  if (d.length >= 9 && d.length <= 11 && !d.startsWith("0")) return `+82${d}`;
  return null;
}
