import { useCallback, useEffect, useState } from "react";
import { Bell, Shield } from "lucide-react";
import {
  countUnreadPush,
  markAllPushRead,
  markPushRead,
  PUSH_INBOX_CHANGED,
  readPushNotifications,
  resolvePushDisplayTime
} from "../lib/pushNotificationInbox.js";
import PushNotificationDetailModal from "./PushNotificationDetailModal.jsx";

const CATEGORY_STYLE = {
  가족보호: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  안심: "bg-teal-50 text-teal-800 ring-teal-100",
  앱: "bg-blue-50 text-blue-800 ring-blue-100",
  공지: "bg-indigo-50 text-indigo-800 ring-indigo-100",
  기타: "bg-slate-100 text-slate-600 ring-slate-200"
};

/**
 * 앱 메인 화면 — 가족보호·앱 알림 수신함 (날짜·시간 표시)
 */
export default function HomeNotificationPanel({ onOpenFamilyProtection, className = "" }) {
  const [items, setItems] = useState(() => readPushNotifications());
  const [detail, setDetail] = useState(null);

  const refresh = useCallback(() => {
    setItems(readPushNotifications());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(PUSH_INBOX_CHANGED, onChange);
    return () => window.removeEventListener(PUSH_INBOX_CHANGED, onChange);
  }, [refresh]);

  const unread = countUnreadPush();

  const openDetail = (n) => {
    if (!n.read) markPushRead(n.id);
    setDetail(n);
    refresh();
  };

  return (
    <section className={`mx-auto w-full max-w-md px-0.5 ${className}`.trim()} aria-label="알림">
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Bell className="h-4 w-4" aria-hidden />
            {unread > 0 ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_0_2px_#fff]"
                aria-hidden
              />
            ) : null}
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-black tracking-tight text-slate-900">알림</h2>
            <p className="text-[11px] font-medium text-slate-500">가족보호 · 앱 알림</p>
          </div>
          {unread > 0 ? (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
              {unread}
            </span>
          ) : null}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-bold text-blue-600"
            onClick={() => {
              markAllPushRead();
              refresh();
            }}
          >
            모두 읽음
          </button>
        ) : null}
      </header>

      {onOpenFamilyProtection ? (
        <button
          type="button"
          onClick={onOpenFamilyProtection}
          className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2.5 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-black text-emerald-900">가족보호 등록 · 알림 설정</p>
            <p className="mt-0.5 text-[11px] text-slate-600">자녀·가족 안심 알림을 받으려면 등록하세요</p>
          </div>
          <span className="shrink-0 text-[13px] font-black text-emerald-700" aria-hidden>
            →
          </span>
        </button>
      ) : null}

      <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-sm">
        {!items.length ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-bold text-slate-500">알림이 없습니다</p>
            <p className="mt-1 text-[11px] text-slate-400">가족보호·앱 알림이 이곳에 표시됩니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const when = resolvePushDisplayTime(n);
              const catStyle = CATEGORY_STYLE[n.category] || CATEGORY_STYLE.기타;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`relative flex w-full cursor-pointer gap-3 px-3.5 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 ${
                      n.read ? "opacity-75" : "bg-blue-50/30"
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
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${catStyle}`}
                        >
                          {n.category}
                        </span>
                        <span className="ml-auto text-[11px] font-bold text-blue-600">상세 ›</span>
                      </div>
                      <p className="text-[13px] font-bold leading-snug text-slate-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-slate-600">
                        {n.body}
                      </p>
                      {when ? (
                        <time
                          className="mt-1.5 block text-[11px] font-semibold tabular-nums text-slate-400"
                          dateTime={n.createdAt}
                        >
                          {when}
                        </time>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PushNotificationDetailModal
        open={Boolean(detail)}
        item={detail}
        displayTime={detail ? resolvePushDisplayTime(detail) : ""}
        onClose={() => setDetail(null)}
      />
    </section>
  );
}
