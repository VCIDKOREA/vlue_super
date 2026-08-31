import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { formatPhoneE164ForKoreaDisplay } from "./phoneDisplay.js";
import { LETTERING_BIZCARD_CHANGED_EVENT } from "./letteringBizcardStorage.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const PHONE_CHANGE_CERT_KEY = "vlue_phone_change_cert_v1";
export const PHONE_CHANGE_RESUME_KEY = "vlue_phone_change_resume";

export function markPhoneChangeCertPending() {
  try {
    sessionStorage.setItem(PHONE_CHANGE_CERT_KEY, "1");
    sessionStorage.setItem(PHONE_CHANGE_RESUME_KEY, "settings");
  } catch {
    /* ignore */
  }
}

export function clearPhoneChangeCertPending() {
  try {
    sessionStorage.removeItem(PHONE_CHANGE_CERT_KEY);
    sessionStorage.removeItem(PHONE_CHANGE_RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export function isPhoneChangeCertPending() {
  try {
    return sessionStorage.getItem(PHONE_CHANGE_CERT_KEY) === "1";
  } catch {
    return false;
  }
}

export function readPhoneChangeResume() {
  try {
    return String(sessionStorage.getItem(PHONE_CHANGE_RESUME_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function persistPhoneChangeLocally(phoneE164) {
  const e164 = String(phoneE164 || "").trim();
  if (!e164) return "";
  const display = formatPhoneE164ForKoreaDisplay(e164);
  try {
    localStorage.setItem("vlue_phone_e164", e164);
    if (display) localStorage.setItem("myCardPhone", display);
    window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
  return display || e164;
}

export async function changePhoneWithIdentity(impUid) {
  const res = await vlueAuthFetch(apiUrl("/api/auth/phone/change-with-identity"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ impUid })
  });
  const data = await parseJson(res);
  const display = persistPhoneChangeLocally(data.phoneE164);
  return { ...data, phoneDisplay: display };
}

export async function findLoginIdWithIdentity(impUid) {
  const res = await fetch(apiUrl("/api/auth/find-id-with-identity"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ impUid })
  });
  return parseJson(res);
}

export async function findLoginIdWithEmailToken(token) {
  const res = await fetch(apiUrl("/api/auth/find-id-with-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return parseJson(res);
}
