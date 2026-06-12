/** 검색 교차검증 → VLUE 쇼핑 상점 프로필 이동 */
export const PENDING_VLUE_STORE_KEY = "vlue_pending_store_profile_v1";

export function navigateToVluePartnerStore(storeId) {
  const id = String(storeId || "").trim();
  if (!id) return;
  try {
    sessionStorage.setItem(PENDING_VLUE_STORE_KEY, id);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.location.hash = "shopping";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function consumePendingVlueStoreId() {
  try {
    const id = sessionStorage.getItem(PENDING_VLUE_STORE_KEY);
    if (id) sessionStorage.removeItem(PENDING_VLUE_STORE_KEY);
    return id || "";
  } catch {
    return "";
  }
}
