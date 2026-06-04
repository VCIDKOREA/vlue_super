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
 * VITE_CARD_PUBLIC_API_BASE 또는 VITE_VLUE_LANDING_URL(기본 www.vlue.kr)
 */
export function resolvePublicCardApiBase(fallbackOrigin = "") {
  const explicit = String(
    import.meta.env.VITE_CARD_PUBLIC_API_BASE ||
      import.meta.env.VITE_PUBLIC_API_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");
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

/** 카카오·문자 등 외부 공유용 — 항상 공개 HTTPS 링크 */
export function buildPublicCardViewUrl(cardId, devApiBase = "") {
  const base = resolvePublicCardApiBase(devApiBase);
  return buildHostedCardViewUrl(base, cardId);
}

export function buildCardThumbOgUrl(apiBase, cardId) {
  const base = String(apiBase || "").replace(/\/$/, "");
  return `${base}/api/v1/card/thumb/${encodeURIComponent(cardId)}.png`;
}
