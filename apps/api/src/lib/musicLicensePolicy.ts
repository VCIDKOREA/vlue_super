/**
 * =============================================================================
 * VLUE 쇼케이스 BGM — 음원 출처·상업적 안전성 정책 (Source Verification)
 * =============================================================================
 *
 * 본 앱은 상업적 서비스입니다. 저작권 분쟁 예방을 위해 아래 규칙을 강제합니다.
 *
 * 1) 허용 라이선스만 검색·노출 (Creative Commons · Commercial Use Allowed)
 *    - cc-by, cc-by-sa, cc-by-nd, no-rights-reserved (CC0에 준하는 퍼블릭 도메인 표기)
 * 2) 제외
 *    - all-rights-reserved
 *    - cc-by-nc / cc-by-nc-sa / cc-by-nc-nd (비영리 전용)
 *    - license 필드 없음·미지원·알 수 없음 → 결과에 포함하지 않음
 * 3) 출처 확인(Source Verification)
 *    - 검색 결과는 반드시 license 문자열이 위 허용 목록에 매칭되어야 함
 *    - 매칭 실패 트랙은 normalize 단계에서 drop
 *    - 클라이언트에 license / licenseLabel / sourceVerified / attribution 을 전달
 * 4) 추가 주의
 *    - SoundCloud 임베드·지역 제한은 별도 UX(스킵)로 처리
 *    - CC 라이선스라도 아티스트 크레딧(attribution) 표시를 권장·저장함
 *    - 법무 최종 해석은 라이선스 deed / SoundCloud ToS를 따름 (코드는 보수적 필터)
 *
 * =============================================================================
 */

/** SoundCloud API `license` 값 — 상업적 이용 허용 CC만 */
export const SOUNDCLOUD_COMMERCIAL_CC_LICENSES = [
  "cc-by",
  "cc-by-sa",
  "cc-by-nd",
  "no-rights-reserved"
] as const;

export type SoundCloudCommercialCcLicense = (typeof SOUNDCLOUD_COMMERCIAL_CC_LICENSES)[number];

const LICENSE_LABELS: Record<string, string> = {
  "cc-by": "CC BY (상업 이용 가능 · 출처 표기)",
  "cc-by-sa": "CC BY-SA (상업 이용 가능 · 동일조건공유)",
  "cc-by-nd": "CC BY-ND (상업 이용 가능 · 변경 금지)",
  "no-rights-reserved": "CC0 / No Rights Reserved (상업 이용 가능)"
};

export function normalizeSoundCloudLicense(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

/**
 * Creative Commons — Commercial Use Allowed 판정.
 * license가 없거나 알 수 없으면 false (검색 결과 제외).
 */
export function isCommercialCreativeCommonsLicense(rawLicense: unknown): boolean {
  const license = normalizeSoundCloudLicense(rawLicense);
  if (!license) return false;
  if (license.includes("nc") || license.includes("noncommercial") || license.includes("non-commercial")) {
    return false;
  }
  if (license === "all-rights-reserved" || license.includes("all-rights")) return false;
  if ((SOUNDCLOUD_COMMERCIAL_CC_LICENSES as readonly string[]).includes(license)) return true;
  /* 변형 표기: creative-commons-by 등 */
  if (license === "cc0" || license === "public-domain" || license === "pd") return true;
  if (license.startsWith("cc-by") && !license.includes("nc")) return true;
  return false;
}

export function soundCloudLicenseLabel(rawLicense: unknown): string {
  const license = normalizeSoundCloudLicense(rawLicense);
  return LICENSE_LABELS[license] || (license ? `License: ${license}` : "라이선스 미확인");
}

/**
 * 음원 출처 확인 결과 — API/클라이언트가 동일 스키마로 저장
 */
export type MusicSourceVerification = {
  /** 항상 true 인 트랙만 노출 (검증 통과) */
  sourceVerified: true;
  /** 상업용 CC 통과 */
  commercialCcOnly: true;
  provider: "soundcloud";
  license: string;
  licenseLabel: string;
  attribution: string;
  permalinkUrl: string;
  verifiedAt: string;
};

export function buildSoundCloudSourceVerification(input: {
  license: string;
  title: string;
  artist: string;
  permalinkUrl: string;
}): MusicSourceVerification | null {
  if (!isCommercialCreativeCommonsLicense(input.license)) return null;
  const license = normalizeSoundCloudLicense(input.license);
  const artist = String(input.artist || "Unknown").trim();
  const title = String(input.title || "Untitled").trim();
  return {
    sourceVerified: true,
    commercialCcOnly: true,
    provider: "soundcloud",
    license,
    licenseLabel: soundCloudLicenseLabel(license),
    attribution: `${title} — ${artist} (${soundCloudLicenseLabel(license)}) via SoundCloud`,
    permalinkUrl: String(input.permalinkUrl || "").trim(),
    verifiedAt: new Date().toISOString()
  };
}
