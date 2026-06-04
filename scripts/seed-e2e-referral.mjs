/** E2E용 추천인 코드 — @ceo 스폰서에 E2ETEST01 부여 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
const CODE = "E2ETEST01";

const u = await prisma.user.findFirst({ where: { publicHandle: "ceo" }, select: { id: true, legalName: true } });
if (!u) {
  console.error("@ceo 사용자 없음 — 다른 public_handle 로 수정하세요.");
  process.exit(1);
}

await prisma.userVluerProfile.upsert({
  where: { userId: u.id },
  create: {
    userId: u.id,
    referralCode: CODE,
    activityTier: 3,
    tierCode: "general",
    canActAsVluer: true,
    isEligibleForVluerSettlement: true
  },
  update: {
    referralCode: CODE,
    canActAsVluer: true,
    isEligibleForVluerSettlement: true,
    rewardsFrozen: false,
    rewardsFrozenAt: null,
    b2bBlockedAt: null
  }
});

console.log(`추천인 코드 준비: ${CODE} → ${u.legalName || "ceo"} (@ceo)`);
await prisma.$disconnect();
