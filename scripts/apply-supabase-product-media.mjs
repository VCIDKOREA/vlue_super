/**
 * Supabase Storage — vlue-product-media 버킷 + 공개 읽기 RLS
 * 사용: npm run db:supabase-product-media
 * 필요: packages/db/.env 의 DIRECT_URL (또는 DATABASE_URL)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPkg = resolve(root, "packages", "db");

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

const sqlPath = resolve(root, "supabase/migrations/20260602210000_product_media_bucket.sql");
if (!existsSync(sqlPath)) {
  console.error("SQL 파일 없음:", sqlPath);
  process.exit(1);
}

console.log("Applying product media bucket SQL:", sqlPath);
const relSql = "../../supabase/migrations/20260602210000_product_media_bucket.sql";
const r = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", relSql, "--schema", "prisma/schema.prisma"],
  { cwd: dbPkg, stdio: "inherit", shell: true, env: process.env }
);

if (r.status !== 0) {
  console.error("\n실패. Supabase Dashboard → SQL Editor 에서 직접 실행:");
  console.error(sqlPath);
  process.exit(r.status ?? 1);
}

const corsOrigins = [
  "https://www.vlue.kr",
  "https://vlue.kr",
  "https://api.vlue.kr",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (supabaseUrl && serviceKey) {
  console.log("\nStorage CORS 설정 시도 (Supabase Management API)...");
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "GET",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey }
    });
    if (res.ok) {
      console.log("버킷 목록 확인 OK — Dashboard → Storage → Configuration 에서 CORS 허용:");
      corsOrigins.forEach((o) => console.log("  -", o));
      console.log("  PUT, GET, HEAD 메서드 허용 필요 (Direct Upload)");
    }
  } catch (e) {
    console.warn("CORS API 확인 스킵:", e instanceof Error ? e.message : e);
  }
} else {
  console.log("\nSUPABASE_SERVICE_ROLE_KEY 미설정 — CORS는 Dashboard에서 수동 설정:");
  corsOrigins.forEach((o) => console.log("  -", o));
}

console.log("\n[ok] product media bucket migration applied (5GB limit, public read RLS)");
