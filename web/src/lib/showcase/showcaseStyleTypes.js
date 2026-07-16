/** VLUE Showcase 5대 스타일 타입 */
export const SHOWCASE_STYLE_TYPES = {
  default: {
    id: "default",
    label: "기본형",
    desc: "번호 + VLUE 안심 안내",
    shortDesc: "통화 화면에 번호·안심 문구만 표시",
    emoji: "📞",
    accent: "#2b6ff0",
    bgmSource: "none",
    tier: "free"
  },
  kakao: {
    id: "kakao",
    label: "카카오톡",
    desc: "카톡 프로필 연동",
    shortDesc: "카카오톡 프로필 링크·피드 스타일",
    emoji: "💬",
    accent: "#FEE500",
    bgmSource: "platform",
    tier: "free"
  },
  instagram: {
    id: "instagram",
    label: "인스타그램",
    desc: "인스타 게시물 Native 임베드",
    shortDesc: "게시물·릴스 URL을 쇼케이스 박스에 원본 표시",
    emoji: "📷",
    accent: "#E1306C",
    bgmSource: "platform",
    tier: "free"
  },
  rich_custom: {
    id: "rich_custom",
    label: "개인스타일",
    desc: "폰트·사진·BGM 꾸미기",
    shortDesc: "사진·글꼴·음악을 직접 꾸미기",
    emoji: "✨",
    accent: "#7c3aed",
    bgmSource: "vlue",
    tier: "free"
  },
  certificate: {
    id: "certificate",
    label: "디지털인증명함",
    desc: "상호·직급 비즈니스 카드",
    shortDesc: "유료 · 공식 인증 명함형 송출",
    emoji: "🪪",
    accent: "#0d9488",
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
