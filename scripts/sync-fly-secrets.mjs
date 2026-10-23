#!/usr/bin/env node
/**
 * 로컬 apps/api/.env 및 프로덕션 변수 → Fly.io secrets 등록
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, "apps/api/.env");

if (!existsSync(envFile)) {
  console.error("apps/api/.env 파일을 찾을 수 없습니다:", envFile);
  process.exit(1);
}

const lines = readFileSync(envFile, "utf8").split(/\r?\n/);
const secretsMap = new Map();

for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx < 0) continue;
  const key = t.slice(0, idx).trim();
  let val = t.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  // Exclude local-only paths
  if (key === "GOOGLE_APPLICATION_CREDENTIALS" && /^[a-zA-Z]:\\/.test(val)) {
    continue;
  }
  secretsMap.set(key, val);
}

// Production overrides / additions
secretsMap.set("NODE_ENV", "production");
secretsMap.set("PORT", "8788");
secretsMap.set("APP_BASE_URL", "https://api.vlue.kr");
secretsMap.set("FRONTEND_URL", "https://www.vlue.kr");
secretsMap.set(
  "CORS_ORIGIN",
  "https://www.vlue.kr,https://vlue.kr,https://m.vlue.kr,https://api.vlue.kr,https://vlueweb-production.up.railway.app,https://vlue-api.fly.dev"
);

if (!secretsMap.has("FILE_STORAGE_PROVIDER")) {
  secretsMap.set("FILE_STORAGE_PROVIDER", "mock");
}

if (!secretsMap.has("JWT_ACCESS_SECRET")) {
  const fallbackJwt = "vlue_prod_jwt_access_secret_2026_seoul_sel_superapp_auth_key_v1";
  secretsMap.set("JWT_ACCESS_SECRET", fallbackJwt);
  secretsMap.set("JWT_SECRET", fallbackJwt);
  secretsMap.set("SESSION_SECRET", fallbackJwt);
}

const entries = Array.from(secretsMap.entries());
console.log(`등록할 시크릿 목록 (${entries.length}개):`);
for (const [k] of entries) {
  console.log(`  - ${k}`);
}

const inputBuffer = entries.map(([k, v]) => `${k}=${v}`).join("\n");

const res = spawnSync("fly.exe", ["secrets", "import", "--app", "vlue-api", "--stage"], {
  input: inputBuffer,
  encoding: "utf8",
  shell: true
});

if (res.status !== 0) {
  console.error("fly secrets import 실패:\n", res.stderr || res.stdout);
  process.exit(1);
}

console.log("\nFly.io secrets 성공적으로 등록 완료:\n", res.stdout);
