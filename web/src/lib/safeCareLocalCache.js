/**
 * 통화목록「안심 저장」— 웹 로컬 미러 + 네이티브 PublicDirectory/CardLookup 캐시.
 * ENABLE_DIRECTORY_SYNC 와 무관 (원클릭 단건만).
 */

import { resolveIsKnownContactSync } from "./contacts/hybridKnownContact.js";

const STORAGE_KEY = "vlue_safe_care_local_v1";
export const SAFE_CARE_LOCAL_CHANGED = "vlue-safe-care-local-changed";

function phoneKeys(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return [];
  const out = new Set([d]);
  if (d.startsWith("82") && d.length > 2) {
    const rest = d.slice(2);
    out.add(rest);
    if (!rest.startsWith("0")) out.add(`0${rest}`);
  }
  if (d.startsWith("0") && d.length > 1) out.add(d.slice(1));
  return [...out];
}

export function readSafeCareLocalMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(SAFE_CARE_LOCAL_CHANGED));
  } catch {
    /* quota */
  }
}

export function peekSafeCareLocal(phone) {
  const map = readSafeCareLocalMap();
  for (const k of phoneKeys(phone)) {
    const hit = map[k];
    if (hit && String(hit.displayName || "").trim()) return hit;
  }
  return null;
}

export function writeSafeCareLocalEntry(phone, displayName, meta = {}) {
  const name = String(displayName || "").trim();
  const keys = phoneKeys(phone).filter((k) => k.length >= 8);
  if (!name || !keys.length) return false;
  const map = readSafeCareLocalMap();
  const entry = {
    displayName: name,
    organization: String(meta.organization || "").trim(),
    savedAt: Date.now()
  };
  for (const k of keys) map[k] = entry;
  writeMap(map);
  return true;
}

/** 목록 보강 — 저장된 상호/이름을 contactName 후보로 */
export function applySafeCareLocalToCallGroups(groups) {
  return (Array.isArray(groups) ? groups : []).map((g) => {
    const phone = g.phoneDisplay || g.phone;
    const hit = peekSafeCareLocal(phone);
    if (!hit) return g;
    const name = String(hit.displayName || "").trim();
    if (!name) return g;
    const member = String(g.memberName || "").trim();
    return {
      ...g,
      contactName: g.contactName || name,
      name: member || g.name || name,
      safeCareCached: true
    };
  });
}

export function resolveSafeCareDisplayName(call) {
  if (!call) return "";
  const snap = call.cardSnapshot && typeof call.cardSnapshot === "object" ? call.cardSnapshot : {};
  return (
    String(call.memberName || "").trim() ||
    String(call.contactName || "").trim() ||
    String(call.name || "").trim() ||
    String(snap.organization || snap.companyName || snap.name || "").trim() ||
    String(call.phoneDisplay || call.phone || "").trim()
  );
}

/**
 * 원클릭 캐시 — web localStorage + Android.saveSafeCareCache.
 * @returns {{ ok: boolean, error?: string }}
 */
export function saveSafeCareOneClick(call) {
  const phone = String(call?.phoneDisplay || call?.phone || "").trim();
  const displayName = resolveSafeCareDisplayName(call);
  if (!phone || !displayName) return { ok: false, error: "empty" };
  const snap = call?.cardSnapshot && typeof call.cardSnapshot === "object" ? call.cardSnapshot : {};
  writeSafeCareLocalEntry(phone, displayName, {
    organization: snap.organization || snap.companyName || ""
  });
  try {
    const bridge = window.Android || window.VlueLettering;
    if (bridge?.saveSafeCareCache) {
      const raw = bridge.saveSafeCareCache(phone, displayName);
      if (typeof raw === "string" && raw.trim().startsWith("{")) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ok === false) {
          return { ok: true, nativeOk: false, error: parsed.error || "native" };
        }
      }
    }
  } catch (e) {
    return { ok: true, nativeOk: false, error: String(e?.message || e) };
  }
  return { ok: true, nativeOk: true };
}

export function isSafeCareSaved(phone) {
  return Boolean(peekSafeCareLocal(phone));
}

/**
 * 이미 기기 주소록·친구·안심캐시에 있으면 안심 저장 불필요.
 * @returns {boolean} true 이면 목록에「안심 저장」버튼을 보여도 됨
 */
export function needsSafeCareSave(call) {
  const phone = String(call?.phoneDisplay || call?.phone || "").trim();
  if (!phone || phone === "—") return false;
  if (call?.safeCareCached || isSafeCareSaved(phone)) return false;
  const contactName = String(call?.contactName || "").trim();
  if (contactName) return false;
  const known = resolveIsKnownContactSync(phone);
  if (known?.isKnownContact) return false;
  return true;
}
