/**
 * VLUE 관리자 콘솔 계정 시드 — 마스터 admin
 * (대표 ceo 포함 시드: npm run seed:platform-accounts)
 * 실행: npm run seed:admin-account
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(process.execPath, [resolve(root, "scripts/seed-platform-accounts.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});
process.exit(r.status ?? 1);
