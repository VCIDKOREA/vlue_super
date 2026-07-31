/**
 * public 스키마 테이블 RLS 상태 점검
 * 사용: node --env-file=apps/api/.env scripts/check-rls-status.mjs
 */
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of ["apps/api/.env", "packages/db/.env", ".env"]) {
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

const require = createRequire(resolve(root, "packages/db/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const rows = await prisma.$queryRawUnsafe(`
  SELECT c.relname AS table_name,
         c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relispartition
  ORDER BY c.relrowsecurity ASC, c.relname ASC
`);

const off = rows.filter((r) => !r.rls_enabled);
const on = rows.filter((r) => r.rls_enabled);

console.log(`RLS_OFF ${off.length} / RLS_ON ${on.length} / TOTAL ${rows.length}`);
console.log("--- RLS DISABLED ---");
for (const r of off) console.log(r.table_name);

await prisma.$disconnect();
