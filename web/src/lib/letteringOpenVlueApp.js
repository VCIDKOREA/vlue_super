/**
 * Lettering 「인증정보」 → VLUE 앱 인증 상세 화면
 * Android/iOS WebView 브리지 우선, 없으면 vlue:// + 유니버설 링크
 */

function buildCertQuery(payload = {}) {
  const feedId = String(payload.feedId || payload.card?.feedId || payload.card?.userId || "").trim();
  const feedType = payload.feedType === "company" ? "company" : "personal";
  const params = new URLSearchParams();
  if (feedId) params.set("userId", feedId);
  params.set("feedType", feedType);
  params.set("source", "lettering");
  if (payload.phoneMatched) params.set("phoneMatched", "1");
  const incoming = String(payload.incomingNumber || "").trim();
  if (incoming) params.set("incoming", incoming);
  const phone = String(payload.card?.phone || "").trim();
  if (phone) params.set("registeredPhone", phone);
  return { feedId, feedType, params };
}

export function buildLetteringCertDeepLink(payload = {}) {
  const { params } = buildCertQuery(payload);
  return `vlue://lettering/cert?${params.toString()}`;
}

export function buildLetteringCertUniversalLink(payload = {}) {
  const { params } = buildCertQuery(payload);
  return `https://www.vlue.kr/app/lettering/cert?${params.toString()}`;
}

function tryNativeOpen(payload) {
  if (typeof window === "undefined") return null;

  const message = {
    action: "openCertInfo",
    feedId: String(payload.feedId || payload.card?.feedId || "").trim(),
    feedType: payload.feedType === "company" ? "company" : "personal",
    phoneMatched: Boolean(payload.phoneMatched),
    incomingNumber: String(payload.incomingNumber || "").trim(),
    card: payload.card || null,
    verificationItems: Array.isArray(payload.verificationItems) ? payload.verificationItems : []
  };

  const bridge = window.VlueLettering;
  if (bridge?.openCertInfo) {
    try {
      bridge.openCertInfo(message);
      return { ok: true, channel: "VlueLettering.openCertInfo" };
    } catch {
      /* fall through */
    }
  }
  if (bridge?.openFeed) {
    try {
      bridge.openFeed(message);
      return { ok: true, channel: "VlueLettering.openFeed" };
    } catch {
      /* fall through */
    }
  }
  if (window.Android?.openVlueCertInfo) {
    try {
      window.Android.openVlueCertInfo(JSON.stringify(message));
      return { ok: true, channel: "Android.openVlueCertInfo" };
    } catch {
      /* fall through */
    }
  }
  if (window.webkit?.messageHandlers?.vlueLetteringOpenCert) {
    try {
      window.webkit.messageHandlers.vlueLetteringOpenCert.postMessage(message);
      return { ok: true, channel: "webkit.vlueLetteringOpenCert" };
    } catch {
      /* fall through */
    }
  }

  return null;
}

function tryDeepLinkNavigate(deepLink, universalLink) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  try {
    if (isIOS || isAndroid) {
      window.location.assign(deepLink);
      window.setTimeout(() => {
        try {
          window.location.assign(universalLink);
        } catch {
          /* ignore */
        }
      }, isIOS ? 450 : 550);
      return { ok: true, channel: "deeplink", url: deepLink, fallbackUrl: universalLink };
    }

    const opened = window.open(universalLink, "_blank", "noopener,noreferrer");
    if (opened) {
      return { ok: true, channel: "universal-link", url: universalLink };
    }
    window.location.assign(universalLink);
    return { ok: true, channel: "universal-link", url: universalLink };
  } catch {
    return { ok: false, channel: "deeplink-failed" };
  }
}

/** 인증정보 탭 → 앱 내 모달 우선, 네이티브·딥링크 폴백 */
export function openLetteringCertInVlueApp(payload = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vlue-lettering-open-cert", { detail: payload }));
    if (window.VLUE_APP_MAIN || document.getElementById("app-body")) {
      return { ok: true, channel: "in-app-modal" };
    }
  }

  const native = tryNativeOpen(payload);
  if (native?.ok) return native;

  const deepLink = buildLetteringCertDeepLink(payload);
  const universalLink = buildLetteringCertUniversalLink(payload);
  return tryDeepLinkNavigate(deepLink, universalLink);
}
