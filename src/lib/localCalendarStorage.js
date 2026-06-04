/** API 미연결 시에도 동작하는 로컬 일정 저장소 */

const KEY = "vlue_local_calendar_events_v1";

export const LOCAL_CALENDAR_CHANGED = "vlue-local-calendar-changed";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 500)));
    window.dispatchEvent(new Event(LOCAL_CALENDAR_CHANGED));
  } catch {
    /* quota */
  }
}

export function readLocalCalendarEvents() {
  return readAll();
}

export function upsertLocalCalendarEvent(event) {
  const id = event.id || `local-cal-${Date.now()}`;
  const next = { ...event, id, source: event.source || "local" };
  const list = readAll().filter((e) => e.id !== id);
  writeAll([next, ...list]);
  return next;
}

export function removeLocalCalendarEvent(id) {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function mergeCalendarEvents(remote = [], local = []) {
  const map = new Map();
  for (const ev of [...local, ...remote]) {
    if (ev?.id) map.set(ev.id, ev);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}
