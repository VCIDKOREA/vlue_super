import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminSecretApp from "./components/AdminSecretApp.jsx";
import SuperAdminHqApp from "./components/hq/SuperAdminHqApp.jsx";
import AppRootErrorBoundary from "./components/AppRootErrorBoundary.jsx";
import { isCurrentUrlAdminEntry } from "./lib/adminEntryPath.js";
import { isSuperAdminHqEntry } from "./lib/hqRoute.js";
import "./styles.css";
import { applyAppSettingsToDocument } from "./lib/vlueAppSettings.js";
import { logProductionEnvBinding } from "./config.js";

applyAppSettingsToDocument();
logProductionEnvBinding();

const adminPath = import.meta.env.VITE_ADMIN_PATH;
const showHq = isSuperAdminHqEntry();
const showAdminGate = !showHq && adminPath && isCurrentUrlAdminEntry(adminPath);

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">앱 루트(#root)를 찾을 수 없습니다.</p>';
} else {
  let Shell = App;
  if (showHq) Shell = SuperAdminHqApp;
  else if (showAdminGate) Shell = AdminSecretApp;

  createRoot(rootEl).render(
    <React.StrictMode>
      <AppRootErrorBoundary>
        <Shell />
      </AppRootErrorBoundary>
    </React.StrictMode>
  );
}
