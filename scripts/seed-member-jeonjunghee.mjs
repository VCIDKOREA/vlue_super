/**
 * One-shot: 전중희 유료 회원 upsert
 * 실행: node scripts/seed-member-jeonjunghee.mjs
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of [".env", "packages/db/.env"]) {
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

const prisma = new PrismaClient();
const PASSWORD = process.env.VLUE_TEST_ACCOUNT_PASSWORD || "VlueTest1!";

/** 사용자 표기 101-6335-8746 → 한국 휴대폰 010 으로 정규화 */
const SPEC = {
  publicHandle: "jeonjunghee",
  legalName: "전중희",
  phoneE164: "+821063358746",
  email: "jeonjunghee@vlue.test",
  portoneIdentityId: "seed_jeonjunghee_paid_v1",
  membershipTierSnapshot: "paid",
  subscription: {
    amountKrw: 19800,
    listPriceKrw: 28300,
    isDiscounted: true,
    plan: "b2c_monthly"
  }
};

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function addMonths(d, months) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

async function upsertUser(spec, passwordHash) {
  const now = new Date();
  const byPhone = await prisma.$queryRaw`
    SELECT id::text AS id, public_handle AS handle FROM users
    WHERE phone_e164 = ${spec.phoneE164} LIMIT 1
  `;
  const byHandle = await prisma.$queryRaw`
    SELECT id::text AS id, public_handle AS handle FROM users
    WHERE public_handle = ${spec.publicHandle} LIMIT 1
  `;
  const existing = byPhone?.[0] || byHandle?.[0];
  if (existing) {
    await prisma.$executeRaw`
      UPDATE users SET
        public_handle = ${spec.publicHandle},
        phone_e164 = ${spec.phoneE164},
        email = ${spec.email},
        password_hash = ${passwordHash},
        legal_name = ${spec.legalName},
        legal_name_locked_at = ${now},
        identity_verified = true,
        identity_verified_at = ${now},
        account_status = 'active'::"AccountStatus",
        portone_identity_id = ${spec.portoneIdentityId},
        nick_feed = ${spec.legalName},
        terms_version_accepted = 'manual-seed',
        terms_accepted_at = ${now},
        updated_at = ${now}
      WHERE id = ${existing.id}::uuid
    `;
    return existing.id;
  }
  const inserted = await prisma.$queryRaw`
    INSERT INTO users (
      id, public_handle, phone_e164, email, password_hash, legal_name, legal_name_locked_at,
      identity_verified, identity_verified_at, account_status, portone_identity_id,
      birth_date, gender, nick_feed, terms_version_accepted, terms_accepted_at, updated_at
    ) VALUES (
      gen_random_uuid(), ${spec.publicHandle}, ${spec.phoneE164}, ${spec.email}, ${passwordHash},
      ${spec.legalName}, ${now}, true, ${now}, 'active'::"AccountStatus", ${spec.portoneIdentityId},
      '19900101', 'M', ${spec.legalName}, 'manual-seed', ${now}, ${now}
    )
    RETURNING id::text AS id
  `;
  return inserted[0].id;
}

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  const now = new Date();
  const userId = await upsertUser(SPEC, passwordHash);

  await prisma.$executeRaw`
    INSERT INTO digital_cards (id, user_id, membership_tier_snapshot, updated_at)
    VALUES (gen_random_uuid(), ${userId}::uuid, ${SPEC.membershipTierSnapshot}, ${now})
    ON CONFLICT (user_id) DO UPDATE SET
      membership_tier_snapshot = EXCLUDED.membership_tier_snapshot,
      updated_at = ${now}
  `;

  const sub = SPEC.subscription;
  const cycleEnd = addMonths(now, 1);
  const existingSub = await prisma.$queryRaw`
    SELECT id::text AS id FROM user_subscriptions
    WHERE user_id = ${userId}::uuid AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `;
  const portoneUid = `user_customer_${userId}`;
  if (existingSub?.length) {
    await prisma.$executeRaw`
      UPDATE user_subscriptions SET
        plan = ${sub.plan}::"UserSubscriptionPlan",
        amount_krw = ${sub.amountKrw},
        list_price_krw = ${sub.listPriceKrw},
        is_discounted = ${sub.isDiscounted},
        cycle_end_at = ${cycleEnd},
        next_charge_at = ${cycleEnd},
        portone_customer_uid = ${portoneUid},
        updated_at = ${now}
      WHERE id = ${existingSub[0].id}::uuid
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO user_subscriptions (
        id, user_id, plan, status, amount_krw, list_price_krw, is_discounted,
        cycle_start_at, cycle_end_at, next_charge_at, portone_customer_uid, updated_at
      ) VALUES (
        gen_random_uuid(), ${userId}::uuid, ${sub.plan}::"UserSubscriptionPlan",
        'active'::"UserSubscriptionStatus", ${sub.amountKrw}, ${sub.listPriceKrw}, ${sub.isDiscounted},
        ${now}, ${cycleEnd}, ${cycleEnd}, ${portoneUid}, ${now}
      )
    `;
  }

  const row = await prisma.$queryRaw`
    SELECT u.id::text AS id, u.public_handle AS handle, u.legal_name AS name, u.phone_e164 AS phone,
           c.membership_tier_snapshot AS tier
    FROM users u
    LEFT JOIN digital_cards c ON c.user_id = u.id
    WHERE u.id = ${userId}::uuid
  `;
  console.log(JSON.stringify({ ok: true, password: PASSWORD, user: row[0] }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
