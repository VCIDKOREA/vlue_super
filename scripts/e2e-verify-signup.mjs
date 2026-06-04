/**
 * E2E 가입 직후 DB 검증
 * 사용: node scripts/e2e-verify-signup.mjs
 *       node scripts/e2e-verify-signup.mjs --userId <uuid>
 *       node scripts/e2e-verify-signup.mjs --handle myloginid
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, "packages/db/.env"));

const prisma = new PrismaClient();

const args = process.argv.slice(2);
let userId = null;
let handle = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--userId") userId = args[++i];
  if (args[i] === "--handle") handle = args[++i]?.replace(/^@/, "");
}

function ok(cond, msg) {
  console.log(cond ? `  ✓ ${msg}` : `  ✗ ${msg}`);
}

async function main() {
  if (handle) {
    const u = await prisma.user.findFirst({
      where: { publicHandle: handle },
      select: { id: true, publicHandle: true, legalName: true, createdAt: true }
    });
    if (!u) {
      console.error(`handle @${handle} 사용자 없음`);
      process.exit(1);
    }
    userId = u.id;
    console.log(`\n사용자: ${u.legalName} (@${u.publicHandle}) ${u.id}`);
    console.log(`가입 시각: ${u.createdAt?.toISOString()}`);
  }

  if (!userId) {
    const latest = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, publicHandle: true, legalName: true, createdAt: true }
    });
    console.log("\n=== 최근 가입 사용자 3명 ===");
    latest.forEach((u, i) => {
      console.log(`${i + 1}. @${u.publicHandle} ${u.legalName || ""} ${u.id} (${u.createdAt?.toISOString()})`);
    });
    userId = latest[0]?.id;
    if (!userId) {
      console.log("가입 사용자 없음");
      process.exit(0);
    }
    console.log(`\n▶ 검증 대상: 최신 @${latest[0].publicHandle}\n`);
  }

  const profile = await prisma.userVluerProfile.findUnique({ where: { userId } });
  const subs = await prisma.userSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  const attr = await prisma.referralAttribution.findUnique({ where: { userId } });

  console.log("--- UserVluerProfile ---");
  if (!profile) {
    console.log("  (행 없음 — 유료 가입이면 생성되어야 함)");
  } else {
    console.log(JSON.stringify(profile, null, 2));
    ok(profile.activityTier === 3, `activityTier === 3 (실제: ${profile.activityTier})`);
    ok(profile.tierCode === "general", `tierCode === general (실제: ${profile.tierCode})`);
  }

  console.log("\n--- UserSubscription (최신순) ---");
  if (subs.length === 0) {
    console.log("  (행 없음 — 유료 가입이면 1건 있어야 함)");
  }
  for (const s of subs) {
    console.log(JSON.stringify(s, null, 2));
    ok(s.plan === "b2c_monthly" || s.plan === "b2c_annual", `plan=${s.plan}`);
    ok(
      s.status === "active" || s.status === "pending_payment",
      `status active 또는 pending_payment (실제: ${s.status})`
    );
    if (s.status === "active") {
      ok(Boolean(s.portoneCustomerUid), `portoneCustomerUid 저장됨 (${s.portoneCustomerUid || "없음"})`);
    }
  }

  const sub = subs[0];
  if (sub) {
    console.log("\n--- 시나리오 판정 (최신 구독 1건 기준) ---");
    if (sub.isDiscounted) {
      ok(sub.listPriceKrw === 28300, `listPriceKrw === 28300 (실제: ${sub.listPriceKrw})`);
      ok(sub.amountKrw === 19800, `amountKrw === 19800 (실제: ${sub.amountKrw})`);
      ok(Boolean(sub.referralCodeUsed), `referralCodeUsed 있음 (${sub.referralCodeUsed})`);
    } else {
      ok(sub.listPriceKrw === 28300, `listPriceKrw === 28300 (실제: ${sub.listPriceKrw})`);
      ok(sub.amountKrw === 28300, `amountKrw === 28300 정가 (실제: ${sub.amountKrw})`);
      ok(!sub.referralCodeUsed, "referralCodeUsed 없음");
    }
  }

  console.log("\n--- ReferralAttribution ---");
  if (!attr) console.log("  (없음 — 추천인 가입이면 있어야 함)");
  else console.log(JSON.stringify(attr, null, 2));

  const sponsors = await prisma.userVluerProfile.findMany({
    where: { referralCode: { not: null } },
    take: 5,
    select: { referralCode: true, userId: true, user: { select: { publicHandle: true, legalName: true } } }
  });
  console.log("\n=== 테스트용 추천인 코드 샘플 (DB) ===");
  sponsors.forEach((s) => {
    console.log(`  ${s.referralCode} → ${s.user?.legalName || ""} @${s.user?.publicHandle || ""}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
