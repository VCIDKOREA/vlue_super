import {
  formatLetteringPhoneDisplay,
  normalizePhoneDigits,
  toKoreaNationalDigits
} from "./letteringPhoneMatch.js";
import {
  formatCallDuration,
  formatCallWhen,
  readCallShowcaseHistory,
  resolveCallHistoryAvatar
} from "./callShowcaseHistory.js";
import { matchNationalAgency } from "./nationalAgencyDcpClient.js";

export function callLogPhoneKey(phone) {
  return toKoreaNationalDigits(phone) || normalizePhoneDigits(phone);
}

function looksLikePhoneName(name, phone, phoneKey) {
  const n = String(name || "").trim();
  if (!n) return true;
  const d = normalizePhoneDigits(n);
  if (d && (d === phoneKey || d === normalizePhoneDigits(phone))) return true;
  const disp = formatLetteringPhoneDisplay(phone) || String(phone || "").trim();
  return n === disp;
}

/**
 * 네이티브 시스템 CallLog JSON 로드.
 * @returns {Promise<Array<{id:string,phone:string,viaNumber:string,durationSec:number,direction:string,dateMs:number,callState:string}>>}
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
        viaNumber: String(row?.viaNumber || "").trim(),
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

/**
 * iOS Recents 식: 시간순(최신 먼저) 연속 동일 번호를 한 행으로 묶고 count 부여.
 * @param {Array} rawEntries CallLog 최신→과거
 */
export function groupConsecutiveCallLogEntries(rawEntries) {
  const list = Array.isArray(rawEntries) ? rawEntries : [];
  const groups = [];
  for (const entry of list) {
    const key = callLogPhoneKey(entry.phone);
    if (!key) continue;
    const last = groups[groups.length - 1];
    if (last && last.phoneKey === key) {
      last.count += 1;
      last.durationSec = Math.max(last.durationSec, entry.durationSec || 0);
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
      id: entry.id || `clog-${key}-${entry.dateMs || Date.now()}`,
      viaNumber: entry.viaNumber || "",
      source: entry.source || "device",
      lineId: entry.lineId || "",
      userId: entry.userId || ""
    });
  }
  return groups;
}

function realMemberName(rawName, phone, phoneKey, agencyName) {
  const name = String(rawName || "").trim();
  if (agencyName && (!name || looksLikePhoneName(name, phone, phoneKey))) return agencyName;
  if (name && !looksLikePhoneName(name, phone, phoneKey)) return name;
  return "";
}

/**
 * localStorage 쇼케이스 히스토리로 이름·verified·avatar enrich (목록 SoT는 CallLog).
 */
export function enrichCallLogGroupsWithShowcaseHistory(groups) {
  const history = readCallShowcaseHistory();
  const byKey = new Map();
  for (const row of history) {
    const key = callLogPhoneKey(row.phoneDisplay || row.phone);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, row);
  }
  return groups.map((g) => {
    const meta = byKey.get(g.phoneKey);
    const agency = matchNationalAgency(g.phoneDisplay || g.phone);
    const memberName =
      String(g.memberName || "").trim() ||
      realMemberName(meta?.name || meta?.cardSnapshot?.name, g.phone, g.phoneKey, agency?.agencyName);
    const verified = agency
      ? true
      : g.verified === true || g.peerIsVlueMember === true
        ? true
        : meta
          ? meta.verified === true
          : false;
    return {
      ...g,
      memberName,
      name: memberName,
      verified,
      membershipTier: g.membershipTier || meta?.membershipTier || null,
      avatarUrl: g.avatarUrl || resolveCallHistoryAvatar(meta || {}) || "",
      cardSnapshot: g.cardSnapshot || meta?.cardSnapshot || null,
      showcaseSnapshot: g.showcaseSnapshot || meta?.showcaseSnapshot || null,
      count: g.count || 1
    };
  });
}

export function applyMemberDirectoryToCallGroups(groups, members) {
  const byKey = new Map();
  for (const row of Array.isArray(members) ? members : []) {
    const key = callLogPhoneKey(row.phoneDisplay || row.phoneE164 || row.phone);
    const name = String(row.name || "").trim();
    if (!key || !name || looksLikePhoneName(name, row.phoneDisplay || row.phoneE164, key)) continue;
    byKey.set(key, row);
  }
  return groups.map((g) => {
    const hit = byKey.get(g.phoneKey);
    if (!hit) return g;
    const memberName = String(hit.name || "").trim();
    return {
      ...g,
      memberName,
      name: memberName,
      verified: true,
      membershipTier: hit.membershipTier || g.membershipTier || "free",
      userId: g.userId || hit.userId || "",
      avatarUrl: g.avatarUrl || String(hit.avatarUrl || "").trim(),
      cardSnapshot: g.cardSnapshot || {
        userId: hit.userId || "",
        name: memberName,
        phone: g.phoneDisplay || g.phone,
        membershipTier: hit.membershipTier || "free",
        photoUrl: hit.avatarUrl || "",
        avatarUrl: hit.avatarUrl || ""
      }
    };
  });
}

function lineEventsToRawEntries(events) {
  return (Array.isArray(events) ? events : []).map((ev) => ({
    id: ev.id,
    phone: ev.phoneDisplay || ev.phone,
    viaNumber: "",
    durationSec: ev.durationSec || 0,
    direction: ev.direction === "out" ? "out" : "in",
    dateMs: ev.dateMs || Date.parse(ev.endedAt) || Date.now(),
    callState: ev.callState || "ended",
    source: "line",
    lineId: ev.lineId || "",
    userId: ev.userId || "",
    memberName: String(ev.memberName || ev.name || "").trim(),
    verified: ev.verified === true,
    membershipTier: ev.membershipTier || null
  }));
}

function attachLineMeta(groups, events) {
  const byId = new Map((Array.isArray(events) ? events : []).map((ev) => [ev.id, ev]));
  return groups.map((g) => {
    const ev = byId.get(g.id);
    if (!ev) return g;
    const memberName = String(ev.memberName || ev.name || "").trim();
    return {
      ...g,
      source: "line",
      lineId: ev.lineId || g.lineId,
      userId: ev.userId || g.userId,
      memberName,
      name: memberName,
      verified: ev.verified === true,
      membershipTier: ev.membershipTier || g.membershipTier
    };
  });
}

function filterDeviceEntriesForLine(entries, selectedLine, lines) {
  const list = Array.isArray(entries) ? entries : [];
  if (!selectedLine || selectedLine === "all") return list;
  const lineKey = callLogPhoneKey(selectedLine.phoneE164 || selectedLine.displayPhone);
  if (!lineKey) return list;
  if (selectedLine.isCertified) {
    const extraKeys = new Set(
      (Array.isArray(lines) ? lines : [])
        .filter((l) => l.id !== selectedLine.id)
        .map((l) => callLogPhoneKey(l.phoneE164 || l.displayPhone))
        .filter(Boolean)
    );
    return list.filter((row) => !extraKeys.has(callLogPhoneKey(row.phone)));
  }
  return list.filter((row) => callLogPhoneKey(row.viaNumber) === lineKey);
}

const DEDUP_MS = 3 * 60 * 1000;

export function mergeDeviceAndLineCallGroups(deviceGroups, lineGroups) {
  const device = Array.isArray(deviceGroups) ? deviceGroups : [];
  const extra = [];
  for (const g of Array.isArray(lineGroups) ? lineGroups : []) {
    const dup = device.some(
      (d) => d.phoneKey === g.phoneKey && Math.abs((d.dateMs || 0) - (g.dateMs || 0)) < DEDUP_MS
    );
    if (!dup) extra.push(g);
  }
  return [...device, ...extra].sort((a, b) => (b.dateMs || 0) - (a.dateMs || 0));
}

export function buildCallHistoryList({ deviceEntries, lineEvents, selectedLine, lines }) {
  const filteredDevice = filterDeviceEntriesForLine(deviceEntries, selectedLine, lines);
  const deviceGroups = enrichCallLogGroupsWithShowcaseHistory(
    groupConsecutiveCallLogEntries(filteredDevice)
  );
  const lineGroups = attachLineMeta(
    groupConsecutiveCallLogEntries(lineEventsToRawEntries(lineEvents)),
    lineEvents
  );
  return enrichCallLogGroupsWithShowcaseHistory(mergeDeviceAndLineCallGroups(deviceGroups, lineGroups));
}

/** VLUE 회원: 이름 + 번호. 비회원: 번호만. */
export function formatCallGroupLabel(call) {
  const phone = String(call?.phoneDisplay || call?.phone || "").trim() || "—";
  const member = String(call?.memberName || "").trim();
  const key = call?.phoneKey || callLogPhoneKey(phone);
  const showName = member && !looksLikePhoneName(member, phone, key);
  const base = showName ? `${member}  ${phone}` : phone;
  const n = Number(call?.count) || 1;
  if (n <= 1) return base;
  return `${base} (${n})`;
}

export { formatCallDuration, formatCallWhen, resolveCallHistoryAvatar };
