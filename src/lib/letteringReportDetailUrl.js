import { normalizePhoneDigits } from "./letteringPhoneMatch.js";

/** 오버레이 빅푸시에 표시할 신고·제보 미리보기 건수 */
export const LETTERING_REPORT_OVERLAY_PREVIEW = 3;

/** 웹 상세 페이지 해시 URL */
export function buildLetteringReportDetailUrl(phone) {
  const digits = normalizePhoneDigits(phone);
  const q = encodeURIComponent(digits || String(phone || "").trim());
  if (typeof window === "undefined") {
    return `#lettering-reports?phone=${q}`;
  }
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#lettering-reports?phone=${q}`;
}

/** 상세 내역 웹 페이지 열기 (오버레이·앱 공용) */
export function openLetteringReportDetailPage(phone) {
  const url = buildLetteringReportDetailUrl(phone);
  if (typeof window === "undefined") return { ok: false, url };

  try {
    if (typeof window.VlueLettering?.openUrl === "function") {
      window.VlueLettering.openUrl(url);
      return { ok: true, url, channel: "VlueLettering.openUrl" };
    }
  } catch {
    /* ignore */
  }

  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) return { ok: true, url, channel: "window.open" };
  } catch {
    /* ignore */
  }

  window.location.href = url;
  return { ok: true, url, channel: "location" };
}

export function parseLetteringReportDetailParams() {
  if (typeof window === "undefined") return { phone: "" };
  const hash = window.location.hash || "";
  if (!hash.startsWith("#lettering-reports")) return { phone: "" };
  const qIndex = hash.indexOf("?");
  const query = qIndex >= 0 ? hash.slice(qIndex + 1) : "";
  const phone = new URLSearchParams(query).get("phone") || "";
  return { phone };
}

export function isLetteringReportDetailRoute() {
  if (typeof window === "undefined") return false;
  return (window.location.hash || "").startsWith("#lettering-reports");
}
