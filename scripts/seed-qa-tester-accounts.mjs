/**
 * QA 테스터 계정 upsert (이메일·PASS 없이 로그인)
 *
 * 실행 예:
 *   node scripts/seed-qa-tester-accounts.mjs
 *
 * 계정은 아래 ACCOUNTS 에 ID만 두고, 비밀번호는 환경변수로 넣습니다.
 *   VLUE_QA_PASS_JAJAKSL123=...
 *   VLUE_QA_PASS_ZAZAJIN1233=...
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of ["apps/api/.env", "packages/db/.env", ".env"]) {
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

const ACCOUNTS = [
  {
    publicHandle: "jajaksl123",
    passwordEnv: "VLUE_QA_PASS_JAJAKSL123",
    legalName: "QA테스터1",
    phoneE164: "+821099880001",
    portoneIdentityId: "qa_seed_jajaksl123_v1"
  },
  {
    publicHandle: "zazajin1233",
    passwordEnv: "VLUE_QA_PASS_ZAZAJIN1233",
    legalName: "QA테스터2",
    phoneE164: "+821099880002",
    portoneIdentityId: "qa_seed_zazajin1233_v1"
  }
];

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const prisma = new PrismaClient();

async function upsertAccount(spec, password) {
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: { publicHandle: spec.publicHandle },
    select: { id: true }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        legalName: spec.legalName,
        phoneE164: spec.phoneE164,
        portoneIdentityId: spec.portoneIdentityId,
        identityVerified: true,
        identityVerifiedAt: now,
        accountStatus: "active",
        status: "ACTIVE",
        signupMethod: "vlue_native"
      }
    });
    return { id: existing.id, created: false };
  }

  const created = await prisma.user.create({
    data: {
      publicHandle: spec.publicHandle,
      passwordHash,
      legalName: spec.legalName,
      legalNameLockedAt: now,
      phoneE164: spec.phoneE164,
      portoneIdentityId: spec.portoneIdentityId,
      identityVerified: true,
      identityVerifiedAt: now,
      accountStatus: "active",
      status: "ACTIVE",
      signupMethod: "vlue_native",
      birthDate: "19900101",
      gender: "M",
      currentDiscountRate: 30,
      termsVersionAccepted: "qa-seed",
      termsAcceptedAt: now
    },
    select: { id: true }
  });
  return { id: created.id, created: true };
}

try {
  for (const acc of ACCOUNTS) {
    const password = String(process.env[acc.passwordEnv] || "").trim();
    if (!password) {
      console.error(`Missing env ${acc.passwordEnv} for @${acc.publicHandle}`);
      process.exitCode = 1;
      continue;
    }
    const r = await upsertAccount(acc, password);
    console.log(`${r.created ? "CREATED" : "UPDATED"} @${acc.publicHandle} id=${r.id}`);
  }
  if (!process.exitCode) {
    console.log("OK: QA tester accounts ready (ID/password login, no email OTP).");
  }
} catch (e) {
  console.error("FAILED:", e?.message || e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
