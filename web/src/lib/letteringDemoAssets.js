import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";

/** Lettering big-push / bizcard preview demo logo (inline, encoding-safe) */
const SAMSUNG_LIFE_LOGO_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
  '<defs><linearGradient id="sl" x1="0%" y1="0%" x2="100%" y2="100%">',
  '<stop offset="0%" stop-color="#0057b8"/>',
  '<stop offset="100%" stop-color="#003d82"/>',
  "</linearGradient></defs>",
  '<rect width="128" height="128" rx="26" fill="url(#sl)"/>',
  '<circle cx="64" cy="54" r="28" fill="none" stroke="#fff" stroke-width="5.5"/>',
  '<path d="M64 40v28M50 54h28" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  '<circle cx="64" cy="54" r="6" fill="#fff"/>',
  "</svg>"
].join("");

export const LETTERING_DEMO_COMPANY_LOGO = `data:image/svg+xml,${encodeURIComponent(
  SAMSUNG_LIFE_LOGO_SVG
)}`;

const POLICE_LOGO_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
  '<rect width="128" height="128" rx="26" fill="#1e3a8a"/>',
  '<path d="M64 28l8 16h18l-14 11 5 17-17-12-17 12 5-17-14-11h18z" fill="#fbbf24"/>',
  '<circle cx="64" cy="78" r="22" fill="none" stroke="#fff" stroke-width="5"/>',
  "</svg>"
].join("");

const FSS_LOGO_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
  '<rect width="128" height="128" rx="26" fill="#0f766e"/>',
  '<text x="64" y="72" text-anchor="middle" font-size="36" font-weight="800" fill="#fff" font-family="sans-serif">FSS</text>',
  "</svg>"
].join("");

export const LETTERING_DEMO_POLICE_LOGO = `data:image/svg+xml,${encodeURIComponent(POLICE_LOGO_SVG)}`;
export const LETTERING_DEMO_FSS_LOGO = `data:image/svg+xml,${encodeURIComponent(FSS_LOGO_SVG)}`;

/** Demo card: use company logo when logoUrl missing */
export function resolveLetteringDemoLogoUrl(card = {}) {
  const logo = String(card.logoUrl || card.logo_url || "").trim();
  if (logo) return logo;
  const org = String(card.organization || card.companyName || "").trim();
  const orgUp = org.toUpperCase();
  /* VCID / VLUE — 본인 명함과 동일하게 브랜드 로고 */
  if (
    orgUp.includes("VCID") ||
    orgUp.includes("VLUE") ||
    org.includes("\uBE14\uB8E8") /* 블루 */
  ) {
    return VLUE_SHIELD_LOGO;
  }
  if (org.includes("\uC0BC\uC131\uC0DD\uBA85")) return LETTERING_DEMO_COMPANY_LOGO;
  if (org.includes("\uACBD\uCC30\uCCAD")) return LETTERING_DEMO_POLICE_LOGO;
  if (org.includes("\uAE08\uC735\uAC10\uB3C5\uC6D0")) return LETTERING_DEMO_FSS_LOGO;
  return "";
}
