import { syncDeviceContactsFromNative, readDeviceContactsCache, writeDeviceContactsCache } from "./contacts/deviceContactsCache.js";
import { pickDeviceContacts, isContactPickerSupported, stripLegacyDemoContacts } from "./contactDevicePicker.js";

/**
 * 기기 주소록 수집 — 네이티브 → Contact Picker (데모 폴백 없음)
 * @param {{ allowDemoConfirm?: boolean }} [opts] allowDemoConfirm는 무시(호환용)
 * @returns {Promise<{ name: string, phone: string }[]>}
 */
export async function collectDeviceContactsForSync(_opts = {}) {
  const fromNative = await syncDeviceContactsFromNative();
  if (fromNative?.length) {
    const cleaned = stripLegacyDemoContacts(fromNative);
    if (cleaned.length !== fromNative.length) writeDeviceContactsCache(cleaned);
    return cleaned;
  }

  const picked = await pickDeviceContacts();
  if (picked?.length) return stripLegacyDemoContacts(picked);

  /* 캐시에 남은 데모 연락처 제거 */
  const cached = readDeviceContactsCache().contacts;
  const cleanedCache = stripLegacyDemoContacts(cached);
  if (cleanedCache.length !== cached.length) writeDeviceContactsCache(cleanedCache);

  if (!isContactPickerSupported() && typeof window !== "undefined") {
    /* 웹에서는 주소록 API가 없을 수 있음 — 빈 목록 */
    return cleanedCache;
  }

  return cleanedCache;
}
