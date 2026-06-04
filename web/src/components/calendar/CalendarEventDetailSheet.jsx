import { useEffect, useState } from "react";
import { colorForEvent } from "../../lib/calendarConstants.js";
import {
  deleteGroupCalendarEvent,
  deletePersonalCalendarEvent,
  fetchCalendarEvent,
  postCalendarRsvp
} from "../../lib/calendarApi.js";
import CalendarShareNoticeSheet from "./CalendarShareNoticeSheet.jsx";

function formatWhen(event) {
  const s = new Date(event.startAt);
  const e = new Date(event.endAt);
  if (event.isAllDay) {
    return `${s.toLocaleDateString("ko-KR")} (하루종일)`;
  }
  return `${s.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })} ~ ${e.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function CalendarEventDetailSheet({
  open,
  eventId,
  onClose,
  isDarkMode,
  myUserId,
  onToast,
  onDeleted,
  onShareToChat,
  calendarRooms = [],
  onPublishRoomNotice
}) {
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!open || !eventId) return;
    setBusy(true);
    fetchCalendarEvent(eventId)
      .then(setEvent)
      .catch((e) => onToast?.(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setBusy(false));
  }, [open, eventId, onToast]);

  if (!open) return null;

  const panel = isDarkMode ? "bg-[#111827] text-gray-100" : "bg-white text-slate-900";
  const canEdit = event && (event.authorUserId === myUserId || event.type === "group");
  const accepted = (event?.members || []).filter((m) => m.status === "accepted").length;

  const setRsvp = async (status) => {
    if (!eventId) return;
    try {
      const data = await postCalendarRsvp(eventId, status);
      setEvent((ev) => (ev ? { ...ev, members: data.members } : ev));
      onToast?.(status === "accepted" ? "참석으로 응답했습니다." : status === "declined" ? "불참으로 응답했습니다." : "미정으로 저장했습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "응답 실패");
    }
  };

  const remove = async () => {
    if (!event) return;
    setBusy(true);
    try {
      if (event.type === "group") await deleteGroupCalendarEvent(event.id);
      else await deletePersonalCalendarEvent(event.id);
      onDeleted?.();
      onClose?.();
      onToast?.("일정을 삭제했습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const addToDeviceCalendar = () => {
    if (!event) return;
    const url = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      `DTSTART:${new Date(event.startAt).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTEND:${new Date(event.endAt).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `SUMMARY:${event.title}`,
      event.location ? `LOCATION:${event.location}` : "",
      "END:VEVENT",
      "END:VCALENDAR"
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([url], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${event.title}.ics`;
    a.click();
    onToast?.("캘린더 파일을 저장했습니다.");
  };

  return (
    <div className="fixed inset-0 z-[165] flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className={`relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 ${panel}`}>
        {busy && !event ? <p className="py-8 text-center text-[13px] opacity-60">불러오는 중…</p> : null}
        {event ? (
          <>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorForEvent(event) }} />
              <div>
                <h2 className="text-[18px] font-black leading-snug">{event.title}</h2>
                <p className="mt-1 text-[12px] opacity-70">{formatWhen(event)}</p>
              </div>
            </div>
            {event.location ? (
              <p className="mt-3 text-[13px]">
                <span className="font-bold">📍 </span>
                {event.location}
              </p>
            ) : null}
            {event.content ? <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed opacity-90">{event.content}</p> : null}
            {event.type === "group" ? (
              <>
                <p className="mt-4 text-[12px] font-bold">참석 여부</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setRsvp("accepted")} className="flex-1 rounded-xl bg-emerald-600 py-2 text-[12px] font-black text-white">
                    ✅ 참석
                  </button>
                  <button type="button" onClick={() => setRsvp("declined")} className="flex-1 rounded-xl bg-rose-600 py-2 text-[12px] font-black text-white">
                    ❌ 불참
                  </button>
                  <button type="button" onClick={() => setRsvp("tentative")} className="flex-1 rounded-xl bg-slate-500 py-2 text-[12px] font-black text-white">
                    🤔 미정
                  </button>
                </div>
                <p className="mt-2 text-[11px] opacity-60">{accepted}명 참석 · 총 {(event.members || []).length}명</p>
              </>
            ) : null}
            <div className="mt-5 space-y-2">
              <button type="button" onClick={addToDeviceCalendar} className="w-full rounded-xl border py-2.5 text-[12px] font-bold">
                캘린더 앱에 추가 (.ics)
              </button>
              {calendarRooms.length && onPublishRoomNotice ? (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
                >
                  채팅방 공지로 등록 · 푸시 발송
                </button>
              ) : null}
              {onShareToChat ? (
                <button
                  type="button"
                  onClick={() => onShareToChat(event)}
                  className={`w-full rounded-xl border py-2.5 text-[12px] font-bold ${
                    isDarkMode ? "border-white/15 text-blue-200" : "border-blue-200 text-blue-700"
                  }`}
                >
                  채팅방에 메시지로 공유
                </button>
              ) : null}
              {canEdit ? (
                <button type="button" disabled={busy} onClick={remove} className="w-full rounded-xl bg-rose-600 py-2.5 text-[12px] font-black text-white">
                  삭제
                </button>
              ) : null}
            </div>
          </>
        ) : null}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-[12px] font-bold text-slate-700">
          닫기
        </button>
      </div>

      <CalendarShareNoticeSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        event={event}
        rooms={calendarRooms}
        isDarkMode={isDarkMode}
        busy={busy}
        onConfirm={async (rid) => {
          setBusy(true);
          try {
            await onPublishRoomNotice?.(rid, event);
            setShareOpen(false);
            onClose?.();
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
