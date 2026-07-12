import { isLegacyDemoContact } from "./contactDevicePicker.js";

const CONSENT_KEY = "vlue_contact_sync_consent_v1";
const PROMPT_DONE_KEY = "vlue_contact_sync_prompt_done_v1";
const PENDING_KEY = "vlue_contact_sync_pending_v1";
const CACHE_KEY = "vlue_contact_match_cache_v1";

function scrubMatchPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const unregistered = (payload.unregistered || []).filter((row) => !isLegacyDemoContact({ name: row.contactName, phone: row.phoneDisplay || row.phoneE164 }));
  return { ...payload, unregistered };
}

export function markContactSyncPending() {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeContactSyncPending() {
  try {
    const v = localStorage.getItem(PENDING_KEY) === "1";
    if (v) localStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return false;
  }
}

export function hasContactSyncConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setContactSyncConsent(granted) {
  try {
    if (granted) localStorage.setItem(CONSENT_KEY, "1");
    else localStorage.removeItem(CONSENT_KEY);
    localStorage.setItem(PROMPT_DONE_KEY, "1");
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function markContactSyncPromptDone() {
  try {
    localStorage.setItem(PROMPT_DONE_KEY, "1");
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldShowContactSyncPrompt({ isLoggedIn, showAppShell }) {
  if (!isLoggedIn || !showAppShell) return false;
  try {
    return localStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveContactMatchCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...payload }));
  } catch {
    /* ignore */
  }
}

export function readContactMatchCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = scrubMatchPayload(JSON.parse(raw));
    return parsed;
  } catch {
    return null;
  }
}
