/**
 * 통화목록 회원 여부 — localStorage 영속 인덱스.
 * session 예열(warm)이 verified 없이 덮어써도 CTA 가「전달」로 먼저 뜨지 않게 한다.
 */
import { normalizePhoneDigits, toKoreaNationalDigits } from "./letteringPhoneMatch.js";

const STORAGE_KEY = "vlue_call_history_members_v1";
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
  /* 회원 → 비회원 강등 금지 (부분 응답·포맷 불일치 레이스) */
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
 * member-names API 성공 결과만 기록.
 * @param {string[]} lookedUpPhones
 * @param {object[]|null|undefined} members — null/undefined 이면 API 실패로 보고 miss 미기록
 */
export function rememberMemberDirectoryResults(lookedUpPhones, members) {
  if (members == null) return;
  const list = Array.isArray(members) ? members : [];
  const hitKeys = new Set();
  for (const row of list) {
    const phone = row.phoneDisplay || row.phoneE164 || row.phone || "";
    const k = keyFor(phone);
    if (!k) continue;
    hitKeys.add(k);
    writeCallHistoryMemberHint(phone, {
      verified: true,
      userId: row.userId || "",
      name: row.name || "",
      membershipTier: row.membershipTier || "free"
    });
  }
  for (const phone of Array.isArray(lookedUpPhones) ? lookedUpPhones : []) {
    const k = keyFor(phone);
    if (!k || hitKeys.has(k)) continue;
    writeCallHistoryMemberHint(phone, {
      verified: false,
      userId: "",
      name: "",
      membershipTier: "free"
    });
  }
}

/** CallLog 그룹에 영속 회원 힌트 적용 */
export function applyPersistedMemberHintsToCallGroups(groups) {
  return (Array.isArray(groups) ? groups : []).map((g) => {
    const phone = g.phoneDisplay || g.phone;
    const hint = readCallHistoryMemberHint(phone);
    if (!hint) return g;
    if (hint.verified) {
      const snap = g.cardSnapshot && typeof g.cardSnapshot === "object" ? g.cardSnapshot : {};
      const memberName =
        String(g.memberName || "").trim() ||
        String(hint.name || "").trim() ||
        "";
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
    }
    /* 비회원 확정 — 이미 회원 플래그 있으면 유지 */
    if (g.verified === true || g.userId || g.peerIsVlueMember === true) return g;
    return {
      ...g,
      verified: false,
      peerIsVlueMember: false
    };
  });
}
