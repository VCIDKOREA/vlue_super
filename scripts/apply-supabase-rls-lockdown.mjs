/**
 * Supabase public 스키마 RLS 잠금 적용 (Prisma · DO 블록 단위)
 * 사용: npm run db:supabase-rls-lockdown
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Pooler(6543)보다 DIRECT(5432) 우선 — multi-statement/DO 안정 */
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

if (!process.env.DATABASE_URL) {
  console.error("DIRECT_URL 또는 DATABASE_URL 이 없습니다.");
  process.exit(1);
}

const statements = [
  `DROP POLICY IF EXISTS "chat_messages_select_all_for_dev" ON public.chat_messages`,
  `DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relispartition
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$`,
  `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents'
  ) THEN
    DROP POLICY IF EXISTS "documents_public_read_active" ON public.documents;
    CREATE POLICY "documents_public_read_active" ON public.documents
      FOR SELECT
      TO anon, authenticated
      USING (COALESCE(is_active, false) = true);
  END IF;
END $$`,
  `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'terms_agreement_log'
  ) THEN
    ALTER TABLE public.terms_agreement_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "terms_agreement_log_no_anon" ON public.terms_agreement_log;
    CREATE POLICY "terms_agreement_log_no_anon"
      ON public.terms_agreement_log
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$`
];

const require = createRequire(resolve(root, "packages/db/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

console.log("Applying Supabase RLS lockdown via Prisma…");
let ok = 0;
try {
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
    ok += 1;
    console.log(`OK ${ok}/${statements.length}`);
  }
  console.log("RLS lockdown applied. Advisors → Security 에서 이슈 해소 여부 확인하세요.");
} catch (e) {
  console.error(`Failed after ${ok} statements:`, e?.message || e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
