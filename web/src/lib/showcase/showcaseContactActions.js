/** 쇼케이스 명함 — 전화·메일·웹 링크 액션 */

export function digitsForTel(raw) {
  return String(raw || "").replace(/[^\d+]/g, "");
}

export function formatTelHref(raw) {
  const d = digitsForTel(raw);
  return d ? `tel:${d}` : "";
}

export function formatMailtoHref(raw) {
  const e = String(raw || "").trim();
  return e ? `mailto:${e}` : "";
}

export function formatWebHref(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("tel:")) return u;
  return `https://${u.replace(/^\/\//, "")}`;
}

export function openExternalHref(href) {
  const h = String(href || "").trim();
  if (!h) return false;
  try {
    if (h.startsWith("tel:") || h.startsWith("mailto:")) {
      window.location.href = h;
      return true;
    }
    window.open(h, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    try {
      window.location.href = h;
      return true;
    } catch {
      return false;
    }
  }
}

export function openPhoneDial(raw) {
  const href = formatTelHref(raw);
  return href ? openExternalHref(href) : false;
}

export function openEmailLink(raw) {
  const href = formatMailtoHref(raw);
  return href ? openExternalHref(href) : false;
}

export function openWebsiteLink(raw) {
  const href = formatWebHref(raw);
  return href ? openExternalHref(href) : false;
}

/** 스냅샷에 링크용 연락처 필드 보존 */
export function pickShowcaseContactFields(card = {}) {
  return {
    phone: String(card.phone || "").trim(),
    email: String(card.email || "").trim(),
    website: String(card.website || "").trim(),
    fax: String(card.fax || "").trim(),
    address: String(card.address || "").trim(),
    companyIntro: String(card.companyIntro || card.salesContent || card.introBack || "").trim(),
    verificationItems: Array.isArray(card.verificationItems) ? card.verificationItems.slice(0, 8) : []
  };
}
