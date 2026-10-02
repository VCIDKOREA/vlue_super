/** OSRM 스텝의 회전 종류를 짧은 한국어 안내로 바꾼다. */

const MODIFIER = {
  uturn: "U턴",
  "sharp right": "급우회전",
  right: "우회전",
  "slight right": "약간 우회전",
  straight: "직진",
  "slight left": "약간 좌회전",
  left: "좌회전",
  "sharp left": "급좌회전"
};

export function maneuverLabel(type, modifier) {
  const kind = String(type || "");
  const mod = String(modifier || "");
  if (kind === "arrive") return "목적지 도착";
  if (kind === "depart") return "안내를 시작합니다";
  if (mod === "uturn" || kind === "uturn") return "U턴";
  if (kind === "roundabout" || kind === "rotary") return "로터리";
  if (kind === "merge") return mod.includes("left") ? "왼쪽 합류" : "오른쪽 합류";
  if (MODIFIER[mod]) return MODIFIER[mod];
  return "직진";
}

export function formatGuideDistance(meters) {
  const value = Number(meters) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}km`;
  return `${Math.max(0, Math.round(value))}m`;
}

/** 카카오내비식 방향 HUD용 짧은 화살표 기호 */
export function maneuverGlyph(instruction) {
  const text = String(instruction || "");
  if (/U턴|유턴/i.test(text)) return "↩";
  if (/급우|우회전|오른쪽/.test(text)) return "↗";
  if (/급좌|좌회전|왼쪽/.test(text)) return "↖";
  if (/도착/.test(text)) return "◎";
  if (/로터리|합류/.test(text)) return "⟳";
  return "↑";
}

export function nextGuideCue(steps) {
  const rows = Array.isArray(steps) ? steps : [];
  const upcoming = rows.find((step) => step.instruction !== "안내를 시작합니다" && step.instruction !== "목적지 도착" && step.distanceM > 15);
  return upcoming || rows.find((step) => step.instruction === "목적지 도착") || null;
}
