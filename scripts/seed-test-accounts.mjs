/**
 * 테스트 계정 3종 시드 — 일반(무료) / 유료 / 기업(B2B)
 * Prisma 스키마와 DB가 어긋날 때 users 는 raw SQL 로 삽입합니다.
 *
 * 실행: npm run seed:test-accounts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
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

const TEST_PASSWORD = process.env.VLUE_TEST_ACCOUNT_PASSWORD || "VlueTest1!";

const ACCOUNTS = [
  {
    kind: "free",
    label: "일반(무료)",
    publicHandle: "test_free",
    legalName: "테스트일반",
    phoneE164: "+821090000001",
    email: "test-free@vlue.test",
    portoneIdentityId: "seed_test_free_v1",
    membershipTierSnapshot: "free"
  },
  {
    kind: "paid",
    label: "유료",
    publicHandle: "test_paid",
    legalName: "테스트유료",
    phoneE164: "+821090000002",
    email: "test-paid@vlue.test",
    portoneIdentityId: "seed_test_paid_v1",
    membershipTierSnapshot: "paid",
    subscription: { amountKrw: 19800, listPriceKrw: 28300, isDiscounted: true, plan: "b2c_monthly" }
  },
  {
    kind: "b2b",
    label: "기업단체(B2B)",
    publicHandle: "test_b2b",
    legalName: "테스트대표",
    phoneE164: "+821090000003",
    email: "test-b2b@vlue.test",
    portoneIdentityId: "seed_test_b2b_v1",
    membershipTierSnapshot: "b2b",
    enterprise: {
      companyName: "VLUE 테스트주식회사",
      masterDisplayNumber: "0212345678",
      plannedLineCount: 10,
      totalBillingAmountKrw: 160600
    },
    subscription: { amountKrw: 160600, listPriceKrw: 160600, isDiscounted: false, plan: "b2c_monthly" }
  }
];

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

/** users — Prisma User 모델 없이 raw SQL (line_type 등 미적용 DB 호환) */
async function upsertUserRaw(spec, passwordHash) {
  const now = new Date();
  const existing = await prisma.$queryRaw`
    SELECT id::text AS id FROM users WHERE public_handle = ${spec.publicHandle} LIMIT 1
  `;
  if (existing?.length) {
    const userId = existing[0].id;
    await prisma.$executeRaw`
      UPDATE users SET
        phone_e164 = ${spec.phoneE164},
        email = ${spec.email},
        password_hash = ${passwordHash},
        legal_name = ${spec.legalName},
        legal_name_locked_at = ${now},
        identity_verified = true,
        identity_verified_at = ${now},
        account_status = 'active'::"AccountStatus",
        portone_identity_id = ${spec.portoneIdentityId},
        birth_date = '19900101',
        gender = 'M',
        nick_feed = ${spec.label},
        terms_version_accepted = 'test-seed',
        terms_accepted_at = ${now},
        updated_at = ${now}
      WHERE id = ${userId}::uuid
    `;
    return userId;
  }

  const inserted = await prisma.$queryRaw`
    INSERT INTO users (
      id, public_handle, phone_e164, email, password_hash, legal_name, legal_name_locked_at,
      identity_verified, identity_verified_at, account_status, portone_identity_id,
      birth_date, gender, nick_feed, terms_version_accepted, terms_accepted_at, updated_at
    ) VALUES (
      gen_random_uuid(), ${spec.publicHandle}, ${spec.phoneE164}, ${spec.email}, ${passwordHash},
      ${spec.legalName}, ${now}, true, ${now}, 'active'::"AccountStatus", ${spec.portoneIdentityId},
      '19900101', 'M', ${spec.label}, 'test-seed', ${now}, ${now}
    )
    RETURNING id::text AS id
  `;
  return inserted[0].id;
}

async function upsertDigitalCard(userId, tier) {
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO digital_cards (id, user_id, membership_tier_snapshot, updated_at)
    VALUES (gen_random_uuid(), ${userId}::uuid, ${tier}, ${now})
    ON CONFLICT (user_id) DO UPDATE SET
      membership_tier_snapshot = EXCLUDED.membership_tier_snapshot,
      updated_at = ${now}
  `;
}

async function upsertSubscription(userId, sub, now) {
  const cycleEnd = addMonths(now, 1);
  const existing = await prisma.$queryRaw`
    SELECT id::text AS id FROM user_subscriptions
    WHERE user_id = ${userId}::uuid AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `;
  const portoneUid = `user_customer_${userId}`;
  if (existing?.length) {
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
      WHERE id = ${existing[0].id}::uuid
    `;
    return;
  }
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

async function cancelActiveSubscriptions(userId, now) {
  await prisma.$executeRaw`
    UPDATE user_subscriptions SET
      status = 'cancelled'::"UserSubscriptionStatus",
      cancelled_at = ${now},
      cancel_reason = 'test_seed_free_tier',
      updated_at = ${now}
    WHERE user_id = ${userId}::uuid AND status = 'active'::"UserSubscriptionStatus"
  `;
}

async function upsertB2bEnterprise(userId, spec) {
  const entRows = await prisma.$queryRaw`
    SELECT id::text AS id FROM b2b_enterprise_accounts WHERE admin_user_id = ${userId}::uuid LIMIT 1
  `;
  let entId = entRows?.[0]?.id;
  if (entId) {
    await prisma.$executeRaw`
      UPDATE b2b_enterprise_accounts SET
        company_name = ${spec.enterprise.companyName},
        master_display_number = ${spec.enterprise.masterDisplayNumber},
        status = 'active'::"B2BEnterpriseStatus",
        total_billing_amount_krw = ${spec.enterprise.totalBillingAmountKrw},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${entId}::uuid
    `;
  } else {
    const created = await prisma.$queryRaw`
      INSERT INTO b2b_enterprise_accounts (
        id, admin_user_id, company_name, master_display_number, carrier, billing_cycle, status,
        total_billing_amount_krw, updated_at
      ) VALUES (
        gen_random_uuid(), ${userId}::uuid, ${spec.enterprise.companyName}, ${spec.enterprise.masterDisplayNumber},
        'LGUPLUS'::"B2BTelecomCarrier", 'monthly'::"B2BBillingCycle", 'active'::"B2BEnterpriseStatus",
        ${spec.enterprise.totalBillingAmountKrw}, ${new Date()}
      )
      RETURNING id::text AS id
    `;
    entId = created[0].id;
  }

  const lineCount = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS c FROM b2b_cart_lines WHERE enterprise_id = ${entId}::uuid
  `;
  if (!lineCount?.[0]?.c) {
    await prisma.$executeRaw`
      INSERT INTO b2b_cart_lines (
        id, enterprise_id, line_kind, real_cli_phone_e164, assignee_name, assignee_title, linked_user_id, sort_order
      ) VALUES (
        gen_random_uuid(), ${entId}::uuid, 'mobile'::"B2BCartLineKind", ${spec.phoneE164}, ${spec.legalName},
        '대표', ${userId}::uuid, 0
      )
    `;
  }

  try {
    await prisma.$executeRaw`
      UPDATE users SET
        enterprise_role = 'MASTER'::"EnterpriseRole",
        enterprise_group_id = ${userId}::uuid,
        line_type = 'MOBILE'::"LineType",
        enterprise_dept = '대표'
      WHERE id = ${userId}::uuid
    `;
  } catch {
    console.warn(`  ⚠ users.enterprise_* 컬럼 없음 — B2B 회선 역할은 마이그레이션 후 반영됩니다.`);
  }

  return entId;
}

async function clearUserDevices(userId) {
  try {
    await prisma.$executeRaw`DELETE FROM user_devices WHERE user_id = ${userId}::uuid`;
  } catch {
    /* 테이블 없으면 무시 */
  }
}

async function seedAccount(spec, passwordHash) {
  const now = new Date();
  const userId = await upsertUserRaw(spec, passwordHash);
  await clearUserDevices(userId);
  await upsertDigitalCard(userId, spec.membershipTierSnapshot);

  if (spec.subscription) {
    await upsertSubscription(userId, spec.subscription, now);
  } else {
    await cancelActiveSubscriptions(userId, now);
  }

  let enterpriseId = null;
  if (spec.enterprise) {
    try {
      enterpriseId = await upsertB2bEnterprise(userId, spec);
    } catch (e) {
      console.warn(`  ⚠ B2B enterprise: ${e.message || e}`);
    }
  }

  return { userId, enterpriseId };
}

async function main() {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const results = [];

  for (const spec of ACCOUNTS) {
    const { userId, enterpriseId } = await seedAccount(spec, passwordHash);
    results.push({
      kind: spec.kind,
      label: spec.label,
      loginId: spec.publicHandle,
      password: TEST_PASSWORD,
      phone: spec.phoneE164,
      email: spec.email,
      userId,
      enterpriseId
    });
    console.log(`✓ ${spec.label} — @${spec.publicHandle} (${userId})`);
  }

  const md = [
    "# VLUE 테스트 계정",
    "",
    "생성: `npm run seed:test-accounts`",
    "",
    `공통 비밀번호: \`${TEST_PASSWORD}\``,
    "",
    "| 구분 | 로그인 ID | 휴대폰 | 이메일 |",
    "|------|-----------|--------|--------|",
    ...results.map((r) => `| ${r.label} | \`${r.loginId}\` | ${r.phone} | ${r.email} |`),
    "",
    "## 로그인",
    "",
    "회원 ID(publicHandle) + 비밀번호로 로그인합니다.",
    "",
    "가입·로그인 후 `localStorage.membershipTier` 를 맞추려면:",
    "- 일반: `free`",
    "- 유료: `paid`",
    "- 기업: `b2b`",
    ""
  ].join("\n");

  const outPath = resolve(root, "scripts/TEST_ACCOUNTS.md");
  writeFileSync(outPath, md, "utf8");

  console.log("\n--- 로그인 정보 ---");
  console.log(`비밀번호(공통): ${TEST_PASSWORD}`);
  for (const r of results) {
    console.log(`  [${r.label}] ID: ${r.loginId}  |  ${r.phone}`);
  }
  console.log(`\n문서: ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
