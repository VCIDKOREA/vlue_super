import { postLetteringPhoneBlock } from "./letteringApi.js";
import { normalizePhoneDigits } from "./letteringPhoneMatch.js";

export const LETTERING_BLOCKED_PHONES_KEY = "vlue_lettering_blocked_phones";

export function readLetteringBlockedPhones() {
  try {
    const raw = localStorage.getItem(LETTERING_BLOCKED_PHONES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLetteringBlockedPhones(items) {
  try {
    localStorage.setItem(LETTERING_BLOCKED_PHONES_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("vlue-lettering-blocked-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * 앱·WebView 브리지로 단말 차단 목록 연동 (Android Telecom / iOS Call Directory)
 * @returns {{ ok: boolean, channel?: string, needsNative?: boolean }}
 */
export function requestNativePhoneBlock(phoneDigits, meta = {}) {
  const digits = normalizePhoneDigits(phoneDigits);
  if (!digits) return { ok: false, needsNative: true };

  const payload = { phone: digits, ...meta };

  if (typeof window !== "undefined") {
    const bridge = window.VlueLettering;
    if (bridge?.blockPhoneNumber) {
      try {
        bridge.blockPhoneNumber(digits, meta);
        return { ok: true, channel: "VlueLettering.blockPhoneNumber" };
      } catch {
        /* fall through */
      }
    }
    if (window.Android?.blockPhoneNumber) {
      try {
        window.Android.blockPhoneNumber(digits);
        return { ok: true, channel: "Android.blockPhoneNumber" };
      } catch {
        /* fall through */
      }
    }
    if (window.webkit?.messageHandlers?.vlueLetteringBlock) {
      try {
        window.webkit.messageHandlers.vlueLetteringBlock.postMessage(payload);
        return { ok: true, channel: "webkit.vlueLetteringBlock" };
      } catch {
        /* fall through */
      }
    }
  }

  return { ok: false, needsNative: true };
}

/** VLUE 앱 차단 목록 + 서버 블랙리스트 + 네이티브 차단 요청 */
export async function blockLetteringPhone(phoneRaw, meta = {}) {
  const digits = normalizePhoneDigits(phoneRaw);
  if (!digits) return { ok: false };

  let server = { ok: false };
  try {
    server = await postLetteringPhoneBlock(digits || phoneRaw, meta);
  } catch {
    /* local fallback */
  }

  const entry = {
    phone: digits,
    blockedAt: new Date().toISOString(),
    reportId: meta.reportId || "",
    reason: meta.reason || "",
    blockOnly: Boolean(meta.blockOnly)
  };

  const prev = readLetteringBlockedPhones();
  const next = [entry, ...prev.filter((item) => normalizePhoneDigits(item.phone) !== digits)];
  writeLetteringBlockedPhones(next);

  const native = requestNativePhoneBlock(digits, meta);
  return { ok: true, native, server };
}

/** 신고 없이 차단만 */
export async function blockLetteringPhoneOnly(phoneRaw, meta = {}) {
  return blockLetteringPhone(phoneRaw, {
    ...meta,
    blockOnly: true,
    reason: meta.reason || "차단만"
  });
}

export function isLetteringPhoneBlocked(phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  if (!digits) return false;
  return readLetteringBlockedPhones().some((item) => normalizePhoneDigits(item.phone) === digits);
}
