/**
 * Supabase public 스키마 RLS 잠금 SQL 적용
 * 사용: npm run db:supabase-rls-lockdown
 * 필요: packages/db/.env 의 DIRECT_URL 또는 DATABASE_URL
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of [".env", "packages/db/.env", "apps/api/.env"]) {
  const f = resolve(root, rel);
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
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

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DIRECT_URL 또는 DATABASE_URL 이 없습니다. packages/db/.env 를 확인하세요.");
  process.exit(1);
}

const sqlPath = resolve(root, "supabase/migrations/20260608120000_lockdown_public_rls.sql");
const sql = readFileSync(sqlPath, "utf8");

console.log("Applying Supabase RLS lockdown:", sqlPath);

const r = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  stdio: "inherit",
  shell: true,
  env: process.env
});

if (r.status !== 0) {
  console.error("\npsql 실행 실패. Supabase Dashboard → SQL Editor 에서 아래 파일을 직접 실행하세요:");
  console.error(sqlPath);
  process.exit(r.status ?? 1);
}

console.log("\nRLS lockdown applied. Supabase Security Advisor에서 이슈가 해소되는지 확인하세요.");
