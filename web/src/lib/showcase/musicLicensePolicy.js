/**
 * SoundCloud 라이선스 런타임 체크는 비활성.
 * showcaseSoundCloudSearch 등 기존 import가 깨지지 않도록 stub만 유지.
 */

export const SOUNDCLOUD_COMMERCIAL_CC_LICENSES = [];

export function normalizeSoundCloudLicense(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/** @deprecated 로컬 JSON 카탈로그 전환으로 라이선스 런타임 검증 미사용 — 항상 true */
export function isCommercialCreativeCommonsLicense(_rawLicense) {
  return true;
}
