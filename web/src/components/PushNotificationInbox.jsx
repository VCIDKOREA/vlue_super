import { useCallback, useEffect, useState } from "react";
import {
  countUnreadPush,
  markAllPushRead,
  markPushRead,
  PUSH_INBOX_CHANGED,
  readPushNotifications,
  resolvePushDisplayTime
} from "../lib/pushNotificationInbox";
import PushNotificationDetailModal from "./PushNotificationDetailModal.jsx";

const CATEGORY_STYLE = {
  가족보호: "bg-emerald-50 text-emerald-700",
  안심: "bg-emerald-50 text-emerald-700",
  앱: "bg-blue-50 text-blue-700",
  공지: "bg-indigo-50 text-indigo-700",
  기타: "bg-gray-100 text-gray-600"
};

export default function PushNotificationInbox({ onUnreadChange, onOpenFamilyProtection, isDarkMode = false }) {
  const [items, setItems] = useState(() => readPushNotifications());
  const [detail, setDetail] = useState(null);

  const refresh = useCallback(() => {
    const list = readPushNotifications();
    setItems(list);
    onUnreadChange?.(countUnreadPush());
  }, [onUnreadChange]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(PUSH_INBOX_CHANGED, onChange);
    return () => window.removeEventListener(PUSH_INBOX_CHANGED, onChange);
  }, [refresh]);

  const openDetail = (n) => {
    if (!n.read) markPushRead(n.id);
    setDetail(n);
    refresh();
  };

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-bold text-gray-500">알림이 없습니다</p>
        <p className="mt-1 text-xs text-gray-400">가족보호·앱 알림이 이곳에 쌓입니다.</p>
      </div>
    );
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {onOpenFamilyProtection ? (
        <button
          type="button"
          onClick={onOpenFamilyProtection}
          className="mx-3 mt-2 flex shrink-0 items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-left"
        >
          <div>
            <p className="text-[12px] font-black text-indigo-800">가족 보호 등록 · 알림 설정</p>
            <p className="mt-0.5 text-[11px] text-gray-600">친구검색에서 가족 초대와 안심 알림을 관리합니다.</p>
          </div>
          <span className="text-[13px] font-black text-indigo-600">→</span>
        </button>
      ) : null}
      {unread > 0 ? (
        <div className="flex shrink-0 items-center justify-end border-b border-gray-100 px-3 py-2">
          <button
            type="button"
            className="text-[11px] font-bold text-blue-600"
            onClick={() => {
              markAllPushRead();
              refresh();
            }}
          >
            모두 읽음
          </button>
        </div>
      ) : null}
      <ul className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={`relative flex w-full cursor-pointer gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-gray-100 ${
                n.read ? "opacity-70" : "bg-blue-50/40"
              }`}
              onClick={() => openDetail(n)}
            >
              {!n.read ? (
                <span
                  className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(43,111,240,0.2)]"
                  aria-label="신규 알림"
                />
              ) : null}
              <div className="min-w-0 flex-1 pl-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      CATEGORY_STYLE[n.category] || CATEGORY_STYLE.기타
                    }`}
                  >
                    {n.category}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {resolvePushDisplayTime(n)}
                  </span>
                  <span className="ml-auto text-[11px] font-bold text-blue-600">상세 ›</span>
                </div>
                <p className="text-[13px] font-bold text-gray-900">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gray-600">{n.body}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <PushNotificationDetailModal
        open={Boolean(detail)}
        item={detail}
        displayTime={detail ? resolvePushDisplayTime(detail) : ""}
        isDarkMode={isDarkMode}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
