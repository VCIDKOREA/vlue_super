/**
 * VLUE 확정 브랜드 공간 네이밍
 * @see 프로덕트 세계관 — VLUE Case / VLUE Showcase
 */

/** 앱 내부 개인 프로필·설정 공간 */
export const VLUE_CASE = {
  id: "vlue-case",
  nameKo: "블루케이스",
  nameEn: "VLUE Case",
  tagline: "스마트폰 안의 번호와 통신을 보이스피싱으로부터 보호하는 공간"
};

/** 통화 시 상단 바 → 전면 확장되는 송출 피드 */
export const VLUE_SHOWCASE = {
  id: "vlue-showcase",
  nameKo: "블루 쇼케이스",
  nameEn: "VLUE Showcase",
  tagline: "통화 순간 전면을 장악하며 일상·명함을 공개하는 화면"
};

/** 웹뷰 포털 쇼케이스 경로 (알림톡 아웃링크) — 숫자만 */
export function buildShowcaseWebPath(phoneE164OrRaw) {
  const digits = String(phoneE164OrRaw || "").replace(/\D/g, "");
  const local = digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
  return `/site/web/showcase/${local || ""}`;
}

export function showcasePreviewLabel() {
  return `${VLUE_SHOWCASE.nameKo} 미리보기`;
}

export function caseSectionLabel() {
  return VLUE_CASE.nameKo;
}
