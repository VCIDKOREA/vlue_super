/** 디지털 명함 — 사용유효기간 표시 (발급일 + 유료 구독 1년 기준) */

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatBizcardValidityDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

/** 발급일 기준 1년 — 서버 유료 멤버십 검증과 동일한 안내용 */
export function resolveBizcardValidUntilIso(issuedAt) {
  const base = new Date(issuedAt || "");
  if (Number.isNaN(base.getTime())) return null;
  const end = new Date(base);
  end.setFullYear(end.getFullYear() + 1);
  return end.toISOString();
}

export function formatBizcardValidUntilLabel(issuedAt) {
  const until = resolveBizcardValidUntilIso(issuedAt);
  if (!until) return "";
  return formatBizcardValidityDate(until);
}
