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

/** Android WebView 또는 브라우저 알림 권한으로 로컬 푸시 표시 */
export function deliverLocalPushNotification(title, body, tag = "") {
  const t = String(title || "").trim() || "VLUE";
  const b = String(body || "").trim() || t;
  const g = String(tag || t).slice(0, 64);
  if (postAndroidSystemNotification(t, b, g)) return true;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(t, { body: b, tag: g, icon: "/favicon.svg" });
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** 가족 보호 초대 — 수락/거절 액션 버튼 포함 OS 알림 */
export function postAndroidFamilyInviteNotification(title, body, linkId = "") {
  try {
    const t = String(title || "").trim() || "가족 보호 초대";
    const b = String(body || "").trim() || t;
    const id = String(linkId || "").trim();
    if (window.Android?.showFamilyInviteNotification) {
      window.Android.showFamilyInviteNotification(t, b, id);
      return true;
    }
    if (window.VlueAndroid?.showFamilyInviteNotification) {
      window.VlueAndroid.showFamilyInviteNotification(t, b, id);
      return true;
    }
  } catch {
    /* ignore */
  }
  return postAndroidSystemNotification(title, body, linkId || "family-invite");
}

/** 알림함 신규 건 — 중요 카테고리 OS/브라우저 푸시 */
export function maybePostAndroidPushForInboxItem(item) {
  if (!item || item.isNew === false) return false;
  const category = String(item.category || "");
  const title = String(item.title || "");
  const body = String(item.body || "");
  const family =
    category.includes("가족") ||
    /가족 보호|승인 요청|초대/.test(`${title} ${body}`);
  const showcase = category === "쇼케이스" || /좋아요|댓글|공유/.test(`${title} ${body}`);
  if (!family && !showcase && category !== "팔로우" && category !== "결제" && category !== "친구") {
    return false;
  }
  const tag = String(item.serverId || item.id || title).slice(0, 64);
  if (item.kind === "family_invite" && item.linkId) {
    return postAndroidFamilyInviteNotification(title || category, body || title, item.linkId);
  }
  return deliverLocalPushNotification(title || category, body || title, tag);
}
