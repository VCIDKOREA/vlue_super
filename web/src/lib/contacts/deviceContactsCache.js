/**
 * 디바이스 주소록 캐시 — 네이티브 브릿지 + Contact Picker 결과
 */

export const DEVICE_CONTACTS_CACHE_KEY = "vlue_device_contacts_cache_v1";
export const DEVICE_CONTACTS_CHANGED = "vlue-device-contacts-changed";

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
    const key = phone.replace(/\D/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({ name: String(c.name || "").trim(), phone });
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
 * @returns {Promise<{ name: string, phone: string }[]>}
 */
export async function syncDeviceContactsFromNative() {
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
    writeDeviceContactsCache(contacts);
    return contacts;
  }
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
