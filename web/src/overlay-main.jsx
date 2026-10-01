/**
 * 통화 오버레이 전용 엔트리 (Android 앱 assets 에 번들 — 외부 서버 장애와 무관하게 즉시 렌더).
 *
 * - 네이티브 CallOverlayService 의 WebView 가 `https://<web>/vlue-overlay/index.html#lettering-overlay?...`
 *   를 로드하면 shouldInterceptRequest 가 이 번들을 앱 assets 에서 바로 내려준다.
 * - 카드 데이터는 네이티브가 주입(window.__VLUE_CARD_LOOKUP__ / 이벤트)하고,
 *   서버와는 백그라운드 JSON 요청만 한다 (실패해도 UI 는 이미 그려진 상태).
 * - 메인 앱(main.jsx) 전체(관리자/마케팅/결제 등)를 끌어오지 않는다.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import LetteringOverlayHost from "./components/LetteringOverlayHost.jsx";
import { ShowcaseBgmProvider } from "./context/ShowcaseBgmContext.jsx";
/* Tailwind base/utilities — 메인 앱은 마케팅 셸(site/bolt)이 이 CSS 를 끌어온다.
 * 빠지면 .flex-col/.min-h-0/.px-3 등 유틸이 사라져 BigPush 바가 커진다. styles.css 보다 먼저. */
import "./site/bolt/index.css";
import "./styles.css";
import "./styles/vlue-wide-shell.css";
import { applyAppSettingsToDocument } from "./lib/vlueAppSettings.js";
import { ensurePricingConfigLoaded } from "./lib/pricingConfig.js";
import { VLUE_ANDROID_APP_UA_TOKEN } from "./lib/vlueClientAccess.js";

try {
  if (typeof navigator !== "undefined" && String(navigator.userAgent || "").includes(VLUE_ANDROID_APP_UA_TOKEN)) {
    document.documentElement.classList.add("vlue-android-app");
  }
  if (typeof window !== "undefined") window.VLUE_APP_MAIN = true;
} catch {
  /* ignore */
}

try {
  applyAppSettingsToDocument();
} catch {
  /* ignore */
}
/* 가격/설정 등 부가 데이터 — 실패해도 오버레이 렌더와 무관 (백그라운드) */
try {
  ensurePricingConfigLoaded().catch(() => undefined);
} catch {
  /* ignore */
}

/** 오버레이는 전체화면 오류 페이지(불투명)를 띄우면 통화 화면을 가린다 — 실패 시 투명 유지 */
class OverlayErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[VLUÉ overlay]", error, info);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <OverlayErrorBoundary>
        <ShowcaseBgmProvider>
          <LetteringOverlayHost />
        </ShowcaseBgmProvider>
      </OverlayErrorBoundary>
    </React.StrictMode>
  );
}
