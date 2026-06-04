/** 디지털 인증명함 — 가변형 디자인 템플릿 (보안 오버레이는 모든 테마 공통) */

export const LETTERING_BIZCARD_TEMPLATES = [
  {
    id: "classic-light",
    label: "기본형",
    description: "밝은 정통 명함 · 기본"
  },
  {
    id: "modern-dark",
    label: "모던 다크",
    description: "미니멀 다크 톤 · IT·컨설팅"
  },
  {
    id: "professional-gold",
    label: "프로페셔널 골드",
    description: "신뢰감 있는 골드 포인트 · 금융·법률"
  },
  {
    id: "creative-gradient",
    label: "크리에이티브",
    description: "그라데이션 · 스타트업·크리에이터"
  }
];

export const DEFAULT_LETTERING_BIZCARD_TEMPLATE = "classic-light";

export function isLetteringBizcardTemplateId(id) {
  return LETTERING_BIZCARD_TEMPLATES.some((t) => t.id === id);
}

export function normalizeLetteringBizcardTemplate(id) {
  const v = String(id || "").trim();
  return isLetteringBizcardTemplateId(v) ? v : DEFAULT_LETTERING_BIZCARD_TEMPLATE;
}

export function letteringBizcardThemeClass(templateId) {
  return `lettering-bizcard--theme-${normalizeLetteringBizcardTemplate(templateId)}`;
}
