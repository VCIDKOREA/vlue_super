/**
 * 기기 주소록 읽기 — Contact Picker API
 * 데모 연락처 폴백 없음 (김대표·이과장 등 테스트 데이터 제거)
 * @returns {Promise<{ name: string, phone: string }[] | null>} null = 지원 안 됨/취소
 */

const LEGACY_DEMO_PHONES = new Set(["01012345678", "01023456789", "01034567890", "01045678901"]);

function flattenContactPickerRows(rows) {
  const out = [];
  for (const row of rows || []) {
    const name =
      row.name?.[0] ||
      [row.name?.[0]?.givenName, row.name?.[0]?.familyName].filter(Boolean).join(" ") ||
      "연락처";
    const tels = row.tel || [];
    for (const tel of tels) {
      const phone = typeof tel === "string" ? tel : tel?.number || "";
      if (phone) out.push({ name, phone });
    }
  }
  return out;
}

/** 과거 데모 주소록인지 판별 */
export function isLegacyDemoContact(contact) {
  const digits = String(contact?.phone || "").replace(/\D/g, "");
  const name = String(contact?.name || "").trim();
  if (LEGACY_DEMO_PHONES.has(digits)) return true;
  return ["김대표", "이과장", "박팀장", "최이사"].includes(name);
}

export function stripLegacyDemoContacts(contacts = []) {
  return (contacts || []).filter((c) => !isLegacyDemoContact(c));
}

export function isContactPickerSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.contacts?.select);
}

/** @returns {Promise<{ name: string, phone: string }[] | null>} */
export async function pickDeviceContacts() {
  if (isContactPickerSupported()) {
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const flat = flattenContactPickerRows(picked);
      return flat.length ? flat : [];
    } catch {
      return null;
    }
  }
  return null;
}

/** @deprecated 데모 제거 — 빈 배열 */
export function getDemoContacts() {
  return [];
}
