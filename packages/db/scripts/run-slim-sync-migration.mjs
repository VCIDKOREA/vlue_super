/**
 * Run slim-sync SQL migration (multi-statement) via Prisma.
 * Usage: node --env-file=apps/api/.env packages/db/scripts/run-slim-sync-migration.mjs
 *    or: from packages/db with DATABASE_URL set
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../prisma/migrations/20260728_slim_sync_meta.sql");
const sql = readFileSync(sqlPath, "utf8");

const statements = sql
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !/^\s*--/.test(line))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();
let ok = 0;
try {
  for (const stmt of statements) {
    console.log("--- executing ---\n" + stmt.slice(0, 120) + (stmt.length > 120 ? "…" : ""));
    await prisma.$executeRawUnsafe(stmt);
    ok += 1;
  }
  console.log(`OK: ${ok}/${statements.length} statements applied`);
} catch (e) {
  console.error("Migration failed after", ok, "statements:", e?.message || e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
