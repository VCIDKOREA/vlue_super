export const OPEN_POS_DASHBOARD_KEY = "vlue_open_pos_dashboard_v1";
export const EXPAND_FAMILY_KEY = "vlue_expand_family_protection_v1";
/** 친구 화면에서 「가족 보호」탭으로 전환 */
export const OPEN_FAMILY_TAB_EVENT = "vlue-open-family-protection-tab";

/** 가족보호 화면(친구 > 가족 보호 탭 + 등록 패널 펼침) 진입 플래그 */
export function requestOpenFamilyProtectionTab() {
  try {
    sessionStorage.setItem(EXPAND_FAMILY_KEY, "1");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_FAMILY_TAB_EVENT));
  }
}
