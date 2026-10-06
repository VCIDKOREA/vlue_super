const STORAGE_KEY = "vlue_protection_invite";

export function normalizeProtectionInviteCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function captureProtectionInviteFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const code = normalizeProtectionInviteCode(params.get("invite") || params.get("inviteCode") || "");
    if (code.length === 6) {
      sessionStorage.setItem(STORAGE_KEY, code);
      return code;
    }
  } catch {
    /* ignore */
  }
  return readStoredProtectionInvite();
}

export function readStoredProtectionInvite() {
  try {
    const code = normalizeProtectionInviteCode(sessionStorage.getItem(STORAGE_KEY) || "");
    return code.length === 6 ? code : "";
  } catch {
    return "";
  }
}

export function clearStoredProtectionInvite() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function protectionInviteShareUrl(inviteCode) {
  const code = normalizeProtectionInviteCode(inviteCode);
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("invite", code);
  url.searchParams.set("audience", "elder");
  return url.toString();
}
