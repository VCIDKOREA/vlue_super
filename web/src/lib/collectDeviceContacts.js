import { syncDeviceContactsFromNative } from "./contacts/deviceContactsCache.js";
import { pickDeviceContacts, isContactPickerSupported, getDemoContacts } from "./contactDevicePicker.js";

/**
 * 기기 주소록 수집 — 네이티브 → Contact Picker → (선택) 데모
 * @param {{ allowDemoConfirm?: boolean }} [opts]
 * @returns {Promise<{ name: string, phone: string }[]>}
 */
export async function collectDeviceContactsForSync(opts = {}) {
  const { allowDemoConfirm = true } = opts;

  const fromNative = await syncDeviceContactsFromNative();
  if (fromNative?.length) return fromNative;

  const picked = await pickDeviceContacts();
  if (picked?.length) return picked;

  if (!isContactPickerSupported() && allowDemoConfirm && typeof window !== "undefined") {
    const useDemo = window.confirm(
      "이 환경에서는 휴대폰 주소록을 직접 읽을 수 없습니다.\n테스트용 데모 연락처로 매칭을 체험할까요?\n\n실기기(앱)에서는 저장된 전화부 명단이 표시됩니다."
    );
    if (useDemo) return getDemoContacts();
  }

  return [];
}
