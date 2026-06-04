export const CALENDAR_CACHE_KEY = "vlue_calendar_events_cache_v1";
export const CALENDAR_BADGE_KEY = "vlue_calendar_badge_v1";
export const OPEN_CALENDAR_EVENT_KEY = "vlue_open_calendar_event_v1";

export const CALENDAR_COLOR_PALETTE = [
  "#8B5CF6",
  "#3B82F6",
  "#22C55E",
  "#EAB308",
  "#F97316",
  "#EC4899"
];

export const GROUP_KIND_COLORS = {
  personal: "#8B5CF6",
  work: "#3B82F6",
  family: "#22C55E",
  friends: "#EAB308",
  group: "#6366F1"
};

export const FILTER_CHIPS = [
  { id: "all", label: "전체" },
  { id: "personal", label: "개인" },
  { id: "work", label: "직장" },
  { id: "family", label: "가족" },
  { id: "friends", label: "친구" }
];

export const PUSH_BEFORE_OPTIONS = [
  { value: 10, label: "10분 전" },
  { value: 30, label: "30분 전" },
  { value: 60, label: "1시간 전" },
  { value: 1440, label: "하루 전" }
];

export const REPEAT_OPTIONS = [
  { value: "none", label: "반복 안함" },
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" }
];

export function colorForEvent(event) {
  if (event?.color) return event.color;
  if (event?.type === "personal") return GROUP_KIND_COLORS.personal;
  return GROUP_KIND_COLORS[event?.groupKind] || GROUP_KIND_COLORS.group;
}

export function inferGroupKindFromRoomId(roomId) {
  const id = String(roomId || "");
  if (id.startsWith("family:")) return "family";
  if (id.startsWith("friends:")) return "friends";
  if (id.startsWith("work:")) return "work";
  return "group";
}
