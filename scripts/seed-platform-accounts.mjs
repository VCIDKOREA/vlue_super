/**
 * VLUE 플랫폼 고정 계정 시드 — 역할 분리
 *
 * 1) admin — 마스터 관리자 (role=admin, 시스템 관제)
 * 2) ceo   — 대표 개인 Premium (role=user, 유료 구독·명함 스냅샷)
 *
 * 실행: npm run seed:platform-accounts
 * 환경변수:
 *   VLUE_ADMIN_PASSWORD (기본 VlueStart2026!)
 *   VLUE_CEO_PASSWORD   (기본은 시드 스크립트 상수 — 운영에서는 env 권장)
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PLATFORM_CEO_CI_UNIQUE_KEY = "platform:ceo:seed_ceo_premium_v1";

function ceoCiHashBytes() {
  return createHash("sha256").update(PLATFORM_CEO_CI_UNIQUE_KEY, "utf8").digest();
}

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();

const ADMIN = {
  handle: "admin",
  password: process.env.VLUE_ADMIN_PASSWORD || "VlueStart2026!",
  phone: "+821090009999",
  email: "admin@vlue.internal",
  legalName: "VLUE 마스터관리자",
  nick: "VLUE Master Admin",
  portoneIdentityId: "seed_admin_master_v1",
  role: "admin"
};

const CEO = {
  handle: "ceo",
  password: process.env.VLUE_CEO_PASSWORD || "!Dlwhdrms2282",
  phone: "+821080144666",
  email: "ceo@vlue.kr",
  legalName: "이종근",
  nick: "VLUE CEO",
  portoneIdentityId: "seed_ceo_premium_v1",
  role: "user",
  membershipTier: "paid",
  subscription: {
    amountKrw: 9900,
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

async function upsertAdmin(passwordHash) {
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: { publicHandle: ADMIN.handle },
    select: { id: true }
  });

  const data = {
    passwordHash,
    role: "admin",
    legalName: ADMIN.legalName,
    legalNameLockedAt: now,
    phoneE164: ADMIN.phone,
    email: ADMIN.email,
    identityVerified: true,
    identityVerifiedAt: now,
    accountStatus: "active",
    portoneIdentityId: ADMIN.portoneIdentityId,
    birthDate: "19700101",
    gender: "M",
    nickFeed: ADMIN.nick,
    termsVersionAccepted: "platform-seed-admin",
    termsAcceptedAt: now,
    status: "ACTIVE",
    enterpriseRole: "NONE",
    lineType: "NONE"
  };

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.user.create({
    data: { publicHandle: ADMIN.handle, ...data },
    select: { id: true }
  });
  return created.id;
}

async function upsertCeo(passwordHash) {
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: { publicHandle: CEO.handle },
    select: { id: true }
  });

  const data = {
    passwordHash,
    role: "user",
    legalName: CEO.legalName,
    legalNameLockedAt: now,
    phoneE164: CEO.phone,
    email: CEO.email,
    identityVerified: true,
    identityVerifiedAt: now,
    accountStatus: "active",
    portoneIdentityId: CEO.portoneIdentityId,
    ciHash: ceoCiHashBytes(),
    isVerified: true,
    isCompanyVerified: true,
    companyVerifiedAt: now,
    birthDate: "19700101",
    gender: "M",
    nickFeed: CEO.nick,
    termsVersionAccepted: "platform-seed-ceo",
    termsAcceptedAt: now,
    status: "ACTIVE",
    hasActiveShowcase: true,
    enterpriseRole: "NONE",
    lineType: "NONE"
  };

  let userId;
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data });
    userId = existing.id;
  } else {
    const created = await prisma.user.create({
      data: { publicHandle: CEO.handle, ...data },
      select: { id: true }
    });
    userId = created.id;
  }

  await prisma.digitalCard.upsert({
    where: { userId },
    create: {
      userId,
      membershipTierSnapshot: CEO.membershipTier
    },
    update: {
      membershipTierSnapshot: CEO.membershipTier
    }
  });

  const cycleEnd = addMonths(now, 12);
  const portoneUid = `user_customer_${userId}`;
  const active = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (active) {
    await prisma.userSubscription.update({
      where: { id: active.id },
      data: {
        plan: CEO.subscription.plan,
        amountKrw: CEO.subscription.amountKrw,
        listPriceKrw: CEO.subscription.listPriceKrw,
        isDiscounted: CEO.subscription.isDiscounted,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: portoneUid
      }
    });
  } else {
    await prisma.userSubscription.create({
      data: {
        userId,
        plan: CEO.subscription.plan,
        status: "active",
        amountKrw: CEO.subscription.amountKrw,
        listPriceKrw: CEO.subscription.listPriceKrw,
        isDiscounted: CEO.subscription.isDiscounted,
        cycleStartAt: now,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: portoneUid
      }
    });
  }

  return userId;
}

async function clearUserDevices(userId) {
  try {
    await prisma.userDevice.deleteMany({ where: { userId } });
  } catch {
    /* ignore */
  }
}

try {
  const adminHash = await hashPassword(ADMIN.password);
  const ceoHash = await hashPassword(CEO.password);
  const adminId = await upsertAdmin(adminHash);
  const ceoId = await upsertCeo(ceoHash);
  await clearUserDevices(adminId);
  await clearUserDevices(ceoId);

  const md = [
    "# VLUE 플랫폼 고정 계정 (역할 분리)",
    "",
    "생성: `npm run seed:platform-accounts`",
    "",
    "| 구분 | 로그인 ID | 역할 | 이메일 | 권한 |",
    "|------|-----------|------|--------|------|",
    `| 마스터 관리자 | \`${ADMIN.handle}\` | \`role=admin\` | ${ADMIN.email} | 시스템 전체 조회 · 알림톡/결제 로그 · V1 출시 스위치 |`,
    `| 대표 개인 | \`${CEO.handle}\` | \`role=user\` + Premium | ${CEO.email} | 쇼케이스·인증명함·가족보호(최대 4인) 등 V1 유료 기능 |`,
    "",
    "## 비밀번호",
    "",
    "- admin: 환경변수 `VLUE_ADMIN_PASSWORD` (미설정 시 시드 기본값)",
    "- ceo: 환경변수 `VLUE_CEO_PASSWORD` (미설정 시 시드 기본값)",
    "",
    "## 분리 원칙",
    "",
    "- **admin** 만 `/api/admin/console`, `/api/admin/hq` 접근",
    "- **ceo** 는 일반 회원 로그인만 — 관리 콘솔/HQ 거부 (`CEO_NOT_SYSTEM_ADMIN`)",
    "",
    `시드 시각: ${new Date().toISOString()}`,
    `admin userId: ${adminId}`,
    `ceo userId: ${ceoId}`,
    ""
  ].join("\n");

  writeFileSync(resolve(root, "scripts/PLATFORM_ACCOUNTS.md"), md, "utf8");

  console.log("✓ 플랫폼 계정 시드 완료 (역할 분리)");
  console.log(`  [마스터] ID=${ADMIN.handle}  role=admin  userId=${adminId}`);
  console.log(`  [대표]   ID=${CEO.handle}   role=user + paid  email=${CEO.email}  userId=${ceoId}`);
  console.log("  문서: scripts/PLATFORM_ACCOUNTS.md");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
