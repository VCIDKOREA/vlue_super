import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminSecretApp from "./components/AdminSecretApp.jsx";
import AdminConsoleApp from "./components/admin-console/AdminConsoleApp.jsx";
import SuperAdminHqApp from "./components/hq/SuperAdminHqApp.jsx";
import VlueMarketingApp from "./site/VlueMarketingApp.jsx";
import ShowcaseWebApp from "./site/web/ShowcaseWebApp.jsx";
import { isShowcaseWebRoute } from "./lib/showcaseWebRoute.js";
import AppRootErrorBoundary from "./components/AppRootErrorBoundary.jsx";
import { isCurrentUrlAdminEntry } from "./lib/adminEntryPath.js";
import { isSuperAdminHqEntry } from "./lib/hqRoute.js";
import { isAdminConsoleEntry } from "./lib/adminRoute.js";
import { resolveSiteShell } from "./lib/siteMode.js";
import BrowserAppBlockedPage from "./components/BrowserAppBlockedPage.jsx";
import WwwStagingLockGate from "./components/WwwStagingLockGate.jsx";
import "./styles.css";
import { applyAppSettingsToDocument } from "./lib/vlueAppSettings.js";
import { logProductionEnvBinding } from "./config.js";
import { ensurePricingConfigLoaded } from "./lib/pricingConfig.js";

/** www.vlue.kr/showcase · /biz → /#showcase · /#biz (해시 라우팅) */
function normalizeWwwShowcaseManagePath() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/showcase" && path !== "/biz") return;
  const view = path.slice(1);
  const search = window.location.search || "";
  window.history.replaceState(null, "", `/${search}#${view}`);
}

/** /refund · /refund/ · /terms · /privacy → /#refund 등 */
const WWW_LEGAL_PATH_VIEWS = {
  "/terms": "terms",
  "/privacy": "privacy",
  "/refund": "refund"
};

function normalizeWwwLegalPathname() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const view = WWW_LEGAL_PATH_VIEWS[path];
  if (!view) return;
  const search = window.location.search || "";
  window.history.replaceState(null, "", `/${search}#${view}`);
}

normalizeWwwShowcaseManagePath();
normalizeWwwLegalPathname();

applyAppSettingsToDocument();
logProductionEnvBinding();
ensurePricingConfigLoaded().catch(() => undefined);

function isPortoneV2PaymentCallbackPath(pathname = "") {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p === "/app/payment/v2/callback" || p === "/payment/v2/callback";
}

const PortoneV2PaymentCallback = lazy(() => import("./components/PortoneV2PaymentCallback.jsx"));

const adminPath = import.meta.env.VITE_ADMIN_PATH;
const showAdminConsole = isAdminConsoleEntry();
const showHq = !showAdminConsole && isSuperAdminHqEntry();
const showAdminGate = !showAdminConsole && !showHq && adminPath && isCurrentUrlAdminEntry(adminPath);
const siteShell = resolveSiteShell();
const showPortoneV2Callback =
  typeof window !== "undefined" && isPortoneV2PaymentCallbackPath(window.location.pathname);
const showcasePublic =
  typeof window !== "undefined" && isShowcaseWebRoute(window.location.pathname);

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">앱 루트(#root)를 찾을 수 없습니다.</p>';
} else {
  let Shell = App;
  if (showPortoneV2Callback) Shell = PortoneV2PaymentCallback;
  else if (showAdminConsole) Shell = AdminConsoleApp;
  else if (showHq) Shell = SuperAdminHqApp;
  else if (showAdminGate) Shell = AdminSecretApp;
  else if (showcasePublic) Shell = ShowcaseWebApp;
  else if (siteShell === "blocked") Shell = BrowserAppBlockedPage;
  else if (siteShell === "marketing") Shell = VlueMarketingApp;

  const appBlocked = siteShell === "blocked";
  /* 공개 쇼케이스는 Coming Soon 잠금 없이 바로 연다 (카톡 인앱 브라우저) */
  const shellTree = appBlocked || showcasePublic ? (
    <Shell />
  ) : (
    <WwwStagingLockGate>
      <Shell />
    </WwwStagingLockGate>
  );

  createRoot(rootEl).render(
    <React.StrictMode>
      <AppRootErrorBoundary>
        {showPortoneV2Callback ? (
          <Suspense fallback={<div style={{ padding: 24, textAlign: "center" }}>결제 확인 중…</div>}>
            {shellTree}
          </Suspense>
        ) : (
          shellTree
        )}
      </AppRootErrorBoundary>
    </React.StrictMode>
  );
}
