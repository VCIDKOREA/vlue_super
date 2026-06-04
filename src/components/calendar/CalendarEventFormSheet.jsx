import { useState } from "react";
import {
  CALENDAR_COLOR_PALETTE,
  PUSH_BEFORE_OPTIONS,
  REPEAT_OPTIONS,
  inferGroupKindFromRoomId
} from "../../lib/calendarConstants.js";
import {
  createGroupCalendarEvent,
  createPersonalCalendarEvent,
  parseCalendarWithAi
} from "../../lib/calendarApi.js";
import { isVlueNetworkError } from "../../lib/networkError.js";

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultRange() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: toLocalInputValue(start.toISOString()), end: toLocalInputValue(end.toISOString()) };
}

export default function CalendarEventFormSheet({
  open,
  onClose,
  isDarkMode,
  groups = [],
  initialGroupId = "",
  initialGroupName = "",
  onSaved,
  onToast
}) {
  const def = defaultRange();
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [scope, setScope] = useState(initialGroupId ? "group" : "personal");
  const [groupId, setGroupId] = useState(initialGroupId || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState(def.start);
  const [endAt, setEndAt] = useState(def.end);
  const [color, setColor] = useState(CALENDAR_COLOR_PALETTE[0]);
  const [repeatType, setRepeatType] = useState("none");
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushBefore, setPushBefore] = useState(30);
  const [pushSilent, setPushSilent] = useState(false);

  if (!open) return null;

  const panel = isDarkMode ? "bg-[#111827] text-gray-100" : "bg-white text-slate-900";
  const input = isDarkMode
    ? "w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2.5 text-[13px] outline-none"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none";

  const applyParsed = (p) => {
    if (p.title) setTitle(String(p.title).slice(0, 100));
    if (p.content) setContent(String(p.content).slice(0, 500));
    if (p.location) setLocation(String(p.location));
    if (p.is_all_day != null) setAllDay(Boolean(p.is_all_day));
    if (p.start_at) setStartAt(String(p.start_at).replace(" ", "T").slice(0, 16));
    if (p.end_at) setEndAt(String(p.end_at).replace(" ", "T").slice(0, 16));
  };

  const runAi = async () => {
    if (!aiText.trim()) return;
    setBusy(true);
    try {
      const parsed = await parseCalendarWithAi(aiText.trim());
      applyParsed(parsed);
      onToast?.("브이밍이 일정 폼을 채웠습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "AI 분석 실패");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) return onToast?.("제목을 입력해 주세요.");
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        location: location.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        isAllDay: allDay,
        color,
        repeatType,
        repeatEndDate: repeatEndDate || null,
        pushEnabled: pushSilent ? false : pushEnabled,
        pushBeforeMinutes: pushBefore,
        pushNotifySilent: pushSilent
      };
      const g = groups.find((x) => x.id === groupId);
      let created = null;
      if (scope === "group" && groupId) {
        const res = await createGroupCalendarEvent(groupId, {
          ...body,
          groupName: g?.name || initialGroupName,
          groupKind: inferGroupKindFromRoomId(groupId),
          memberUserIds: [localStorage.getItem("vlue_server_user_id")].filter(Boolean)
        });
        created = res.event;
      } else {
        const res = await createPersonalCalendarEvent(body);
        created = res.event;
      }
      onSaved?.(created);
      onClose?.();
      onToast?.("일정을 등록했습니다.");
    } catch (e) {
      onToast?.(isVlueNetworkError(e) ? e.message : e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="닫기" onClick={onClose} />
      <div className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 ${panel}`}>
        <p className="mb-3 text-center text-[16px] font-black">일정 등록</p>

        <div className={`mb-3 flex gap-2 rounded-xl border p-2 ${isDarkMode ? "border-violet-500/30 bg-violet-950/20" : "border-violet-100 bg-violet-50"}`}>
          <input
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder='예: 내일 오후 3시 팀 회의 2시간'
            className={`${input} flex-1`}
          />
          <button
            type="button"
            disabled={busy}
            onClick={runAi}
            className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-black text-white"
          >
            브이밍
          </button>
        </div>

        <label className="text-[11px] font-bold opacity-70">제목 *</label>
        <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} />

        <label className="mt-3 flex items-center gap-2 text-[12px] font-semibold">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          하루종일
        </label>

        {!allDay ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold opacity-60">시작</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={`${input} mt-0.5`} />
            </div>
            <div>
              <label className="text-[10px] font-bold opacity-60">종료</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={`${input} mt-0.5`} />
            </div>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="date" value={startAt.slice(0, 10)} onChange={(e) => setStartAt(`${e.target.value}T00:00`)} className={input} />
            <input type="date" value={endAt.slice(0, 10)} onChange={(e) => setEndAt(`${e.target.value}T23:59`)} className={input} />
          </div>
        )}

        <label className="mt-3 block text-[11px] font-bold opacity-70">장소</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className={`${input} mt-1`} placeholder="📍 장소" />

        <label className="mt-3 block text-[11px] font-bold opacity-70">내용</label>
        <textarea value={content} maxLength={500} rows={3} onChange={(e) => setContent(e.target.value)} className={`${input} mt-1`} />

        <p className="mt-3 text-[11px] font-bold opacity-70">색상</p>
        <div className="mt-1 flex gap-2">
          {CALENDAR_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ring-2 ${color === c ? "ring-blue-500" : "ring-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <p className="mt-4 text-[11px] font-bold opacity-70">대상</p>
        <div className="mt-1 flex gap-3 text-[12px]">
          <label>
            <input type="radio" checked={scope === "personal"} onChange={() => setScope("personal")} /> 개인
          </label>
          <label>
            <input type="radio" checked={scope === "group"} onChange={() => setScope("group")} /> 그룹
          </label>
        </div>
        {scope === "group" ? (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={`${input} mt-2`}>
            <option value="">그룹 선택</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} — {g.name}
              </option>
            ))}
          </select>
        ) : null}
        {scope === "group" ? (
          <p className="mt-1 text-[10px] opacity-60">선택한 그룹 채팅방 전체에 자동 공유됩니다.</p>
        ) : null}

        <p className="mt-3 text-[11px] font-bold opacity-70">반복</p>
        <select value={repeatType} onChange={(e) => setRepeatType(e.target.value)} className={`${input} mt-1`}>
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {repeatType !== "none" ? (
          <input type="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.target.value)} className={`${input} mt-2`} />
        ) : null}

        <p className="mt-3 text-[11px] font-bold opacity-70">알림</p>
        <label className="mt-1 flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} />
          푸시 알림
        </label>
        {pushEnabled ? (
          <select value={pushBefore} onChange={(e) => setPushBefore(Number(e.target.value))} className={`${input} mt-2`}>
            {PUSH_BEFORE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
        {scope === "group" ? (
          <label className="mt-2 flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={pushSilent} onChange={(e) => setPushSilent(e.target.checked)} />
            알림 없이 등록
          </label>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 rounded-xl border py-3 text-[13px] font-bold ${isDarkMode ? "border-white/15" : "border-slate-200"}`}>
            취소
          </button>
          <button type="button" disabled={busy} onClick={submit} className="flex-[1.2] rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50">
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
