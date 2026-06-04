import { useEffect, useState } from "react";
import { CHAT_ROOM_NOTICE_CHANGED, getRoomNotice } from "../../lib/chatRoomNoticeStorage.js";
import { noticeReadLabel, readNoticeInRoom } from "../../lib/chatRoomNoticeService.js";

export default function ChatRoomNoticeBanner({
  roomId,
  myUserId,
  isDarkMode,
  onOpenEvent
}) {
  const [notice, setNotice] = useState(() => getRoomNotice(roomId));

  useEffect(() => {
    const refresh = () => setNotice(getRoomNotice(roomId));
    refresh();
    window.addEventListener(CHAT_ROOM_NOTICE_CHANGED, refresh);
    return () => window.removeEventListener(CHAT_ROOM_NOTICE_CHANGED, refresh);
  }, [roomId]);

  useEffect(() => {
    if (notice && myUserId) readNoticeInRoom(notice, myUserId);
  }, [notice?.id, myUserId]);

  if (!notice) return null;

  const readLabel = noticeReadLabel(notice, myUserId);

  return (
    <button
      type="button"
      onClick={() => onOpenEvent?.(notice)}
      className={`mx-3 mb-2 w-[calc(100%-1.5rem)] rounded-xl border px-3 py-2.5 text-left shadow-sm active:scale-[0.99] ${
        isDarkMode
          ? "border-amber-500/40 bg-amber-950/30"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-black ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
          📌 채팅방 공지 · 일정
        </p>
        {readLabel ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
              readLabel.includes("안 읽음")
                ? "bg-rose-500 text-white"
                : isDarkMode
                  ? "bg-white/15 text-amber-100"
                  : "bg-amber-200/80 text-amber-900"
            }`}
          >
            {readLabel}
          </span>
        ) : null}
      </div>
      <p className={`mt-1 text-[13px] font-black leading-snug ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
        {notice.title}
      </p>
      <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{notice.whenLabel}</p>
    </button>
  );
}
