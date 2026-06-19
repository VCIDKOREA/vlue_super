/** Windows PC 설치 파일 — 단일 출처 */
export const VLUE_PC_INSTALLER_FILENAME = "VLUE-Setup-1.0.0.exe";
export const VLUE_PC_INSTALLER_VERSION = "1.0.0-icon2";

/** GitHub Release (Cloudflare·SPA 캐시 우회용 기본 다운로드 URL) */
export const VLUE_PC_GITHUB_RELEASE_URL =
  "https://github.com/VCIDKOREA/vlue_super/releases/download/pc-v1.0.0/VLUE-Setup-1.0.0.exe";

/** @param {string} [origin] */
export function buildSameOriginInstallerUrl(origin) {
  const base = String(origin || "https://www.vlue.kr").replace(/\/$/, "");
  return `${base}/downloads/${VLUE_PC_INSTALLER_FILENAME}?v=${VLUE_PC_INSTALLER_VERSION}`;
}
