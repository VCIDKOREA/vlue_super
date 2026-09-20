/**
 * 통화목록 회원 여부 — localStorage 영속 인덱스.
 * v2: v1 이 member-names 실패 시 전원 verified:false 로 독성화하던 것을 폐기.
 */
import { normalizePhoneDigits, toKoreaNationalDigits } from "./letteringPhoneMatch.js";

const STORAGE_KEY = "vlue_call_history_members_v2";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX = 400;

/** @type {Map<string, { verified: boolean, userId?: string, name?: string, membershipTier?: string, at: number }>} */
const mem = new Map();

function keyFor(phone) {
  return (
    toKoreaNationalDigits(phone) ||
    normalizePhoneDigits(phone) ||
    String(phone || "").replace(/\D/g, "")
  );
}

function hydrate() {
  if (typeof localStorage === "undefined") return;
  try {
    /* v1 독성 캐시 제거 */
    try {
      localStorage.removeItem("vlue_call_history_members_v1");
    } catch {
      /* ignore */
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return;
    const now = Date.now();
    for (const row of rows) {
      if (!row?.k || typeof row.verified !== "boolean") continue;
      if (now - (row.at || 0) > TTL_MS) continue;
      mem.set(row.k, {
        verified: row.verified,
        userId: row.userId || "",
        name: row.name || "",
        membershipTier: row.membershipTier || "free",
        at: row.at || now
      });
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    const rows = [...mem.entries()]
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX)
      .map(([k, v]) => ({
        k,
        verified: v.verified,
        userId: v.userId || "",
        name: v.name || "",
        membershipTier: v.membershipTier || "free",
        at: v.at
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

hydrate();

export function readCallHistoryMemberHint(phone) {
  const k = keyFor(phone);
  if (!k) return null;
  const row = mem.get(k);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    mem.delete(k);
    persist();
    return null;
  }
  return row;
}

/** @param {string} phone @param {{ verified: boolean, userId?: string, name?: string, membershipTier?: string }} hint */
export function writeCallHistoryMemberHint(phone, hint) {
  const k = keyFor(phone);
  if (!k || !hint || typeof hint.verified !== "boolean") return;
  const prev = mem.get(k);
  /* 회원 → 비회원 강등 금지 */
  if (prev?.verified === true && hint.verified === false) return;
  mem.set(k, {
    verified: hint.verified,
    userId: String(hint.userId || prev?.userId || "").trim(),
    name: String(hint.name || prev?.name || "").trim(),
    membershipTier:
      String(hint.membershipTier || prev?.membershipTier || "free").trim() || "free",
    at: Date.now()
  });
  if (mem.size > MAX) {
    const oldest = [...mem.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) mem.delete(oldest[0]);
  }
  persist();
}

/**
 * member-names 성공 시 회원만 기록.
 * miss → verified:false 쓰지 않음 (빈 배열·키 불일치가 전원 비회원으로 독성화하던 버그).
 * @param {string[]} _lookedUpPhones
 * @param {object[]|null|undefined} members
 */
export function rememberMemberDirectoryResults(_lookedUpPhones, members) {
  if (members == null) return;
  const list = Array.isArray(members) ? members : [];
  for (const row of list) {
    const phone = row.phoneDisplay || row.phoneE164 || row.phone || "";
    if (!phone) continue;
    writeCallHistoryMemberHint(phone, {
      verified: true,
      userId: row.userId || "",
      name: row.name || "",
      membershipTier: row.membershipTier || "free"
    });
  }
}

/** 양수 회원 힌트만 목록에 적용 — verified:false 로 행을 오염시키지 않음 */
export function applyPersistedMemberHintsToCallGroups(groups) {
  return (Array.isArray(groups) ? groups : []).map((g) => {
    const phone = g.phoneDisplay || g.phone;
    const hint = readCallHistoryMemberHint(phone);
    if (!hint?.verified) return g;
    const snap = g.cardSnapshot && typeof g.cardSnapshot === "object" ? g.cardSnapshot : {};
    const memberName =
      String(g.memberName || "").trim() || String(hint.name || "").trim() || "";
    return {
      ...g,
      verified: true,
      peerIsVlueMember: true,
      userId: g.userId || hint.userId || "",
      memberName: memberName || g.memberName || "",
      membershipTier: g.membershipTier || hint.membershipTier || "free",
      name: memberName || g.name || "",
      cardSnapshot: {
        ...snap,
        userId: snap.userId || hint.userId || g.userId || "",
        name: snap.name || memberName || "",
        membershipTier: snap.membershipTier || hint.membershipTier || "free"
      }
    };
  });
}
