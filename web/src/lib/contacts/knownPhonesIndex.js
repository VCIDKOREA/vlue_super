/**
 * VLUE 앱 친구·연락처 번호 인덱스 (오버레이 WebView 공유용 localStorage)
 */

export const KNOWN_PHONES_INDEX_KEY = "vlue_known_phones_index_v1";
export const KNOWN_PHONES_INDEX_CHANGED = "vlue-known-phones-index-changed";

/**
 * @returns {{ updatedAt: number, phones: { phone: string, name?: string, source?: string }[] }}
 */
export function readKnownPhonesIndex() {
  try {
    const raw = localStorage.getItem(KNOWN_PHONES_INDEX_KEY);
    if (!raw) return { updatedAt: 0, phones: [] };
    const parsed = JSON.parse(raw);
    return {
      updatedAt: Number(parsed.updatedAt) || 0,
      phones: Array.isArray(parsed.phones) ? parsed.phones : []
    };
  } catch {
    return { updatedAt: 0, phones: [] };
  }
}

/**
 * @param {{ phone: string, name?: string, source?: string }[]} rows
 */
export function writeKnownPhonesIndex(rows) {
  const phones = [];
  const seen = new Set();
  for (const row of rows || []) {
    const phone = String(row?.phone || "").trim();
    if (!phone) continue;
    const key = phone.replace(/\D/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    phones.push({
      phone,
      name: String(row.name || "").trim(),
      source: String(row.source || "vlue")
    });
  }
  const payload = { updatedAt: Date.now(), phones };
  try {
    localStorage.setItem(KNOWN_PHONES_INDEX_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(KNOWN_PHONES_INDEX_CHANGED));
  } catch {
    /* ignore */
  }
  return payload;
}

/**
 * roomCatalog.friends + contact match 등록 친구를 인덱스로 병합
 * @param {{ catalogFriends?: object[], contactMatchData?: object|null }} input
 */
export function upsertKnownPhonesFromFriends({ catalogFriends = [], contactMatchData = null } = {}) {
  const rows = [];
  for (const f of catalogFriends || []) {
    const phone = String(f.phone || f.cardPhone || "").trim();
    if (!phone) continue;
    rows.push({
      phone,
      name: String(f.cardName || f.name || "").trim(),
      source: "vlue_friend"
    });
  }
  for (const u of contactMatchData?.registered || []) {
    const phone = String(u.phoneDisplay || u.phoneE164 || "").trim();
    if (!phone) continue;
    rows.push({
      phone,
      name: String(u.displayName || u.contactName || "").trim(),
      source: u.isFriend ? "vlue_friend" : "vlue_match"
    });
  }
  for (const u of contactMatchData?.unregistered || []) {
    const phone = String(u.phoneDisplay || u.phoneE164 || u.phone || "").trim();
    if (!phone) continue;
    rows.push({
      phone,
      name: String(u.contactName || u.name || "").trim(),
      source: "device_synced"
    });
  }
  const prev = readKnownPhonesIndex().phones.filter((p) => p.source === "device");
  return writeKnownPhonesIndex([...rows, ...prev]);
}
