import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const ACK_PREFIX = "vlue_welcome_letter_ack_v";

export function digitalLetterAckKey(letter) {
  const id = String(letter?.id || "").trim();
  const ver = Number(letter?.version) || 1;
  return `${ACK_PREFIX}${id || "none"}_${ver}`;
}

export function hasAcknowledgedDigitalLetter(letter) {
  if (!letter?.id || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(digitalLetterAckKey(letter)) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeDigitalLetter(letter) {
  if (!letter?.id || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(digitalLetterAckKey(letter), "1");
  } catch {
    /* ignore */
  }
}

export async function fetchActiveDigitalLetter() {
  const res = await vlueAuthFetch(apiUrl("/api/office/digital-letter/active"), {
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "편지를 불러오지 못했습니다.");
  return data;
}

export function shouldAutoOpenDigitalLetter(letter) {
  if (!letter?.id || !letter?.isActive) return false;
  return !hasAcknowledgedDigitalLetter(letter);
}
