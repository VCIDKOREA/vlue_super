/** VLUE 프리미엄 파트너 전용 상점 프로필 (검색 교차검증 → 쇼핑 연결) */
export const VLUE_CERTIFIED_STORE_PROFILES = {
  "vlue-001": {
    storeId: "vlue-001",
    channelName: "명경채 요양병원",
    verified: true,
    itemCount: 0,
    liveCount: 0,
    shopMode: "PAGE",
    items: [],
    certNumber: "VLUE-MED-2024-0031",
    category: "의료기관 / 요양병원",
    description: "VLUE 인증 요양병원 파트너 상점입니다.",
  },
  "vlue-002": {
    storeId: "vlue-002",
    channelName: "다다오피스",
    verified: true,
    itemCount: 0,
    liveCount: 0,
    shopMode: "PAGE",
    items: [],
    certNumber: "VLUE-BIZ-2024-0087",
    category: "비즈니스 서비스 / 공유오피스",
    description: "VLUE 인증 프리미엄 파트너 다다오피스 공식 상점입니다.",
  },
  "vlue-003": {
    storeId: "vlue-003",
    channelName: "한국신뢰금융",
    verified: true,
    itemCount: 0,
    liveCount: 0,
    shopMode: "PAGE",
    items: [],
    certNumber: "VLUE-FIN-2025-0012",
    category: "금융기관 / 대출중개",
    description: "VLUE 인증 금융 파트너 상점입니다.",
  },
};

export function getVlueCertifiedStoreProfile(storeId) {
  return VLUE_CERTIFIED_STORE_PROFILES[String(storeId || "").trim()] || null;
}
