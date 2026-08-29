/**
 * QA: 가족 보호 pending/active 연결 조회·해지
 * 실행: node scripts/qa-revoke-family-links.mjs [--dry-run] [--handle=jeonjunghee]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const handleArg = process.argv.find((a) => a.startsWith("--handle="));
const handleFilter = handleArg ? handleArg.slice("--handle=".length).trim().toLowerCase() : null;

async function main() {
  const whereUser = handleFilter
    ? `AND (g.public_handle = '${handleFilter}' OR w.public_handle = '${handleFilter}')`
    : "";

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      l.id::text AS link_id,
      l.status::text AS status,
      l.ward_role::text AS ward_role,
      l.family_relation::text AS family_relation,
      l.created_at AS created_at,
      g.public_handle AS guardian_handle,
      g.legal_name AS guardian_name,
      w.public_handle AS ward_handle,
      w.legal_name AS ward_name
    FROM family_protection_links l
    JOIN users g ON g.id = l.guardian_user_id
    JOIN users w ON w.id = l.ward_user_id
    WHERE l.status IN ('pending', 'active')
    ${whereUser}
    ORDER BY l.created_at DESC
  `);

  if (!rows.length) {
    console.log(JSON.stringify({ ok: true, revoked: 0, message: "no pending/active links" }, null, 2));
    return;
  }

  const revoked = [];
  for (const row of rows) {
    if (dryRun) {
      revoked.push({ ...row, dryRun: true });
      continue;
    }
    await prisma.$executeRaw`
      UPDATE family_protection_links
      SET status = 'revoked'::"FamilyProtectionLinkStatus", updated_at = NOW()
      WHERE id = ${row.link_id}::uuid
    `;
    revoked.push({ ...row, revoked: true });
  }

  console.log(JSON.stringify({ ok: true, dryRun, count: revoked.length, links: revoked }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
