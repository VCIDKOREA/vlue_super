/** VLUE Showcase 5대 스타일 타입 */
export const SHOWCASE_STYLE_TYPES = {
  default: {
    id: "default",
    label: "기본형",
    desc: "번호 + VLUE 안심 안내 (BGM 없음)",
    bgmSource: "none",
    tier: "free"
  },
  kakao: {
    id: "kakao",
    label: "카카오톡",
    desc: "카톡 프로필 링크로 피드 송출 (플랫폼 BGM)",
    bgmSource: "platform",
    tier: "free"
  },
  instagram: {
    id: "instagram",
    label: "인스타그램",
    desc: "인스타 프로필 링크로 피드 송출 (플랫폼 BGM)",
    bgmSource: "platform",
    tier: "free"
  },
  rich_custom: {
    id: "rich_custom",
    label: "개인스타일",
    desc: "폰트·이모티·자체 BGM 꾸미기",
    bgmSource: "vlue",
    tier: "free"
  },
  certificate: {
    id: "certificate",
    label: "디지털인증명함",
    desc: "상호·직급·로고 비즈니스 카드 (유료)",
    bgmSource: "vlue",
    tier: "paid"
  }
};

export const SHOWCASE_STYLE_LIST = Object.values(SHOWCASE_STYLE_TYPES);

export const SHOWCASE_FONT_SETS = [
  { id: "pretendard", label: "프리텐다드", tier: "free", css: "'Pretendard Variable', Pretendard, sans-serif" },
  { id: "maruburi", label: "마루부리", tier: "free", css: "'MaruBuri', 'Apple SD Gothic Neo', sans-serif" },
  { id: "escoredream", label: "에스코어드림", tier: "free", css: "'S-CoreDream', 'Noto Sans KR', sans-serif" },
  { id: "noto", label: "Noto Sans KR", tier: "free", css: "'Noto Sans KR', sans-serif" },
  { id: "gothic", label: "Apple SD Gothic", tier: "free", css: "'Apple SD Gothic Neo', sans-serif" }
];

export const SHOWCASE_CASE_FRAMES = [
  { id: "classic", label: "클래식", accent: "#2b6ff0" },
  { id: "midnight", label: "미드나잇", accent: "#1e293b" },
  { id: "rose", label: "로즈골드", accent: "#be4b6a" },
  { id: "mint", label: "민트", accent: "#0d9488" },
  { id: "lavender", label: "라벤더", accent: "#7c3aed" }
];
