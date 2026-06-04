#!/usr/bin/env node
/**
 * 최종 프로덕션 빌드·ENV 매니페스트 검증·배포 락.
 * Usage: npm run production:ready [-- --lock]
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const PRODUCTION_READY_LOG =
  "VLUE AI & CORE SERVICE ENGINE - PRODUCTION READY SUCCESS";

const API_ENV_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "GEMINI_API_KEY",
  "PORTONE_API_SECRET",
  "JWT_ACCESS_SECRET",
  "JWT_SECRET",
  "SESSION_SECRET",
  "FILE_STORAGE_PROVIDER"
];

const FRONTEND_ENV_KEYS = ["VITE_API_URL"];

function parseEnvKeys(filePath) {
  if (!existsSync(filePath)) return new Set();
  const text = readFileSync(filePath, "utf8");
  const keys = new Set();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) keys.add(t.slice(0, eq).trim());
  }
  return keys;
}

function assertManifest(filePath, requiredKeys, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} 없음: ${filePath}`);
  }
  const found = parseEnvKeys(filePath);
  const missing = requiredKeys.filter((k) => !found.has(k));
  if (missing.length) {
    throw new Error(`${label} 매니페스트 누락 키: ${missing.join(", ")}`);
  }
  console.log(`[production-ready] ${label} OK (${filePath})`);
}

function run(cmd, cwd = root) {
  console.log(`[production-ready] $ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

const lock = process.argv.includes("--lock");

try {
  assertManifest(
    resolve(root, "apps/api/.env.production"),
    API_ENV_KEYS,
    "API Production ENV"
  );
  const webEnv = resolve(root, "web/.env.production");
  const legacyWebEnv = resolve(root, ".env.production");
  assertManifest(
    existsSync(webEnv) ? webEnv : legacyWebEnv,
    FRONTEND_ENV_KEYS,
    "Frontend Production ENV"
  );

  run("npm run shared:typecheck");
  run("npm run api:build");
  run("npm run web:build");

  const lockPayload = {
    status: "PRODUCTION_READY",
    locked: lock,
    message: PRODUCTION_READY_LOG,
    verifiedAt: new Date().toISOString(),
    artifacts: {
      api: "apps/api/dist",
      web: "web/dist"
    },
    envManifest: {
      api: API_ENV_KEYS,
      frontend: FRONTEND_ENV_KEYS
    }
  };

  const lockPath = resolve(root, "deployment.lock.json");
  writeFileSync(lockPath, `${JSON.stringify(lockPayload, null, 2)}\n`, "utf8");
  console.log(`[production-ready] deployment.lock.json written (locked=${lock})`);

  console.log("");
  console.log("=".repeat(72));
  console.log(PRODUCTION_READY_LOG);
  console.log("=".repeat(72));
  console.log("");
} catch (e) {
  console.error("[production-ready] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
}
