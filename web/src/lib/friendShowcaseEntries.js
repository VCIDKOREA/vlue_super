import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { resolveFriendShowcaseUpdatedAt } from "./friendShowcaseActivity.js";

/**
 * 홈 친구 쇼케이스 목록 — roomCatalog.friends + 주소록 친구(isFriend) 병합
 * 데모/시드 친구는 넣지 않음.
 * @param {{ catalogFriends?: object[], contactMatchData?: object | null }} input
 */
export function buildFriendShowcaseEntries({ catalogFriends = [], contactMatchData = null } = {}) {
  const byKey = new Map();

  for (const f of catalogFriends) {
    const phone = String(f.phone || f.cardPhone || "").trim();
    const name = String(f.cardName || f.name || "").trim();
    if (!name) continue;
    const entry = {
      id: f.id,
      name,
      phone: phone || "",
      phoneDisplay: phone ? formatLetteringPhoneDisplay(phone) : "",
      subtitle:
        [f.cardOrg, f.cardTitle].filter(Boolean).join(" · ") ||
        String(f.lastMsg || "").trim() ||
        "블루 쇼케이스 연결됨",
      membershipTier: f.membershipTier || "free",
      avatarUrl: String(f.avatarUrl || f.avatar || "").trim(),
      org: String(f.cardOrg || "").trim(),
      title: String(f.cardTitle || "").trim(),
      showcaseUpdatedAt: f.showcaseUpdatedAt || f.updatedAt || f.lastActiveAt || 0
    };
    entry.updatedAt = resolveFriendShowcaseUpdatedAt(entry);
    byKey.set(`catalog:${f.id}`, entry);
  }

  for (const u of contactMatchData?.registered || []) {
    if (!u.isFriend) continue;
    const key = `contact:${u.userId || u.phoneE164}`;
    if (byKey.has(key)) continue;
    const phone = String(u.phoneDisplay || u.phoneE164 || "").trim();
    const name = String(u.displayName || u.contactName || "").trim();
    if (!name) continue;
    const entry = {
      id: u.userId || u.phoneE164,
      name,
      phone,
      phoneDisplay: phone ? formatLetteringPhoneDisplay(phone) : phone,
      subtitle: u.publicHandle ? `${u.publicHandle} · VLUE 친구` : "VLUE 친구",
      membershipTier: "paid",
      avatarUrl: "",
      org: "",
      title: "",
      showcaseUpdatedAt: u.showcaseUpdatedAt || u.updatedAt || 0
    };
    entry.updatedAt = resolveFriendShowcaseUpdatedAt(entry);
    byKey.set(key, entry);
  }

  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
