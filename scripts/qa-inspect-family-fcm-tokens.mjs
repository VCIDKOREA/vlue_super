/**
 * QA: 가족 테스트 계정 FCM 토큰 등록 여부 확인
 * 실행: node scripts/qa-inspect-family-fcm-tokens.mjs
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
const handles = ["sangchoon1", "seulgi1", "jeonjunghee"];

async function main() {
  const users = await prisma.$queryRaw`
    SELECT id::text AS id, public_handle AS handle, legal_name AS name
    FROM users
    WHERE public_handle = ANY(${handles})
  `;

  const out = [];
  for (const u of users) {
    const devices = await prisma.$queryRaw`
      SELECT id::text AS id,
             is_verified AS verified,
             (fcm_token IS NOT NULL AND length(fcm_token) >= 20) AS has_fcm,
             CASE
               WHEN fcm_token IS NULL OR length(fcm_token) < 20 THEN null
               ELSE left(fcm_token, 16)
             END AS fcm_prefix,
             label,
             platform,
             client_kind AS client_kind,
             updated_at AS updated
      FROM user_devices
      WHERE user_id = ${u.id}::uuid
      ORDER BY updated_at DESC NULLS LAST
    `;
    out.push({
      handle: u.handle,
      name: u.name,
      id: u.id,
      deviceCount: devices.length,
      verifiedWithFcm: devices.filter((d) => d.verified && d.has_fcm).length,
      devices
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        fcmServerEnv: {
          hasProject: Boolean(process.env.FCM_PROJECT_ID),
          hasEmail: Boolean(process.env.FCM_CLIENT_EMAIL),
          hasKey: Boolean(process.env.FCM_PRIVATE_KEY),
          hasGac: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        },
        users: out
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
