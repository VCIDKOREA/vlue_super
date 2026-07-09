import { counterpartyInitial, formatMailTalkTime } from "../../lib/mailTalkApi.js";
import { useRef } from "react";

function emailLocalPart(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}

export default function MailTalkRoomList({
  rooms,
  loading,
  error,
  onSelect,
  onRoomDoubleClick,
  onCompose,
  isDarkMode = false
}) {
  const clickDelayRef = useRef(null);
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-[13px] text-gray-500">
        메일톡방을 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="text-[13px] text-red-500">{error}</p>
        <button
          type="button"
          onClick={onCompose}
          className="rounded-full bg-blue-600 px-4 py-2 text-[12px] font-bold text-white"
        >
          새 메일톡 작성
        </button>
      </div>
    );
  }

  return (
    <section className="chat-list-surface min-h-0 w-full flex-1 overflow-y-auto bg-transparent pb-[calc(54px+env(safe-area-inset-bottom,0px)+12px)]">
      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={onCompose}
          className={`mb-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed py-2.5 text-[12px] font-bold ${
            isDarkMode
              ? "border-blue-400/40 text-blue-300"
              : "border-blue-200 bg-blue-50/50 text-blue-600"
          }`}
        >
          <span aria-hidden>✉️</span> 새 거래처 메일톡
        </button>

        {!rooms.length ? (
          <div className="py-12 text-center text-[13px] text-gray-500">
            아직 메일톡방이 없습니다.
            <br />
            거래처 이메일로 첫 메일을 보내 보세요.
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {rooms.map((room) => {
              const label = emailLocalPart(room.counterpartyEmail);
              const preview = room.lastPreview || room.lastSubject || "메일 대화";
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    if (clickDelayRef.current) clearTimeout(clickDelayRef.current);
                    clickDelayRef.current = setTimeout(() => {
                      onSelect(room.id);
                      clickDelayRef.current = null;
                    }, 220);
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (clickDelayRef.current) {
                      clearTimeout(clickDelayRef.current);
                      clickDelayRef.current = null;
                    }
                    onRoomDoubleClick?.(room);
                  }}
                  className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left active:bg-blue-50/80 ${
                    isDarkMode ? "border-white/5 active:bg-white/5" : "border-gray-100"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-black ${
                      isDarkMode ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-700"
                    }`}
                    aria-hidden
                  >
                    {counterpartyInitial(room.counterpartyEmail)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-bold text-gray-900">{label}</span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {formatMailTalkTime(room.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-gray-500">{room.counterpartyEmail}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-gray-400">{preview}</span>
                  </span>
                  {room.unread ? (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {room.unread > 99 ? "99+" : room.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
