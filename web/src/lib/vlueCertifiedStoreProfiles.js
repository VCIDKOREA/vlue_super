/** VLUE 프리미엄 파트너 전용 상점 프로필 (검색 교차검증 → 쇼핑 연결). 데모 시드 없음. */
export const VLUE_CERTIFIED_STORE_PROFILES = {};

export function getVlueCertifiedStoreProfile(storeId) {
  return VLUE_CERTIFIED_STORE_PROFILES[String(storeId || "").trim()] || null;
}
