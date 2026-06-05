/** www(bolt) 전용 — 앱 lib 미참조 */
const policeLogoSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
  '<rect width="128" height="128" rx="26" fill="#1e3a8a"/>',
  '<path d="M64 28l8 16h18l-14 11 5 17-17-12-17 12 5-17-14-11h18z" fill="#fbbf24"/>',
  '<circle cx="64" cy="78" r="22" fill="none" stroke="#fff" stroke-width="5"/>',
  '</svg>',
].join('');

const fssLogoSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
  '<rect width="128" height="128" rx="26" fill="#0f766e"/>',
  '<text x="64" y="72" text-anchor="middle" font-size="36" font-weight="800" fill="#fff" font-family="sans-serif">FSS</text>',
  '</svg>',
].join('');

export const MARKETING_POLICE_LOGO = `data:image/svg+xml,${encodeURIComponent(policeLogoSvg)}`;
export const MARKETING_FSS_LOGO = `data:image/svg+xml,${encodeURIComponent(fssLogoSvg)}`;
