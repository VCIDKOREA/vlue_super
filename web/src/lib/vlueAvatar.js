/** 대표·채팅·피드·명함 슬롯별 프로필 이미지 (Data URL 또는 https URL 권장 — blob: 은 세션 후 깨짐) */

import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import { fitImageFileOrThrow, IMAGE_FIT_AVATAR } from "./fitImageFile.js";

const KEYS = {
  primary: "vlue_avatar_primary",
  chat: "vlue_avatar_chat",
  feed: "vlue_avatar_feed",
  card: "vlue_avatar_card"
};

/** VLUE 공식 마크 — 경로·data URL·인라인 SVG 지문까지 차단 */
export function isVlueBrandAssetUrl(url) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (VLUE_SHIELD_LOGO && (s === VLUE_SHIELD_LOGO || s.endsWith(String(VLUE_SHIELD_LOGO).split("/").pop() || ""))) {
    return true;
  }
  const low = s.toLowerCase();
  if (
    low.includes("vlue-shield-logo") ||
    low.includes("vlue-shield-eye") ||
    low.includes("vlue_brand") ||
    low.includes("/assets/vlue-") ||
    (low.includes("vlue") && low.includes("shield") && low.includes("logo"))
  ) {
    return true;
  }
  /* data:image/svg — 공식 마크 지문 (로컬에 박아 둔 경우) */
  if (low.startsWith("data:image/svg")) {
    const decoded = (() => {
      try {
        if (low.includes("utf8,") || low.includes("utf-8,")) {
          return decodeURIComponent(s.replace(/^data:image\/svg\+xml(?:;charset=utf-8)?;?/i, ""));
        }
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })().toLowerCase();
    if (
      decoded.includes("vlue logo") ||
      decoded.includes("q 64 29.733") ||
      (decoded.includes("#2563eb") && decoded.includes("76.9333") && decoded.includes("21.3333"))
    ) {
      return true;
    }
  }
  return false;
}

function sanitizeAvatarUrl(raw) {
  const s = String(raw || "").trim();
  if (!s || s.startsWith("blob:")) return "";
  if (isVlueBrandAssetUrl(s)) return "";
  return s;
}

/** 예전에 박힌 VLUE 로고·오염 아바타 제거 */
export function scrubBrandAvatarsFromStorage() {
  try {
    Object.values(KEYS).forEach((k) => {
      const v = localStorage.getItem(k);
      if (v && isVlueBrandAssetUrl(v)) localStorage.removeItem(k);
    });
    /* 한 번만: 과거 기본 브랜드 로고가 슬롯에 남아 있던 경우를 전부 비움 */
    const migrateKey = "vlue_avatar_scrub_brand_v4";
    if (!localStorage.getItem(migrateKey)) {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(migrateKey, "1");
      try {
        window.dispatchEvent(new Event("vlue-avatar-changed"));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

scrubBrandAvatarsFromStorage();

export function readAvatar(slot = "primary") {
  try {
    const direct = sanitizeAvatarUrl(localStorage.getItem(KEYS[slot] || KEYS.primary));
    if (direct) return direct;
    if (slot !== "primary") {
      const fallback = sanitizeAvatarUrl(localStorage.getItem(KEYS.primary));
      if (fallback) return fallback;
    }
  } catch {
    /* ignore */
  }
  return "";
}

/** 프로필 사진 또는 명함/회사 로고 — 미설정·브랜드 마크면 빈 문자열 */
export function readProfileOrLogoAvatar() {
  scrubBrandAvatarsFromStorage();
  return readAvatar("card") || readAvatar("primary") || "";
}

export function writeAvatar(slot, dataUrlOrUrl) {
  try {
    const k = KEYS[slot] || KEYS.primary;
    const v = sanitizeAvatarUrl(dataUrlOrUrl);
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
    window.dispatchEvent(new Event("vlue-avatar-changed"));
  } catch {
    /* ignore */
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

/** 아바타용 — 픽셀·용량 자동 맞춤 */
export async function fileToFittedAvatarDataUrl(file) {
  const { dataUrl } = await fitImageFileOrThrow(file, IMAGE_FIT_AVATAR);
  return dataUrl;
}
