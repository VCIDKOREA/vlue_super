/**
 * 디바이스 주소록 캐시 — 네이티브 브릿지 + Contact Picker 결과
 */

export const DEVICE_CONTACTS_CACHE_KEY = "vlue_device_contacts_cache_v1";
export const DEVICE_CONTACTS_CHANGED = "vlue-device-contacts-changed";

function normalizePhoneKey(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("82") && d.length >= 11) {
    const rest = d.slice(2);
    return rest.startsWith("0") ? rest : `0${rest}`;
  }
  if (d.startsWith("0")) return d;
  if (d.length >= 9 && d.length <= 11) return `0${d}`;
  return d;
}

/**
 * @returns {{ updatedAt: number, contacts: { name: string, phone: string }[] }}
 */
export function readDeviceContactsCache() {
  try {
    const raw = localStorage.getItem(DEVICE_CONTACTS_CACHE_KEY);
    if (!raw) return { updatedAt: 0, contacts: [] };
    const parsed = JSON.parse(raw);
    return {
      updatedAt: Number(parsed.updatedAt) || 0,
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
    };
  } catch {
    return { updatedAt: 0, contacts: [] };
  }
}

/**
 * @param {{ name?: string, phone?: string }[]} contacts
 */
export function writeDeviceContactsCache(contacts) {
  const list = [];
  const seen = new Set();
  for (const c of contacts || []) {
    const phone = String(c?.phone || "").trim();
    if (!phone) continue;
    const key = normalizePhoneKey(phone);
    if (!key || key.length < 8 || seen.has(key)) continue;
    seen.add(key);
    list.push({
      name: String(c.name || "").trim(),
      phone,
      normalized: key
    });
  }
  const payload = { updatedAt: Date.now(), contacts: list };
  try {
    localStorage.setItem(DEVICE_CONTACTS_CACHE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(DEVICE_CONTACTS_CHANGED));
  } catch {
    /* ignore */
  }
  return payload;
}

function parseNativeContactsJson(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.contacts)) return parsed.contacts;
    return [];
  } catch {
    return [];
  }
}

/**
 * Android/iOS 네이티브에서 주소록 JSON 동기화
 * (짧은 간격 중복 호출은 캐시만 반환 — WebView 블로킹·트래픽 방지)
 * 빈 결과는 cooldown 에 넣지 않아 권한 직후 재시도가 막히지 않게 한다.
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ name: string, phone: string }[]>}
 */
let _deviceContactsSyncAt = 0;
const DEVICE_CONTACTS_SYNC_MIN_MS = 60_000;

export async function syncDeviceContactsFromNative(opts = {}) {
  const force = Boolean(opts.force);
  const now = Date.now();
  if (!force && now - _deviceContactsSyncAt < DEVICE_CONTACTS_SYNC_MIN_MS) {
    return readDeviceContactsCache().contacts;
  }

  let raw = null;
  try {
    if (typeof window.VlueLettering?.getDeviceContactsJson === "function") {
      raw = window.VlueLettering.getDeviceContactsJson();
    } else if (typeof window.Android?.getDeviceContactsJson === "function") {
      raw = window.Android.getDeviceContactsJson();
    }
  } catch {
    raw = null;
  }

  if (raw && typeof raw.then === "function") {
    try {
      raw = await raw;
    } catch {
      raw = null;
    }
  }

  const contacts = parseNativeContactsJson(raw);
  if (contacts.length) {
    _deviceContactsSyncAt = Date.now();
    return writeDeviceContactsCache(contacts).contacts;
  }
  /* 빈 목록은 throttle 하지 않음 — 권한 레이스 / 일시 실패 대비 */
  return readDeviceContactsCache().contacts;
}

/**
 * Contact Picker / 데모 결과를 캐시에 병합
 * @param {{ name?: string, phone?: string }[]} contacts
 */
export function mergeDeviceContactsCache(contacts) {
  const prev = readDeviceContactsCache().contacts;
  return writeDeviceContactsCache([...prev, ...(contacts || [])]).contacts;
}
