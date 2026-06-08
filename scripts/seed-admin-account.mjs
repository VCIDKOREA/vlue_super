/**
 * VLUE 관리자 콘솔 계정 시드 — admin / VlueStart2026!
 * 실행: npm run seed:admin-account
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();

const ADMIN_HANDLE = process.env.VLUE_ADMIN_HANDLE || "admin";
const ADMIN_PASSWORD = process.env.VLUE_ADMIN_PASSWORD || "VlueStart2026!";
const ADMIN_PHONE = "+821090009999";
const ADMIN_EMAIL = "admin@vlue.internal";

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function upsertAdmin(passwordHash) {
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: { publicHandle: ADMIN_HANDLE },
    select: { id: true }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "admin",
        legalName: "VLUE 관리자",
        legalNameLockedAt: now,
        phoneE164: ADMIN_PHONE,
        email: ADMIN_EMAIL,
        identityVerified: true,
        identityVerifiedAt: now,
        accountStatus: "active",
        portoneIdentityId: "seed_admin_v1",
        birthDate: "19900101",
        gender: "M",
        nickFeed: "VLUE Admin",
        termsVersionAccepted: "admin-seed",
        termsAcceptedAt: now,
        status: "ACTIVE"
      }
    });
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      publicHandle: ADMIN_HANDLE,
      passwordHash,
      role: "admin",
      legalName: "VLUE 관리자",
      legalNameLockedAt: now,
      phoneE164: ADMIN_PHONE,
      email: ADMIN_EMAIL,
      identityVerified: true,
      identityVerifiedAt: now,
      accountStatus: "active",
      portoneIdentityId: "seed_admin_v1",
      birthDate: "19900101",
      gender: "M",
      nickFeed: "VLUE Admin",
      termsVersionAccepted: "admin-seed",
      termsAcceptedAt: now
    },
    select: { id: true }
  });
  return created.id;
}

try {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const userId = await upsertAdmin(passwordHash);
  console.log("✓ 관리자 계정 준비 완료");
  console.log(`  ID: ${ADMIN_HANDLE}`);
  console.log(`  비밀번호: ${ADMIN_PASSWORD}`);
  console.log(`  role: admin`);
  console.log(`  userId: ${userId}`);
  console.log("\n로컬 진입: http://localhost:5173/admin (API: npm run api:dev)");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
