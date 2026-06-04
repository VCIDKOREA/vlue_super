import { addPushNotification } from "./pushNotificationInbox.js";
import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import {
  buildCalendarNoticePayload,
  getNoticeReadStats,
  markNoticeRead,
  setRoomNotice
} from "./chatRoomNoticeStorage.js";

export function formatNoticePushBody(notice) {
  return `📅 ${notice.title}\n${notice.whenLabel}${notice.location ? ` · ${notice.location}` : ""}`;
}

/** 채팅방 공지 등록 + 푸시(인앱·서버) */
export async function publishCalendarAsRoomNotice({
  roomId,
  roomName,
  event,
  authorUserId,
  authorName,
  appendMessage
}) {
  const notice = buildCalendarNoticePayload({
    roomId,
    event,
    authorUserId,
    authorName,
    roomName
  });
  setRoomNotice(roomId, notice);

  const systemText = `📅 [${authorName}]님이 일정을 채팅방 공지로 등록했어요.\n${notice.whenLabel} — ${notice.title}\n👉 공지에서 확인하기`;

  appendMessage?.(roomId, {
    id: `msg-notice-${notice.id}`,
    type: "room_notice",
    noticeId: notice.id,
    text: systemText
  });

  const pushTitle = `[${roomName || "채팅방"}] 일정 공지`;
  const pushBody = formatNoticePushBody(notice);

  for (const uid of notice.audienceUserIds) {
    if (uid === authorUserId) continue;
    addPushNotification({
      category: "일정",
      title: pushTitle,
      body: pushBody,
      time: "방금"
    });
  }

  try {
    await vlueAuthFetch(apiUrl("/api/calendar/notice/publish"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        roomName,
        noticeId: notice.id,
        title: notice.title,
        body: pushBody,
        eventId: event.id,
        startAt: event.startAt,
        audienceUserIds: notice.audienceUserIds.filter((id) => id !== authorUserId)
      })
    });
  } catch {
    /* 로컬·인앱 푸시만으로도 동작 */
  }

  return notice;
}

export function readNoticeInRoom(notice, myUserId) {
  if (!notice?.id || !myUserId) return;
  markNoticeRead(notice.id, myUserId);
}

export function noticeReadLabel(notice, myUserId) {
  const stats = getNoticeReadStats(notice, myUserId);
  if (!stats.total) return "";
  if (stats.isGroup) {
    if (stats.unreadCount > 0) return `안 읽음 ${stats.unreadCount}명`;
    return `읽음 ${stats.readCount}/${stats.total}`;
  }
  return stats.iRead ? "읽음" : "안 읽음";
}
