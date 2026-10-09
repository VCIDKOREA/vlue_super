import { isVlueBrandAssetUrl } from "./vlueAvatar.js";

/**
 * 프로필·회사 로고가 화면에 올라가기 전에 거치는 주소.
 * R2 키(`/bizcard/…`)는 공개 https 로 붙이고,
 * 번들에 박힌 VLUÉ 마크 경로는 사용자 사진으로 쓰지 않는다.
 */
const R2_PUBLIC_BASE = String(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_R2_PUBLIC_BASE_URL) ||
    "https://pub-72e517bccb944c179098686c5c22a73a.r2.dev"
).replace(/\/$/, "");

const OBJECT_KEY_RE = /^(bizcard|showcase|avatars|covers|images|chat|store|marketing|docs)\//i;

export function resolveRenderableMediaUrl(raw) {
  const s = String(raw || "").trim();
  if (!s || s.startsWith("blob:")) return "";
  if (isVlueBrandAssetUrl(s)) return "";
  if (s.startsWith("data:image/")) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const host = new URL(s).hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return "";
    } catch {
      return "";
    }
    return s;
  }
  const key = s.replace(/^\/+/, "");
  if (OBJECT_KEY_RE.test(key)) return `${R2_PUBLIC_BASE}/${key}`;
  return "";
}
