/**
 * Android WebView — OS 상태바 시스템 알림 (FCM 토큰 없이도 SSE/알림함 신규 건에 표시)
 */
export function postAndroidSystemNotification(title, body, tag = "") {
  try {
    const t = String(title || "").trim() || "VLUE";
    const b = String(body || "").trim() || t;
    const g = String(tag || "").trim();
    if (window.Android?.showSystemNotification) {
      window.Android.showSystemNotification(t, b, g);
      return true;
    }
    if (window.VlueAndroid?.showSystemNotification) {
      window.VlueAndroid.showSystemNotification(t, b, g);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 가족보호·초대 등 중요 카테고리만 OS 푸시 */
export function maybePostAndroidPushForInboxItem(item) {
  if (!item || item.isNew === false) return false;
  const category = String(item.category || "");
  const title = String(item.title || "");
  const body = String(item.body || "");
  const family =
    category.includes("가족") ||
    /가족 보호|승인 요청|초대/.test(`${title} ${body}`);
  if (!family && category !== "팔로우" && category !== "결제") return false;
  const tag = String(item.serverId || item.id || title).slice(0, 64);
  return postAndroidSystemNotification(title || category, body || title, tag);
}
