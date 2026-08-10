import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import {
  formatCallDuration,
  formatCallWhen,
  readCallShowcaseHistory,
  resolveCallHistoryAvatar
} from "./callShowcaseHistory.js";

/**
 * 네이티브 시스템 CallLog JSON 로드.
 * @returns {Promise<Array<{id:string,phone:string,durationSec:number,direction:string,dateMs:number,callState:string}>>}
 */
export async function fetchDeviceCallLogEntries(limit = 200) {
  try {
    const raw =
      (typeof window !== "undefined" &&
        (window.VlueLettering?.getDeviceCallLogJson?.(limit) ||
          window.Android?.getDeviceCallLogJson?.(String(limit)))) ||
      "[]";
    const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        id: String(row?.id || "").trim(),
        phone: String(row?.phone || "").trim(),
        durationSec: Math.max(0, Number(row?.durationSec) || 0),
        direction: row?.direction === "out" ? "out" : "in",
        dateMs: Number(row?.dateMs) || 0,
        callState: String(row?.callState || "ended")
      }))
      .filter((r) => r.phone.length >= 3);
  } catch {
    return [];
  }
}

function phoneKey(phone) {
  const d = normalizePhoneDigits(phone);
  if (!d) return "";
  if (d.startsWith("82") && d.length >= 10) return `0${d.slice(2)}`;
  return d;
}

/**
 * iOS Recents 식: 시간순(최신 먼저) 연속 동일 번호를 한 행으로 묶고 count 부여.
 * @param {Array} rawEntries CallLog 최신→과거
 */
export function groupConsecutiveCallLogEntries(rawEntries) {
  const list = Array.isArray(rawEntries) ? rawEntries : [];
  const groups = [];
  for (const entry of list) {
    const key = phoneKey(entry.phone);
    if (!key) continue;
    const last = groups[groups.length - 1];
    if (last && last.phoneKey === key) {
      last.count += 1;
      last.durationSec = Math.max(last.durationSec, entry.durationSec || 0);
      /* 최신 통화가 그룹 대표 — 이미 last가 최신 */
      continue;
    }
    groups.push({
      phoneKey: key,
      count: 1,
      phone: entry.phone,
      phoneDisplay: formatLetteringPhoneDisplay(entry.phone) || entry.phone,
      direction: entry.direction === "out" ? "out" : "in",
      durationSec: Math.max(0, Number(entry.durationSec) || 0),
      endedAt: entry.dateMs
        ? new Date(entry.dateMs).toISOString()
        : new Date().toISOString(),
      dateMs: entry.dateMs || Date.now(),
      callState: entry.callState || "ended",
      id: entry.id || `clog-${key}-${entry.dateMs || Date.now()}`
    });
  }
  return groups;
}

/**
 * localStorage 쇼케이스 히스토리로 이름·verified·avatar enrich (목록 SoT는 CallLog).
 */
export function enrichCallLogGroupsWithShowcaseHistory(groups) {
  const history = readCallShowcaseHistory();
  const byKey = new Map();
  for (const row of history) {
    const key = phoneKey(row.phoneDisplay || row.phone);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, row);
  }
  return groups.map((g) => {
    const meta = byKey.get(g.phoneKey);
    const nameFromMeta = String(meta?.name || "").trim();
    const looksLikePhone =
      !nameFromMeta ||
      normalizePhoneDigits(nameFromMeta) === g.phoneKey ||
      nameFromMeta === g.phoneDisplay;
    return {
      ...g,
      name: looksLikePhone ? g.phoneDisplay : nameFromMeta,
      verified: meta ? meta.verified !== false : null,
      membershipTier: meta?.membershipTier || null,
      avatarUrl: resolveCallHistoryAvatar(meta || {}) || "",
      cardSnapshot: meta?.cardSnapshot || null,
      showcaseSnapshot: meta?.showcaseSnapshot || null,
      count: g.count
    };
  });
}

export function formatCallGroupLabel(call) {
  const base = String(call?.name || call?.phoneDisplay || call?.phone || "").trim() || "—";
  const n = Number(call?.count) || 1;
  if (n <= 1) return base;
  return `${base} (${n})`;
}

export { formatCallDuration, formatCallWhen, resolveCallHistoryAvatar };
