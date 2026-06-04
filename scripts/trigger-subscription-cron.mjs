/**
 * 유료 구독 정기결제 배치 수동 실행
 *
 * 사용:
 *   node scripts/trigger-subscription-cron.mjs
 *   node scripts/trigger-subscription-cron.mjs --asOf=2026-05-21
 *   node scripts/trigger-subscription-cron.mjs --dry-run
 *   node scripts/trigger-subscription-cron.mjs --overdue
 *
 * 환경:
 *   VLUE_CRON_DEV_BYPASS_BILLING=1  — 포트원 없이 dev 결제 기록
 *   VLUE_SUBSCRIPTION_CRON_OVERDUE=1 — 밀린 결제일 포함
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, "apps/api/.env"));
loadEnvFile(resolve(root, "packages/db/.env"));

const cliPath = resolve(root, "apps/api/src/cron/subscriptionCronCli.ts");
const forwardArgs = process.argv.slice(2);

console.log("\n=== VLUE 구독 정기결제 배치 ===\n");

const r = spawnSync("npx", ["tsx", cliPath, ...forwardArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32"
});

process.exit(r.status ?? 1);
