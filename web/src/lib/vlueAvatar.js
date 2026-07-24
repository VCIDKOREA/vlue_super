/** 대표·채팅·피드·명함 슬롯별 프로필 이미지 (Data URL 또는 https URL 권장 — blob: 은 세션 후 깨짐) */

import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import { compressAndUploadMediaImageOrThrow } from "./mediaImageUpload.js";

const KEYS = {
  primary: "vlue_avatar_primary",
  chat: "vlue_avatar_chat",
  feed: "vlue_avatar_feed",
  card: "vlue_avatar_card"
};

const PHOTO_SLOTS = ["primary", "feed", "chat"];

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

function readRawSlot(slot) {
  try {
    return sanitizeAvatarUrl(localStorage.getItem(KEYS[slot] || KEYS.primary));
  } catch {
    return "";
  }
}

function writeRawSlot(slot, url) {
  try {
    const k = KEYS[slot] || KEYS.primary;
    const v = sanitizeAvatarUrl(url);
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function readLetteringPhotoUrl() {
  try {
    /* 동적 import 불가(동기 마이그레이션) — 명함 스토리지 키를 직접 읽음 */
    const metaRaw = localStorage.getItem("vlue_lettering_bizcard_v1");
    const photoBlob = localStorage.getItem("vlue_lettering_photo_data_v1");
    let noProfilePhoto = false;
    let metaPhoto = "";
    if (metaRaw) {
      const parsed = JSON.parse(metaRaw);
      noProfilePhoto = Boolean(parsed?.noProfilePhoto);
      metaPhoto = String(parsed?.photoDataUrl || parsed?.photoUrl || "").trim();
    }
    if (noProfilePhoto) return "";
    return sanitizeAvatarUrl(photoBlob || metaPhoto);
  } catch {
    return "";
  }
}

/**
 * primary / feed / chat / 명함 photoDataUrl 을 한 장으로 맞춤.
 * 우선순위: 명함 프로필 사진 → primary → feed → chat
 */
export function unifyProfilePhotoSlots() {
  try {
    const migrateKey = "vlue_avatar_unify_photo_v1";
    const letteringPhoto = readLetteringPhotoUrl();
    const primary = readRawSlot("primary");
    const feed = readRawSlot("feed");
    const chat = readRawSlot("chat");
    const canonical = letteringPhoto || primary || feed || chat;
    if (!canonical) {
      if (!localStorage.getItem(migrateKey)) localStorage.setItem(migrateKey, "1");
      return "";
    }
    const needsMirror =
      primary !== canonical || feed !== canonical || chat !== canonical || !localStorage.getItem(migrateKey);
    if (needsMirror) {
      PHOTO_SLOTS.forEach((slot) => writeRawSlot(slot, canonical));
      localStorage.setItem(migrateKey, "1");
      try {
        window.dispatchEvent(new Event("vlue-avatar-changed"));
      } catch {
        /* ignore */
      }
    }
    return canonical;
  } catch {
    return "";
  }
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
    unifyProfilePhotoSlots();
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

/** 사람 프로필 사진만 (회사 로고와 혼용하지 않음) — 헤더·마이페이지·카카오 미리보기 */
export function readProfilePhotoAvatar() {
  scrubBrandAvatarsFromStorage();
  return readAvatar("primary") || readAvatar("feed") || readAvatar("chat") || "";
}

/**
 * 사람 프로필 사진 — primary/feed/chat 동시 반영 (헤더·마이케이스·채팅 동기화)
 * 회사 로고(card)는 절대 건드리지 않음.
 */
export function writeProfilePhoto(dataUrlOrUrl, opts = {}) {
  const v = sanitizeAvatarUrl(dataUrlOrUrl);
  PHOTO_SLOTS.forEach((slot) => writeRawSlot(slot, v));
  try {
    window.dispatchEvent(new Event("vlue-avatar-changed"));
  } catch {
    /* ignore */
  }
  if (!opts.skipServerSync) {
    queueMicrotask(() => {
      import("./avatarServerSync.js")
        .then((m) => m.syncAvatarSlotToServer("primary", v))
        .catch(() => {});
    });
  }
}

export function writeAvatar(slot, dataUrlOrUrl, opts = {}) {
  try {
    /* 프로필 사진 슬롯은 항상 세 곳 동기화 — 헤더(chat)·피드·대표 불일치 방지 */
    if ((slot === "primary" || slot === "feed" || slot === "chat") && !opts.skipMirror) {
      writeProfilePhoto(dataUrlOrUrl, opts);
      return;
    }
    const k = KEYS[slot] || KEYS.primary;
    const v = sanitizeAvatarUrl(dataUrlOrUrl);
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
    window.dispatchEvent(new Event("vlue-avatar-changed"));
    if (!opts.skipServerSync) {
      queueMicrotask(() => {
        import("./avatarServerSync.js")
          .then((m) => m.syncAvatarSlotToServer(slot, v))
          .catch(() => {});
      });
    }
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

/**
 * 아바타용 — 클라이언트 압축 후 R2 Presigned 직행 업로드 (실패 시 data URL 폴백)
 * @param {File} file
 * @param {'avatar'|'logo'|'photo'} [kind='avatar']
 */
export async function fileToFittedAvatarDataUrl(file, kind = "avatar") {
  const uploaded = await compressAndUploadMediaImageOrThrow(file, kind === "logo" ? "logo" : "avatar");
  return uploaded.url;
}
