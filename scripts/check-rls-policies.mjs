/**
 * public 테이블 RLS 정책 점검 (Realtime 영향 확인용)
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

const policies = await prisma.$queryRawUnsafe(`
  SELECT schemaname, tablename, policyname, roles::text, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
`);

console.log(`POLICY_COUNT ${policies.length}`);
for (const p of policies) {
  console.log(`${p.tablename} | ${p.policyname} | ${p.cmd} | roles=${p.roles}`);
}

const chat = await prisma.$queryRawUnsafe(`
  SELECT c.relname, c.relrowsecurity,
    (SELECT count(*) FROM pg_policies pol WHERE pol.tablename = c.relname AND pol.schemaname = 'public') AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('chat_messages', 'chat_rooms', 'documents', 'terms_agreement_log')
`);
console.log("--- key tables ---");
for (const r of chat) console.log(JSON.stringify(r));

await prisma.$disconnect();
