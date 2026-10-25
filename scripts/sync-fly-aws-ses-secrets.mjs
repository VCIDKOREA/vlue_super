#!/usr/bin/env node
/**
 * apps/api/.env 의 AWS SES 관련 시크릿만 Fly.io(vlue-api)에 재등록
 * — 값 자체는 stdout에 출력하지 않음
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, "apps/api/.env");

if (!existsSync(envFile)) {
  console.error("apps/api/.env 없음:", envFile);
  process.exit(1);
}

const KEYS = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "SENDER_EMAIL"];

const map = new Map();
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx < 0) continue;
  const key = t.slice(0, idx).trim();
  if (!KEYS.includes(key)) continue;
  let val = t.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  map.set(key, val);
}

if (!map.has("AWS_REGION")) map.set("AWS_REGION", "ap-northeast-2");
if (!map.has("SENDER_EMAIL")) map.set("SENDER_EMAIL", "support@vlue.kr");

for (const k of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]) {
  if (!map.get(k)?.trim()) {
    console.error(`필수 키 누락: ${k}`);
    process.exit(1);
  }
}

console.log("재등록 대상:");
for (const [k, v] of map.entries()) {
  console.log(`  - ${k} (len=${String(v).length}, prefix=${String(v).slice(0, 4)})`);
}

const flyBin =
  process.env.FLYCTL_INSTALL
    ? resolve(process.env.FLYCTL_INSTALL, "bin", process.platform === "win32" ? "fly.exe" : "fly")
    : process.platform === "win32"
      ? resolve(process.env.USERPROFILE || "", ".fly", "bin", "fly.exe")
      : "fly";

const inputBuffer = Array.from(map.entries())
  .map(([k, v]) => `${k}=${v}`)
  .join("\n");

const res = spawnSync(flyBin, ["secrets", "import", "--app", "vlue-api"], {
  input: inputBuffer,
  encoding: "utf8",
  shell: false
});

if (res.status !== 0) {
  console.error("fly secrets import 실패:\n", res.stderr || res.stdout);
  process.exit(1);
}

console.log("\nFly.io AWS SES 시크릿 재등록 완료:\n", res.stdout || "(ok)");
