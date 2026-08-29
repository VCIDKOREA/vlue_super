#!/usr/bin/env node
/**
 * 로컬 Firebase 서비스 계정 JSON → Railway @vlue/api
 * GOOGLE_APPLICATION_CREDENTIALS(한 줄 JSON) + FCM_* + redeploy
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, "apps/api/.env");

function readCredPath() {
  if (!existsSync(envFile)) throw new Error(`apps/api/.env 없음: ${envFile}`);
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    const m = t.match(/^GOOGLE_APPLICATION_CREDENTIALS=(.+)$/);
    if (m) return m[1].trim().replace(/^"|"$/g, "");
  }
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS 가 apps/api/.env 에 없습니다.");
}

function runRailway(args) {
  const cmd = `npx.cmd --yes @railway/cli ${args}`;
  execSync(cmd, { stdio: "inherit", cwd: root, shell: true });
}

const credPath = readCredPath();
if (!existsSync(credPath)) throw new Error(`서비스 계정 파일 없음: ${credPath}`);

const parsed = JSON.parse(readFileSync(credPath, "utf8"));
const projectId = String(parsed.project_id || "").trim();
const clientEmail = String(parsed.client_email || "").trim();
const privateKey = String(parsed.private_key || "").trim();
if (!projectId || !clientEmail || !privateKey) {
  throw new Error("JSON에 project_id / client_email / private_key 가 필요합니다.");
}

const jsonCompact = JSON.stringify(parsed);
const escapedKey = privateKey.replace(/\r?\n/g, "\\n");

console.log(`Railway @vlue/api FCM 설정 (project: ${projectId})`);

runRailway(`variables set GOOGLE_APPLICATION_CREDENTIALS=${JSON.stringify(jsonCompact)} --service "@vlue/api"`);
runRailway(`variables set FCM_PROJECT_ID=${projectId} --service "@vlue/api"`);
runRailway(`variables set FCM_CLIENT_EMAIL=${clientEmail} --service "@vlue/api"`);
runRailway(`variables set FCM_PRIVATE_KEY=${JSON.stringify(escapedKey)} --service "@vlue/api"`);

console.log("\n@vlue/api 재배포 중...");
try {
  runRailway(`redeploy --service "@vlue/api" --yes`);
} catch {
  console.warn("redeploy CLI 실패 — Railway 대시보드에서 @vlue/api 수동 Redeploy 하세요.");
}

console.log("\n완료. 배포 후 관리자 > 상태 점검 > 푸시(FCM) 확인.");
