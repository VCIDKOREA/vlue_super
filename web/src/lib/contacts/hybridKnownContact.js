import { normalizePhoneDigits } from "../letteringPhoneMatch.js";
import { readContactMatchCache } from "../contactSyncStorage.js";
import { readDeviceContactsCache, syncDeviceContactsFromNative } from "./deviceContactsCache.js";
import { readKnownPhonesIndex, upsertKnownPhonesFromFriends } from "./knownPhonesIndex.js";

/**
 * KR 번호 변형 키 집합 (010 / 82 / +82)
 * @param {string} raw
 * @returns {Set<string>}
 */
export function phoneMatchKeys(raw) {
  const digits = normalizePhoneDigits(raw);
  const keys = new Set();
  if (!digits) return keys;
  keys.add(digits);
  if (digits.startsWith("82") && digits.length >= 10) {
    keys.add(`0${digits.slice(2)}`);
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    keys.add(`82${digits.slice(1)}`);
  }
  if (digits.length === 11 && digits.startsWith("010")) {
    keys.add(digits.slice(1));
  }
  return keys;
}

/**
 * @param {string} a
 * @param {string} b
 */
export function phonesMatchLoose(a, b) {
  const ka = phoneMatchKeys(a);
  const kb = phoneMatchKeys(b);
  for (const k of ka) {
    if (kb.has(k)) return true;
  }
  return false;
}

function collectIndexPhones() {
  const phones = [];
  const index = readKnownPhonesIndex();
  for (const row of index?.phones || []) {
    if (row?.phone) phones.push({ phone: row.phone, source: row.source || "vlue", name: row.name || "" });
  }

  const cache = readContactMatchCache();
  for (const u of cache?.registered || []) {
    const phone = u.phoneDisplay || u.phoneE164 || "";
    if (phone) phones.push({ phone, source: "vlue_match", name: u.displayName || u.contactName || "" });
  }
  for (const u of cache?.unregistered || []) {
    const phone = u.phoneDisplay || u.phoneE164 || u.phone || "";
    if (phone) phones.push({ phone, source: "device_synced", name: u.contactName || u.name || "" });
  }

  const device = readDeviceContactsCache();
  for (const c of device?.contacts || []) {
    if (c?.phone) phones.push({ phone: c.phone, source: "device", name: c.name || "" });
  }

  return phones;
}

/**
 * 하이브리드 주소록 판별 — VLUE 친구 DB + 디바이스 주소록
 * @param {string} peerPhone
 * @param {{ refreshDevice?: boolean }} [opts]
 * @returns {Promise<{ isKnownContact: boolean, matchedName: string, sources: string[] }>}
 */
export async function resolveIsKnownContact(peerPhone, opts = {}) {
  const target = String(peerPhone || "").trim();
  if (!target) {
    return { isKnownContact: false, matchedName: "", sources: [] };
  }

  if (opts.refreshDevice !== false) {
    try {
      await syncDeviceContactsFromNative();
    } catch {
      /* ignore — cache/local still used */
    }
  }

  const sources = [];
  let matchedName = "";
  const rows = collectIndexPhones();

  for (const row of rows) {
    if (!phonesMatchLoose(target, row.phone)) continue;
    if (!sources.includes(row.source)) sources.push(row.source);
    if (!matchedName && row.name) matchedName = row.name;
  }

  return {
    isKnownContact: sources.length > 0,
    matchedName,
    sources
  };
}

/**
 * 동기 판별 (캐시만 — 오버레이 첫 페인트용)
 * @param {string} peerPhone
 */
export function resolveIsKnownContactSync(peerPhone) {
  const target = String(peerPhone || "").trim();
  if (!target) return { isKnownContact: false, matchedName: "", sources: [] };
  const sources = [];
  let matchedName = "";
  for (const row of collectIndexPhones()) {
    if (!phonesMatchLoose(target, row.phone)) continue;
    if (!sources.includes(row.source)) sources.push(row.source);
    if (!matchedName && row.name) matchedName = row.name;
  }
  return { isKnownContact: sources.length > 0, matchedName, sources };
}

/** App에서 친구 목록 변경 시 인덱스 갱신 */
export { upsertKnownPhonesFromFriends };
