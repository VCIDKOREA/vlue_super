import { CALENDAR_CACHE_KEY } from "./calendarConstants.js";

export function readCalendarCache() {
  try {
    const raw = localStorage.getItem(CALENDAR_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCalendarCache(events) {
  try {
    localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(events.slice(0, 500)));
  } catch {
    /* quota */
  }
}

export function setCalendarBadge(count = 1) {
  try {
    const prev = Number(localStorage.getItem("vlue_calendar_badge_v1") || "0");
    localStorage.setItem("vlue_calendar_badge_v1", String(prev + count));
    window.dispatchEvent(new Event("vlue-calendar-badge"));
  } catch {
    /* ignore */
  }
}

export function readCalendarBadge() {
  try {
    return Number(localStorage.getItem("vlue_calendar_badge_v1") || "0");
  } catch {
    return 0;
  }
}

export function clearCalendarBadge() {
  try {
    localStorage.setItem("vlue_calendar_badge_v1", "0");
    window.dispatchEvent(new Event("vlue-calendar-badge"));
  } catch {
    /* ignore */
  }
}
