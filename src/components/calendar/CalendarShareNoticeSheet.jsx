import { useState } from "react";

export default function CalendarShareNoticeSheet({
  open,
  onClose,
  event,
  rooms = [],
  isDarkMode,
  onConfirm,
  busy
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id || event?.groupId || "");

  if (!open || !event) return null;

  const panel = isDarkMode ? "bg-[#111827] text-gray-100" : "bg-white text-slate-900";

  return (
    <div className="fixed inset-0 z-[170] flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className={`relative rounded-t-3xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 ${panel}`}>
        <p className="text-center text-[16px] font-black">채팅방 공지로 등록</p>
        <p className={`mt-1 text-center text-[11px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          1:1·그룹방 모두 푸시 알림이 발송되며, 읽음 표시가 적용됩니다.
        </p>
        <p className="mt-3 text-[13px] font-bold">{event.title}</p>
        <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          채팅방 선택
        </label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-[13px] ${
            isDarkMode ? "border-white/10 bg-[#0f1218]" : "border-slate-200"
          }`}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.label}] {r.name}
            </option>
          ))}
        </select>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 rounded-xl border py-3 text-[13px] font-bold ${isDarkMode ? "border-white/15" : ""}`}>
            취소
          </button>
          <button
            type="button"
            disabled={!roomId || busy}
            onClick={() => onConfirm(roomId)}
            className="flex-[1.2] rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
          >
            공지 등록 · 푸시 발송
          </button>
        </div>
      </div>
    </div>
  );
}
