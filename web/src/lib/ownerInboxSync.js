import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";
import {
  addPushNotification,
  isPushServerIdDeleted,
  prunePinnedPushNotIn
} from "./pushNotificationInbox.js";
import { maybePostAndroidPushForInboxItem } from "./androidSystemNotification.js";

/**
 * 서버 OwnerNotification → 로컬 알림함 병합 (좋아요·댓글·공유 포함)
 */
export async function syncOwnerInboxFromServer() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/notifications/inbox"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.items)) return { ok: false, added: 0 };
    const pinKeys = data.items.filter((item) => item.pinned && item.pinKey).map((item) => item.pinKey);
    prunePinnedPushNotIn(pinKeys);
    let added = 0;
    for (const item of data.items) {
      if (isPushServerIdDeleted(item.id)) continue;
      const payload =
        item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
          ? item.payload
          : {};
      const entry = addPushNotification({
        category: item.category || "앱",
        title: item.title || "",
        body: item.body || "",
        createdAt: item.createdAt,
        serverId: item.id,
        read: Boolean(item.read) && !item.pinned,
        pinned: Boolean(item.pinned),
        pinKind: item.pinKind || null,
        pinKey: item.pinKey || null,
        kind: item.kind || payload.type || null,
        linkId: item.linkId || null,
        familyRelation: item.familyRelation || null,
        familyInvitePending: item.kind === "family_invite",
        actorUserId: item.actorUserId || payload.actorUserId || null,
        actorHandle: item.actorHandle || payload.actorHandle || null,
        actorName: item.actorName || payload.actorName || null,
        showcaseNotifyType: item.showcaseNotifyType || payload.type || null,
        showcaseSlideId: item.showcaseSlideId || payload.slideId || null,
        showcaseContentOrdinal:
          Number(item.showcaseContentOrdinal) || Number(payload.contentOrdinal) || null,
        showcaseSlideLabel: item.showcaseSlideLabel || payload.slideLabel || null
      });
      if (entry?.isNew) {
        added += 1;
        if (!item.read) maybePostAndroidPushForInboxItem(entry);
      }
    }
    return { ok: true, added };
  } catch {
    return { ok: false, added: 0 };
  }
}

export async function deleteOwnerInboxItem(serverId) {
  const id = String(serverId || "").trim();
  if (!id) return { ok: false };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/notifications/inbox/${encodeURIComponent(id)}`), {
      method: "DELETE"
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, ...data };
  } catch {
    return { ok: false };
  }
}

export async function clearOwnerInboxOnServer({ keepPinned = true } = {}) {
  try {
    const q = keepPinned ? "keepPinned=1" : "keepPinned=0";
    const res = await vlueAuthFetch(apiUrl(`/api/notifications/inbox?${q}`), {
      method: "DELETE"
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, ...data };
  } catch {
    return { ok: false };
  }
}
