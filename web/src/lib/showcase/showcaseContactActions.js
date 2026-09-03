/** 쇼케이스 명함 — 전화·메일·웹 링크 액션 */

import { toKoreaNationalDigits } from "../letteringPhoneMatch.js";

export function digitsForTel(raw) {
  return String(raw || "").replace(/[^\d+]/g, "");
}

/** 일반전화용 E.164 (+8210…) — 82… / 010… 혼용 통일 */
export function toTelE164(raw) {
  const national = toKoreaNationalDigits(raw);
  if (national && /^1[3-9]\d{6}$/.test(national)) {
    return `+82${national}`;
  }
  if (national && national.startsWith("0") && national.length >= 9) {
    return `+82${national.slice(1)}`;
  }
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return digits.startsWith("+") ? String(raw).replace(/[^\d+]/g, "") : `+${digits}`;
}

export function formatTelHref(raw) {
  const e164 = toTelE164(raw);
  return e164 ? `tel:${e164}` : "";
}

/** 112·119 등 국가기관 단축번호는 E.164로 바꾸지 않는다 */
export function formatAgencyTelHref(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return `tel:${digits}`;
  return formatTelHref(raw);
}

export function formatMailtoHref(raw) {
  const e = String(raw || "").trim();
  return e ? `mailto:${e}` : "";
}

export function formatWebHref(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("tel:")) return u;
  return `https://${u.replace(/^\/\//, "")}`;
}

/** Android WebView / VlueLettering / Electron — 외부 브라우저·앱으로 열기 */
function openViaNativeBridge(url) {
  const u = String(url || "").trim();
  if (!u || typeof window === "undefined") return false;
  try {
    if (typeof window.Android?.openExternalUrl === "function") {
      window.Android.openExternalUrl(u);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof window.VlueLettering?.openUrl === "function") {
      window.VlueLettering.openUrl(u);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof window.vlueElectron?.openExternalUrl === "function") {
      void window.vlueElectron.openExternalUrl(u);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * 인스타/유튜브 https → 네이티브 앱 Intent (Android 브릿지용).
 * WebView 안 window.open 대신 ACTION_VIEW로 앱 전환.
 */
export function preferNativeAppHref(href) {
  const h = String(href || "").trim();
  if (!h || !/^https?:\/\//i.test(h)) return h;
  try {
    const u = new URL(h);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "") || "";
    const pathSeg = path.replace(/^\//, "");

    if (host === "instagram.com" || host === "instagr.am") {
      // 프로필·게시물 모두 Instagram 앱 Intent (없으면 https 폴백)
      let intentPath = `${u.host}${u.pathname}${u.search}`;
      if (pathSeg && !pathSeg.includes("/")) {
        const user = decodeURIComponent(pathSeg.replace(/^@/, ""));
        if (user && !/^(p|reel|reels|stories|explore|tv)$/i.test(user)) {
          intentPath = `www.instagram.com/_u/${encodeURIComponent(user)}/`;
        }
      }
      return (
        `intent://${intentPath}#Intent;scheme=https;` +
        `package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(h)};end`
      );
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "music.youtube.com"
    ) {
      return (
        `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;` +
        `package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(h)};end`
      );
    }
  } catch {
    /* keep original */
  }
  return h;
}

export function openExternalHref(href) {
  const h = String(href || "").trim();
  if (!h) return false;
  try {
    if (h.startsWith("tel:") || h.startsWith("mailto:")) {
      if (openViaNativeBridge(h)) return true;
      window.location.href = h;
      return true;
    }
    const target = preferNativeAppHref(h);
    if (openViaNativeBridge(target)) return true;
    // 브릿지 없는 브라우저: 일반 탭 (앱 WebView의 window.open 팝업 회피)
    if (typeof window.Android !== "undefined" || typeof window.VlueLettering !== "undefined") {
      window.location.href = /^https?:\/\//i.test(h) ? h : target;
      return true;
    }
    window.open(h, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    try {
      window.location.href = h;
      return true;
    } catch {
      return false;
    }
  }
}

export function openPhoneDial(raw) {
  const href = formatTelHref(raw);
  return href ? openExternalHref(href) : false;
}

export function openEmailLink(raw) {
  const href = formatMailtoHref(raw);
  return href ? openExternalHref(href) : false;
}

export function openWebsiteLink(raw) {
  const href = formatWebHref(raw);
  return href ? openExternalHref(href) : false;
}

/** 주소 문자열 → 카카오지도 검색 */
export function formatKakaoMapSearchHref(addressRaw) {
  const q = String(addressRaw || "").trim();
  if (!q) return "";
  return `https://map.kakao.com/link/search/${encodeURIComponent(q)}`;
}

export function openKakaoMapSearch(addressRaw) {
  const href = formatKakaoMapSearchHref(addressRaw);
  return href ? openExternalHref(href) : false;
}

/** 스냅샷에 링크용 연락처 필드 보존 */
export function pickShowcaseContactFields(card = {}) {
  return {
    phone: String(card.phone || "").trim(),
    email: String(card.email || "").trim(),
    website: String(card.website || "").trim(),
    fax: String(card.fax || "").trim(),
    address: String(card.address || "").trim(),
    companyIntro: String(card.companyIntro || card.salesContent || card.introBack || "").trim(),
    verificationItems: Array.isArray(card.verificationItems) ? card.verificationItems.slice(0, 8) : []
  };
}
