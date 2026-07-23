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
  else if (typeof window !== "undefined" && isShowcaseWebRoute(window.location.pathname)) Shell = ShowcaseWebApp;
  else if (siteShell === "blocked") Shell = BrowserAppBlockedPage;
  else if (siteShell === "marketing") Shell = VlueMarketingApp;

  const appBlocked = siteShell === "blocked";
  const shellTree = appBlocked ? (
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
