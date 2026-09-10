import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const ACK_PREFIX = "vlue_welcome_letter_ack_v";
const BGM_VOLUME_KEY = "vlue_welcome_letter_bgm_volume";
const BGM_MUTED_KEY = "vlue_welcome_letter_bgm_muted";

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

export function clampLetterBgmVolume(v, fallback = 0.45) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** 사용자 볼륨 저장값 우선, 없으면 편지(관리자) 기본 볼륨 */
export function readLetterBgmVolume(letterDefault) {
  const fallback = clampLetterBgmVolume(letterDefault, 0.45);
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(BGM_VOLUME_KEY);
    if (raw == null || raw === "") return fallback;
    return clampLetterBgmVolume(raw, fallback);
  } catch {
    return fallback;
  }
}

export function writeLetterBgmVolume(volume) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BGM_VOLUME_KEY, String(clampLetterBgmVolume(volume)));
  } catch {
    /* ignore */
  }
}

export function readLetterBgmMuted() {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(BGM_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLetterBgmMuted(muted) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BGM_MUTED_KEY, muted ? "1" : "0");
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
