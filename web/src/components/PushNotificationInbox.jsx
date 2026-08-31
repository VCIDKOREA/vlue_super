import { useCallback, useEffect, useState } from "react";
import {
  clearPushNotifications,
  countUnreadPush,
  markAllPushRead,
  markPushRead,
  PUSH_INBOX_CHANGED,
  readPushNotifications,
  removePushNotification,
  resolvePushDisplayTime
} from "../lib/pushNotificationInbox";
import {
  clearOwnerInboxOnServer,
  deleteOwnerInboxItem,
  syncOwnerInboxFromServer
} from "../lib/ownerInboxSync.js";
import PushNotificationDetailModal from "./PushNotificationDetailModal.jsx";
import ShowcaseNotificationBody from "./showcase/ShowcaseNotificationBody.jsx";

const CATEGORY_STYLE = {
  가족보호: "bg-emerald-50 text-emerald-700",
  안심: "bg-emerald-50 text-emerald-700",
  앱: "bg-blue-50 text-blue-700",
  공지: "bg-indigo-50 text-indigo-700",
  결제: "bg-sky-50 text-sky-800",
  친구: "bg-violet-50 text-violet-700",
  팔로우: "bg-fuchsia-50 text-fuchsia-700",
  쇼케이스: "bg-amber-50 text-amber-800",
  기타: "bg-gray-100 text-gray-600"
};

export default function PushNotificationInbox({ onUnreadChange, onOpenFamilyProtection, isDarkMode = false }) {
  const [items, setItems] = useState(() => readPushNotifications());
  const [detail, setDetail] = useState(null);
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(() => {
    const list = readPushNotifications();
    setItems(list);
    onUnreadChange?.(countUnreadPush());
  }, [onUnreadChange]);

  useEffect(() => {
    refresh();
    void syncOwnerInboxFromServer().then(() => refresh());
    const onChange = () => refresh();
    window.addEventListener(PUSH_INBOX_CHANGED, onChange);
    return () => window.removeEventListener(PUSH_INBOX_CHANGED, onChange);
  }, [refresh]);

  const openDetail = (n) => {
    if (!n.read) markPushRead(n.id);
    setDetail({ ...n, read: true });
    refresh();
  };

  const deleteOne = async (n, e) => {
    e?.stopPropagation?.();
    if (!n?.id || busyId) return;
    setBusyId(n.id);
    try {
      if (n.serverId) await deleteOwnerInboxItem(n.serverId);
      removePushNotification(n.id);
      if (detail?.id === n.id) setDetail(null);
      refresh();
    } finally {
      setBusyId("");
    }
  };

  const clearAll = async () => {
    if (busyId === "__all__") return;
    if (!window.confirm("고정 알림을 제외한 알림을 모두 삭제할까요?")) return;
    setBusyId("__all__");
    try {
      await clearOwnerInboxOnServer({ keepPinned: true });
      clearPushNotifications({ keepPinned: true });
      setDetail(null);
      refresh();
    } finally {
      setBusyId("");
    }
  };

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-bold text-gray-500">알림이 없습니다</p>
        <p className="mt-1 text-xs text-gray-400">친구·가족보호·앱 알림이 이곳에 쌓입니다.</p>
      </div>
    );
  }

  const unread = items.filter((n) => !n.read).length;
  const canClear = items.some((n) => !n.pinned);

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
      <div className="flex shrink-0 items-center justify-end gap-3 border-b border-gray-100 px-3 py-2">
        {canClear ? (
          <button
            type="button"
            className="text-[11px] font-bold text-rose-600 disabled:opacity-40"
            disabled={busyId === "__all__"}
            onClick={() => void clearAll()}
          >
            전체 삭제
          </button>
        ) : null}
        {unread > 0 ? (
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
        ) : null}
      </div>
      <ul className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto">
        {items.map((n) => (
          <li key={n.id}>
            <div
              className={`relative flex w-full gap-2 border-b px-4 py-3.5 transition-colors ${
                n.pinned
                  ? "border-amber-100 bg-amber-50/70"
                  : n.read
                    ? "border-gray-50 opacity-70"
                    : "border-gray-50 bg-blue-50/40"
              }`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer gap-3 text-left hover:opacity-90 active:opacity-80"
                onClick={() => openDetail(n)}
              >
                {!n.read ? (
                  <span
                    className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(43,111,240,0.2)]"
                    aria-label="신규 알림"
                  />
                ) : null}
                <div className="min-w-0 pl-2">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {n.pinned ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        고정
                      </span>
                    ) : null}
                    {!n.read ? (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                        NEW
                      </span>
                    ) : null}
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
                    <span
                      className={`ml-auto text-[11px] font-bold ${
                        n.purchaseConfirmed
                          ? "text-emerald-600"
                          : n.read
                            ? "text-slate-400"
                            : "text-blue-600"
                      }`}
                    >
                      {n.purchaseConfirmed ? "구매확정" : n.read ? "확인" : "미확인"}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-gray-900">{n.title}</p>
                  <ShowcaseNotificationBody
                    body={n.body}
                    actorUserId={n.actorUserId}
                    actorHandle={n.actorHandle}
                    actorName={n.actorName}
                    showcaseContentOrdinal={n.showcaseContentOrdinal}
                    showcaseSlideId={n.showcaseSlideId}
                    inline
                    className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gray-600"
                  />
                </div>
              </button>
              <button
                type="button"
                className="shrink-0 self-center rounded-lg px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                disabled={busyId === n.id}
                aria-label="알림 삭제"
                onClick={(e) => void deleteOne(n, e)}
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <PushNotificationDetailModal
        open={Boolean(detail)}
        item={detail}
        displayTime={detail ? resolvePushDisplayTime(detail) : ""}
        isDarkMode={isDarkMode}
        onClose={() => setDetail(null)}
        onUpdated={(next) => {
          setDetail(next);
          refresh();
        }}
        onDelete={(item) => void deleteOne(item)}
      />
    </div>
  );
}
