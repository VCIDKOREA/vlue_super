/**
 * QA: 전중희·이상춘·이슬기 본인인증 완료 처리 (PASS 없이)
 * 실행: node scripts/qa-mark-family-test-identity.mjs
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function hashCiUniqueKey(ciUniqueKey) {
  return createHash("sha256").update(String(ciUniqueKey || ""), "utf8").digest();
}

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

const TARGETS = [
  {
    handle: "jeonjunghee",
    name: "전중희",
    phone: "+821063358746",
    portone: "seed_jeonjunghee_paid_v1"
  },
  {
    handle: "sangchoon1",
    name: "이상춘",
    phone: "+821092328746",
    portone: "seed_leesangchoon_paid_v1"
  },
  {
    handle: "seulgi1",
    name: "이슬기",
    phone: "+821049668746",
    portone: "seed_leeseulgi_paid_v1"
  }
];

async function main() {
  const now = new Date();
  const out = [];

  for (const t of TARGETS) {
    const rows = await prisma.$queryRaw`
      SELECT id::text AS id, public_handle AS handle, legal_name AS name, phone_e164 AS phone,
             identity_verified AS verified
      FROM users
      WHERE public_handle = ${t.handle}
         OR phone_e164 = ${t.phone}
         OR legal_name = ${t.name}
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 3
    `;

    if (!rows.length) {
      out.push({ ...t, ok: false, error: "not_found" });
      continue;
    }

    const id = rows[0].id;
    const ciKey = `qa-family-ci:${t.handle}:${t.portone}`;
    const ciHash = hashCiUniqueKey(ciKey);
    await prisma.$executeRaw`
      UPDATE users SET
        identity_verified = true,
        identity_verified_at = ${now},
        is_verified = true,
        account_status = 'active'::"AccountStatus",
        user_status = 'ACTIVE'::"UserStatus",
        portone_identity_id = COALESCE(portone_identity_id, ${t.portone}),
        ci_hash = ${ciHash},
        legal_name = COALESCE(NULLIF(legal_name, ''), ${t.name}),
        legal_name_locked_at = COALESCE(legal_name_locked_at, ${now}),
        updated_at = ${now}
      WHERE id = ${id}::uuid
    `;

    const after = await prisma.$queryRaw`
      SELECT id::text AS id,
             public_handle AS handle,
             legal_name AS name,
             phone_e164 AS phone,
             identity_verified AS verified,
             identity_verified_at AS verified_at,
             is_verified AS is_verified,
             (ci_hash IS NOT NULL) AS has_ci,
             portone_identity_id AS portone_id,
             user_status::text AS user_status,
             account_status::text AS account_status
      FROM users
      WHERE id = ${id}::uuid
    `;

    out.push({
      ok: true,
      matchedCandidates: rows.length,
      before: rows[0],
      after: after[0]
    });
  }

  console.log(JSON.stringify({ ok: true, users: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
