/**
 * 기기 주소록 읽기 — Contact Picker API · 데모 폴백
 * @returns {Promise<{ name: string, phone: string }[] | null>} null = 지원 안 됨/취소
 */

const DEMO_CONTACTS = [
  { name: "김대표", phone: "010-1234-5678" },
  { name: "이과장", phone: "010-2345-6789" },
  { name: "박팀장", phone: "010-3456-7890" },
  { name: "최이사", phone: "010-4567-8901" }
];

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

/** PC·웹 테스트용 데모 주소록 */
export function getDemoContacts() {
  return DEMO_CONTACTS.map((c) => ({ ...c }));
}
