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

/** Demo card: use company logo when logoUrl missing */
export function resolveLetteringDemoLogoUrl(card = {}) {
  const logo = String(card.logoUrl || card.logo_url || "").trim();
  if (logo) return logo;
  const org = String(card.organization || card.companyName || "").trim();
  if (org.includes("\uC0BC\uC131\uC0DD\uBA85")) return LETTERING_DEMO_COMPANY_LOGO;
  return "";
}
