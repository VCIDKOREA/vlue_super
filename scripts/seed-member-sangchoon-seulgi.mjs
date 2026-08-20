/**
 * 이상춘·이슬기 테스트 계정 upsert (PASS 없이 본인인증 완료 + 유료)
 * 실행: node scripts/seed-member-sangchoon-seulgi.mjs
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
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

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();
const PASSWORD = process.env.VLUE_TEST_ACCOUNT_PASSWORD || "VlueTest1!";

const ACCOUNTS = [
  {
    publicHandle: "sangchoon1",
    legalName: "이상춘",
    phoneE164: "+821092328746",
    email: "sangchoon1@vlue.test",
    gender: "M",
    paid: true,
    portoneIdentityId: "seed_leesangchoon_paid_v1"
  },
  {
    publicHandle: "seulgi1",
    legalName: "이슬기",
    phoneE164: "+821049668746",
    email: "seulgi1@vlue.test",
    gender: "F",
    paid: false,
    portoneIdentityId: "seed_leeseulgi_paid_v1"
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

async function upsertUser(spec, passwordHash) {
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phoneE164: spec.phoneE164 }, { publicHandle: spec.publicHandle }]
    },
    select: { id: true }
  });

  const data = {
    publicHandle: spec.publicHandle,
    phoneE164: spec.phoneE164,
    email: spec.email,
    passwordHash,
    legalName: spec.legalName,
    legalNameLockedAt: now,
    identityVerified: true,
    identityVerifiedAt: now,
    isVerified: true,
    accountStatus: "active",
    status: "ACTIVE",
    signupMethod: "vlue_native",
    portoneIdentityId: spec.portoneIdentityId,
    birthDate: "19900101",
    gender: spec.gender,
    nickFeed: spec.legalName,
    termsVersionAccepted: "manual-seed",
    termsAcceptedAt: now
  };

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data });
    return { id: existing.id, created: false };
  }

  const created = await prisma.user.create({
    data,
    select: { id: true }
  });
  return { id: created.id, created: true };
}

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  const now = new Date();
  const out = [];

  for (const spec of ACCOUNTS) {
    const { id, created } = await upsertUser(spec, passwordHash);
    const tier = spec.paid ? "paid" : "free";
    await prisma.digitalCard.upsert({
      where: { userId: id },
      create: {
        userId: id,
        membershipTierSnapshot: tier,
        displayName: spec.legalName
      },
      update: {
        membershipTierSnapshot: tier,
        displayName: spec.legalName,
        updatedAt: now
      }
    });

    if (spec.paid) {
      const cycleEnd = addMonths(now, 1);
      const existingSub = await prisma.userSubscription.findFirst({
        where: { userId: id, status: "active" },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      });
      const portoneUid = `user_customer_${id}`;
      if (existingSub) {
        await prisma.userSubscription.update({
          where: { id: existingSub.id },
          data: {
            plan: "b2c_monthly",
            amountKrw: 9900,
            listPriceKrw: 28300,
            isDiscounted: true,
            cycleEndAt: cycleEnd,
            nextChargeAt: cycleEnd,
            portoneCustomerUid: portoneUid
          }
        });
      } else {
        await prisma.userSubscription.create({
          data: {
            userId: id,
            plan: "b2c_monthly",
            status: "active",
            amountKrw: 9900,
            listPriceKrw: 28300,
            isDiscounted: true,
            cycleStartAt: now,
            cycleEndAt: cycleEnd,
            nextChargeAt: cycleEnd,
            portoneCustomerUid: portoneUid
          }
        });
      }
    } else {
      await prisma.userSubscription.updateMany({
        where: { userId: id, status: "active" },
        data: {
          status: "cancelled",
          cancelledAt: now,
          cancelReason: "qa-free-seed",
          nextChargeAt: null
        }
      });
    }

    out.push({
      created,
      name: spec.legalName,
      handle: spec.publicHandle,
      phone: spec.phoneE164,
      tier,
      id
    });
  }

  console.log(JSON.stringify({ ok: true, password: PASSWORD, users: out }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
