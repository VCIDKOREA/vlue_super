import { showcaseWebPathForPhone } from "./showcaseWebRoute.js";

export function getVlueViralLinks() {
  const landing =
    String(import.meta.env.VITE_VLUE_LANDING_URL || "").trim() || "https://www.vlue.kr";
  const createUrl =
    String(import.meta.env.VITE_VLUE_CREATE_CARD_URL || "").trim() || `${landing}/membership`;
  const iosStore = String(import.meta.env.VITE_VLUE_IOS_STORE_URL || "").trim() || landing;
  const androidStore = String(import.meta.env.VITE_VLUE_ANDROID_STORE_URL || "").trim() || landing;
  return { landing, createUrl, iosStore, androidStore };
}

/** localhost·127.0.0.1 — 카카오 OG 스크래퍼가 접근 불가 */
export function isLocalDevHost(hostname = "") {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export function isLocalDevOrigin(origin = "") {
  try {
    const o =
      origin ||
      (typeof window !== "undefined" ? window.location?.origin || "" : "");
    if (!o) return false;
    return isLocalDevHost(new URL(o).hostname);
  } catch {
    return false;
  }
}

/**
 * 외부 공유·OG용 API 베이스 — 로컬 개발 시 localhost 대신 공개 URL 사용.
 * www.vlue.kr 는 SPA 라 /api HTML 이 index.html 로 떨어져 카톡 OG 가 깨지므로
 * api.vlue.kr(VITE_API_URL) 를 우선한다.
 */
export function resolvePublicCardApiBase(fallbackOrigin = "") {
  const apiUrl = String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  const explicit = String(
    import.meta.env.VITE_CARD_PUBLIC_API_BASE ||
      import.meta.env.VITE_PUBLIC_API_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");

  const pickApiHost = () => {
    if (apiUrl.startsWith("http") && !isLocalDevOrigin(apiUrl)) return apiUrl;
    return "https://api.vlue.kr";
  };

  if (explicit.startsWith("http")) {
    try {
      const host = new URL(explicit).hostname.toLowerCase();
      /* www·루트 도메인은 Cloudflare SPA — OG 스크래퍼에 API 호스트 필요 */
      if (host === "www.vlue.kr" || host === "vlue.kr") return pickApiHost();
    } catch {
      /* ignore */
    }
    if (!isLocalDevOrigin(explicit)) return explicit;
  }

  if (apiUrl.startsWith("http") && !isLocalDevOrigin(apiUrl)) return apiUrl;

  const { landing } = getVlueViralLinks();
  const landingBase = landing.replace(/\/$/, "");

  if (typeof window !== "undefined" && isLocalDevOrigin(window.location?.origin)) {
    return pickApiHost();
  }
  const fb = String(fallbackOrigin || "").trim().replace(/\/$/, "");
  if (fb.startsWith("http") && !isLocalDevOrigin(fb)) {
    try {
      const host = new URL(fb).hostname.toLowerCase();
      if (host === "www.vlue.kr" || host === "vlue.kr") return pickApiHost();
    } catch {
      /* ignore */
    }
    return fb;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    if (!isLocalDevOrigin(origin)) {
      try {
        const host = new URL(origin).hostname.toLowerCase();
        if (host === "www.vlue.kr" || host === "vlue.kr") return pickApiHost();
      } catch {
        /* ignore */
      }
      return origin;
    }
  }
  return pickApiHost() || landingBase;
}

/** 외부 공유용 웹 앱 오리진 (쇼케이스 `/site/web/showcase/…`) */
export function resolvePublicWebOrigin(fallbackOrigin = "") {
  const explicit = String(import.meta.env.VITE_SHOWCASE_WEB_BASE || "").trim().replace(/\/$/, "");
  if (explicit.startsWith("http")) return explicit;

  const { landing } = getVlueViralLinks();
  const landingBase = landing.replace(/\/$/, "");

  if (typeof window !== "undefined" && isLocalDevOrigin(window.location?.origin)) {
    return landingBase;
  }
  const fb = String(fallbackOrigin || "").trim().replace(/\/$/, "");
  if (fb.startsWith("http") && !isLocalDevOrigin(fb)) return fb;
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    if (!isLocalDevOrigin(origin)) return origin;
  }
  return landingBase;
}

export function buildHostedCardViewUrl(apiBase, cardId) {
  const base = String(apiBase || "").replace(/\/$/, "");
  if (!cardId) return "";
  return `${base}/api/v1/card/view/${encodeURIComponent(cardId)}`;
}

/** 카카오·문자 등 외부 공유용 — OG 메타가 있는 서버 랜딩 → SPA 쇼케이스 */
export function buildPublicShowcaseUrl(phone, devOrigin = "") {
  const apiBase = resolvePublicCardApiBase(devOrigin);
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
  if (!local) return "";
  return `${apiBase}/api/v1/showcase/view/${encodeURIComponent(local)}`;
}

/** SPA 쇼케이스 직접 경로 (알림톡 버튼·앱 웹뷰용 — OG 불필요) */
export function buildPublicShowcaseSpaUrl(phone, devOrigin = "") {
  const origin = resolvePublicWebOrigin(devOrigin);
  const path = showcaseWebPathForPhone(phone);
  if (!path || path === "/site/web/showcase/") return "";
  return `${origin}${path}`;
}

/** 카카오·문자 등 외부 공유용 — 레거시 명함 HTML 뷰 */
export function buildPublicCardViewUrl(cardId, devApiBase = "") {
  const base = resolvePublicCardApiBase(devApiBase);
  return buildHostedCardViewUrl(base, cardId);
}

export function buildCardThumbOgUrl(apiBase, cardId) {
  const base = String(apiBase || "").replace(/\/$/, "");
  return `${base}/api/v1/card/thumb/${encodeURIComponent(cardId)}.png`;
}
