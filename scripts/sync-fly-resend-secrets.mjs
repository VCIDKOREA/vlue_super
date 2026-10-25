#!/usr/bin/env node
/**
 * Resend 메일러 시크릿만 Fly.io(vlue-api)에 등록
 * 우선순위: 환경변수 RESEND_API_KEY → apps/api/.env
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, "apps/api/.env");

function loadEnv(file) {
  const map = new Map();
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

const fileEnv = loadEnv(envFile);
const resendKey = String(process.env.RESEND_API_KEY || fileEnv.get("RESEND_API_KEY") || "").trim();
const sender =
  String(process.env.SENDER_EMAIL || fileEnv.get("SENDER_EMAIL") || "support@vlue.kr").trim() ||
  "support@vlue.kr";
const fromEmail = String(
  process.env.VLUE_SIGNUP_FROM_EMAIL || fileEnv.get("VLUE_SIGNUP_FROM_EMAIL") || sender
).trim();

if (!resendKey) {
  console.error(
    "RESEND_API_KEY 가 없습니다.\n" +
      "  1) apps/api/.env 에 RESEND_API_KEY=re_... 추가 후 재실행\n" +
      "  2) 또는: $env:RESEND_API_KEY='re_...'; node scripts/sync-fly-resend-secrets.mjs"
  );
  process.exit(1);
}
if (!resendKey.startsWith("re_")) {
  console.warn("[warn] RESEND_API_KEY 가 re_ 접두사가 아닙니다. 값을 다시 확인해 주세요.");
}

const secrets = new Map([
  ["SMTP_PROVIDER", "resend"],
  ["RESEND_API_KEY", resendKey],
  ["SENDER_EMAIL", sender],
  ["VLUE_SIGNUP_FROM_EMAIL", fromEmail]
]);

console.log("재등록 대상:");
for (const [k, v] of secrets.entries()) {
  if (k === "RESEND_API_KEY") {
    console.log(`  - ${k} (len=${v.length}, prefix=${v.slice(0, 3)})`);
  } else {
    console.log(`  - ${k}=${v}`);
  }
}

const flyBin =
  process.platform === "win32"
    ? resolve(process.env.USERPROFILE || "", ".fly", "bin", "fly.exe")
    : "fly";

const inputBuffer = Array.from(secrets.entries())
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

console.log("\nFly.io Resend 시크릿 등록 완료:\n", res.stdout || "(ok)");
