import "./loadEnv.js";
import { assertProductionEnvLocked, PRODUCTION_READY_LOG } from "./config/productionEnv.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { apiRoutes } from "./routes/api.js";
import { runElderProtectionChecks } from "./services/familyProtection/familyProtectionEngine.js";
import { attachOfficeAgentWebSocket } from "./services/office/remoteControlHub.js";
import { seedDemoCompanyLine } from "./services/office/companyLinesService.js";
import type { Server } from "node:http";
import { loadPricingConfig } from "./services/pricing/pricingConfigService.js";

assertProductionEnvLocked();
await loadPricingConfig();

const app = new Hono();

const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176"
];

const PLATFORM_ORIGINS = [
  "https://vlueweb-production.up.railway.app",
  "https://www.vlue.kr",
  "https://vlue.kr"
];

const envOrigins =
  process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const origins = [...new Set([...envOrigins, ...LOCAL_DEV_ORIGINS, ...PLATFORM_ORIGINS])];

app.use(
  "*",
  cors({
    origin: origins,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-VLUE-User-Id", "X-Admin-Device-Id", "Last-Event-ID"]
  })
);

app.get("/", (c) =>
  c.text(
    "VLUE API — 엔드포인트는 /api 아래입니다.\n예: GET /api/health\n",
    200,
    { "Content-Type": "text/plain; charset=utf-8" }
  )
);

app.route("/api", apiRoutes);

const port = Number(process.env.PORT) || 8788;

const demoLine = process.env.VLUE_DEMO_COMPANY_LINE || "07012345678";
seedDemoCompanyLine(demoLine, "VLUE Demo Partner").catch(() => undefined);

const server = serve({ fetch: app.fetch, port }, (info) => {
  if (process.env.NODE_ENV === "production") {
    console.log(PRODUCTION_READY_LOG);
  }
  console.log(`VLUE API (Hono) listening on http://localhost:${info.port}`);
  console.log(`PC Agent WebSocket: ws://localhost:${info.port}/api/office/ws/agent`);

  const vmingConsentCronMs = Number(process.env.VMING_CONSENT_CRON_MS) || 24 * 60 * 60 * 1000;
  setInterval(() => {
    import("./services/vming/consent/vmingConsentService.js")
      .then(({ runVmingConsentExpiryJob }) => runVmingConsentExpiryJob())
      .then((r) => {
        if (r.expiredRooms > 0 || r.reminded > 0) {
          console.log("[vming-consent-cron]", r);
        }
      })
      .catch((e) => console.warn("[vming-consent-cron] failed", e));
  }, vmingConsentCronMs);

  const elderCheckMs = Number(process.env.FAMILY_ELDER_CHECK_MS) || 15 * 60 * 1000;
  setInterval(() => {
    runElderProtectionChecks()
      .then((r) => {
        if (r.alertsSent > 0) {
          console.log(`[family-protection] elder alerts sent: ${r.alertsSent}`);
        }
      })
      .catch((e) => console.warn("[family-protection] elder check failed", e));
  }, elderCheckMs);
});

attachOfficeAgentWebSocket(server as Server);
