/**
 * VLUE 쇼케이스 BGM — 음원 출처·상업적 안전성 정책 (프론트 미러)
 *
 * 상업 서비스이므로 Creative Commons · Commercial Use Allowed 만 허용.
 * license 미확인·NC·all-rights-reserved 트랙은 UI에 표시하지 않음.
 * 상세 규칙은 apps/api/src/lib/musicLicensePolicy.ts 와 동일.
 */

export const SOUNDCLOUD_COMMERCIAL_CC_LICENSES = [
  "cc-by",
  "cc-by-sa",
  "cc-by-nd",
  "no-rights-reserved"
];

export function normalizeSoundCloudLicense(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

export function isCommercialCreativeCommonsLicense(rawLicense) {
  const license = normalizeSoundCloudLicense(rawLicense);
  if (!license) return false;
  if (license.includes("nc") || license.includes("noncommercial") || license.includes("non-commercial")) {
    return false;
  }
  if (license === "all-rights-reserved" || license.includes("all-rights")) return false;
  if (SOUNDCLOUD_COMMERCIAL_CC_LICENSES.includes(license)) return true;
  if (license === "cc0" || license === "public-domain" || license === "pd") return true;
  if (license.startsWith("cc-by") && !license.includes("nc")) return true;
  return false;
}
