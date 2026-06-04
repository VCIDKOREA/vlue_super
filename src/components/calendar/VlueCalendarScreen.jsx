import { useCallback, useEffect, useMemo, useState } from "react";
import ScreenBackHeader from "../common/ScreenBackHeader";
import { FILTER_CHIPS, colorForEvent } from "../../lib/calendarConstants.js";
import { clearCalendarBadge } from "../../lib/calendarStorage.js";
import { fetchAllCalendarEvents } from "../../lib/calendarApi.js";
import CalendarEventFormSheet from "./CalendarEventFormSheet.jsx";
import CalendarEventDetailSheet from "./CalendarEventDetailSheet.jsx";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const VIEW_TABS = [
  { id: "month", label: "월간" },
  { id: "week", label: "주간" },
  { id: "day", label: "일간" },
  { id: "list", label: "목록" }
];

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function eventsOnDay(events, dayStr) {
  return events.filter((ev) => {
    const s = ymd(new Date(ev.startAt));
    const e = ymd(new Date(ev.endAt));
    return dayStr >= s && dayStr <= e;
  });
}

export default function VlueCalendarScreen({
  onBack,
  isDarkMode = false,
  calendarGroups = [],
  initialEventId = "",
  initialGroupId = "",
  initialGroupName = "",
  onToast,
  onShareEventToChat,
  onPublishRoomNotice
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [filters, setFilters] = useState(() => new Set(["all"]));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daySheet, setDaySheet] = useState(null);
  const [formOpen, setFormOpen] = useState(Boolean(initialGroupId));
  const [detailId, setDetailId] = useState(initialEventId || "");

  const myUserId = typeof localStorage !== "undefined" ? localStorage.getItem("vlue_server_user_id") || "" : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfMonth(cursor).toISOString();
      const to = endOfMonth(cursor).toISOString();
      const { events: list } = await fetchAllCalendarEvents({ from, to });
      setEvents(list);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "일정을 불러오지 못했습니다.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [cursor, onToast]);

  useEffect(() => {
    clearCalendarBadge();
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filters.has("all")) return events;
    return events.filter((ev) => {
      if (filters.has("personal") && ev.type === "personal") return true;
      if (filters.has("work") && ev.groupKind === "work") return true;
      if (filters.has("family") && ev.groupKind === "family") return true;
      if (filters.has("friends") && ev.groupKind === "friends") return true;
      return false;
    });
  }, [events, filters]);

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const todayStr = ymd(new Date());

  const toggleFilter = (id) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (id === "all") return new Set(["all"]);
      next.delete("all");
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  };

  const sub = isDarkMode ? "text-gray-400" : "text-slate-500";
  const cellCls = isDarkMode ? "border-white/5 text-gray-200" : "border-slate-100 text-slate-800";
  const mutedCell = isDarkMode ? "text-gray-600" : "text-slate-300";

  const listSorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [filtered]
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${isDarkMode ? "bg-[#0b0c10]" : "bg-[#f4f6fa]"}`}>
      <ScreenBackHeader title="캘린더" onBack={onBack} isDarkMode={isDarkMode} />

      <div className="flex shrink-0 gap-1 border-b px-3 py-2">
        {VIEW_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${
              view === t.id
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "bg-white/5 text-gray-400"
                  : "bg-white text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="rounded-lg px-2 py-1 text-[18px] font-bold"
        >
          ‹
        </button>
        <p className={`text-[15px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </p>
        <button
          type="button"
          onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="rounded-lg px-2 py-1 text-[18px] font-bold"
        >
          ›
        </button>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2">
        {FILTER_CHIPS.map((chip) => {
          const on = filters.has(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggleFilter(chip.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                on ? "bg-blue-600 text-white" : isDarkMode ? "bg-white/10 text-gray-400" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {loading ? <p className={`py-8 text-center text-[13px] ${sub}`}>일정 불러오는 중…</p> : null}

        {view === "month" ? (
          <>
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold opacity-60">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border bg-black/5">
              {monthGrid.map((d) => {
                const ds = ymd(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayEvents = eventsOnDay(filtered, ds);
                const isToday = ds === todayStr;
                const past = d < new Date(todayStr) && !isToday;
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => setDaySheet(ds)}
                    className={`min-h-[52px] border p-0.5 text-left ${cellCls} ${!inMonth ? mutedCell : ""} ${past ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        isToday ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="block truncate rounded px-0.5 text-[8px] font-semibold text-white"
                          style={{ backgroundColor: colorForEvent(ev) }}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="text-[8px] font-bold opacity-70">+{dayEvents.length - 3}개</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {view === "week" || view === "day" ? (
          <div className="space-y-2">
            {(view === "day" ? listSorted.filter((ev) => ymd(new Date(ev.startAt)) === ymd(cursor)) : listSorted)
              .slice(0, 40)
              .map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setDetailId(ev.id)}
                  className={`w-full rounded-xl border p-3 text-left ${isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white"} ${new Date(ev.endAt) < new Date() ? "opacity-50" : ""}`}
                >
                  <p className="text-[13px] font-black">{ev.title}</p>
                  <p className={`mt-0.5 text-[11px] ${sub}`}>{new Date(ev.startAt).toLocaleString("ko-KR")}</p>
                </button>
              ))}
          </div>
        ) : null}

        {view === "list" ? (
          <div className="space-y-2">
            {listSorted.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setDetailId(ev.id)}
                className={`w-full rounded-xl border p-3 text-left ${isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white"} ${new Date(ev.endAt) < new Date() ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForEvent(ev) }} />
                  <p className="text-[13px] font-black">{ev.title}</p>
                </div>
                <p className={`mt-1 text-[11px] ${sub}`}>{new Date(ev.startAt).toLocaleString("ko-KR")}</p>
              </button>
            ))}
            {!listSorted.length && !loading ? <p className={`py-6 text-center text-[13px] ${sub}`}>등록된 일정이 없습니다.</p> : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-[28px] text-white shadow-lg"
        aria-label="일정 등록"
      >
        +
      </button>

      {daySheet ? (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setDaySheet(null)} />
          <div className={`relative max-h-[60dvh] w-full overflow-y-auto rounded-t-2xl p-4 ${isDarkMode ? "bg-[#111827]" : "bg-white"}`}>
            <p className="text-[15px] font-black">{daySheet} 일정</p>
            <div className="mt-3 space-y-2">
              {eventsOnDay(filtered, daySheet).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setDaySheet(null);
                    setDetailId(ev.id);
                  }}
                  className={`w-full rounded-xl border p-3 text-left ${isDarkMode ? "border-white/10" : "border-slate-200"}`}
                >
                  <p className="font-bold">{ev.title}</p>
                  <p className="text-[11px] opacity-60">{new Date(ev.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</p>
                </button>
              ))}
              {!eventsOnDay(filtered, daySheet).length ? <p className="text-[12px] opacity-50">일정 없음</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <CalendarEventFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        isDarkMode={isDarkMode}
        groups={calendarGroups}
        initialGroupId={initialGroupId}
        initialGroupName={initialGroupName}
        onSaved={(ev) => {
          load();
          if (initialGroupId && ev && onShareEventToChat) onShareEventToChat(ev);
        }}
        onToast={onToast}
      />

      <CalendarEventDetailSheet
        open={Boolean(detailId)}
        eventId={detailId}
        onClose={() => setDetailId("")}
        isDarkMode={isDarkMode}
        myUserId={myUserId}
        onToast={onToast}
        onDeleted={load}
        onShareToChat={onShareEventToChat}
        calendarRooms={calendarGroups}
        onPublishRoomNotice={onPublishRoomNotice}
      />
    </div>
  );
}
