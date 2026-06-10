/** 홍보 VLUER 신청 — SNS/채널 URL 형식 검사 */
export function isValidPromoUrl(raw) {
  const t = String(raw || "").trim();
  if (!t) return false;
  try {
    const url = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://${t}`);
    const host = url.hostname.replace(/^www\./i, "");
    if (!host || !host.includes(".")) return false;
    if (host === "localhost") return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}
