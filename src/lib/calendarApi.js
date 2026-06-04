import { apiUrl } from "./apiBase.js";
import { VlueNetworkError } from "./networkError.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function calendarFetch(url, init) {
  try {
    const res = await vlueAuthFetch(url, init);
    return parseJson(res);
  } catch (e) {
    if (e instanceof VlueNetworkError) throw e;
    throw new VlueNetworkError(undefined, e);
  }
}

function filterByRange(events, from, to) {
  if (!from && !to) return events;
  const f = from ? new Date(from).getTime() : 0;
  const t = to ? new Date(to).getTime() : Infinity;
  return events.filter((ev) => {
    const s = new Date(ev.startAt).getTime();
    const e = new Date(ev.endAt).getTime();
    return e >= f && s <= t;
  });
}

/** 개인·그룹·오피스 일정 통합 조회 (`/api/calendar/all` 단일 소스) */
export async function fetchAllCalendarEvents({ from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const data = await calendarFetch(apiUrl(`/api/calendar/all?${q}`), {
    headers: vlueAuthHeaders()
  });
  const events = data.events || [];
  return { events: filterByRange(events, from, to) };
}

export async function fetchCalendarEvent(id) {
  const data = await calendarFetch(apiUrl(`/api/calendar/events/${id}`), {
    headers: vlueAuthHeaders()
  });
  return data.event;
}

export async function createPersonalCalendarEvent(body) {
  const data = await calendarFetch(apiUrl("/api/calendar/personal"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return data;
}

export async function createGroupCalendarEvent(groupId, body) {
  const data = await calendarFetch(apiUrl(`/api/calendar/group/${encodeURIComponent(groupId)}`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return data;
}

/** 오피스 그룹 일정 — `calendarApi` 단일 진입점 (레거시 payload 호환) */
export async function listGroupCalendarEvents({ groupId, from, to } = {}) {
  const { events } = await fetchAllCalendarEvents({ from, to });
  if (!groupId) return { events };
  const filtered = events.filter((ev) => ev.groupId === groupId);
  return { events: filtered };
}

export async function updatePersonalCalendarEvent(id, body) {
  return calendarFetch(apiUrl(`/api/calendar/personal/${id}`), {
    method: "PUT",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function updateGroupCalendarEvent(id, body) {
  return calendarFetch(apiUrl(`/api/calendar/group/${id}`), {
    method: "PUT",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function deletePersonalCalendarEvent(id) {
  return calendarFetch(apiUrl(`/api/calendar/personal/${id}`), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
}

export async function deleteGroupCalendarEvent(id) {
  return calendarFetch(apiUrl(`/api/calendar/group/${id}`), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
}

export async function postCalendarRsvp(eventId, status) {
  return calendarFetch(apiUrl(`/api/calendar/events/${eventId}/rsvp`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

export async function parseCalendarWithAi(message) {
  const res = await vlueAuthFetch(apiUrl("/api/ai/chat"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, type: "calendar_parse" })
  });
  const data = await parseJson(res);
  if (data.parsed) return data.parsed;
  try {
    return JSON.parse(data.reply || "{}");
  } catch {
    throw new Error("일정 분석에 실패했습니다.");
  }
}
