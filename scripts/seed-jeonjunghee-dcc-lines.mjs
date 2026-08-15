/**
 * 전중희 대표계정에 테스트 내선·대표번호 생성
 * 실행: node scripts/seed-jeonjunghee-dcc-lines.mjs
 */
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();

const LINES = [
  { kind: "extension", phoneE164: "+82255518746", label: "내선 테스트" },
  { kind: "rep_number", phoneE164: "+8215778746", label: "대표번호 테스트" }
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ publicHandle: "jeonjunghee" }, { legalName: "전중희" }] },
    select: { id: true, legalName: true, publicHandle: true, phoneE164: true }
  });
  if (!user) {
    throw new Error("전중희 계정을 찾을 수 없습니다. 먼저 seed-member-jeonjunghee.mjs 를 실행하세요.");
  }

  const results = [];
  for (const spec of LINES) {
    const taken = await prisma.businessCard.findFirst({
      where: { phoneE164: spec.phoneE164 },
      select: { id: true, userId: true }
    });
    if (taken && taken.userId !== user.id) {
      results.push({ ...spec, ok: false, error: "다른 계정이 이미 사용 중인 번호" });
      continue;
    }
    const row = await prisma.businessCard.upsert({
      where: { phoneE164: spec.phoneE164 },
      create: {
        userId: user.id,
        kind: spec.kind,
        phoneE164: spec.phoneE164,
        displayName: user.legalName || spec.label,
        companyName: "VLUE",
        isPremiumLine: true,
        verificationStatus: "approved"
      },
      update: {
        kind: spec.kind,
        isPremiumLine: true,
        verificationStatus: "approved"
      }
    });
    results.push({
      ok: true,
      id: row.id,
      kind: row.kind,
      phoneE164: row.phoneE164
    });
  }

  const primary =
    (await prisma.userDccAgentProfile.findFirst({
      where: { userId: user.id, isActive: true }
    })) ||
    (await prisma.userDccAgentProfile.findFirst({ where: { userId: user.id } }));
  if (primary) {
    await prisma.businessCard.updateMany({
      where: { userId: user.id, kind: { in: ["extension", "rep_number"] }, activeDccAgentProfileId: null },
      data: {
        activeDccAgentProfileId: primary.id,
        displayName: primary.displayName,
        jobTitle: primary.title || null
      }
    });
  }

  const owned = await prisma.businessCard.findMany({
    where: { userId: user.id },
    select: { id: true, kind: true, phoneE164: true, displayName: true }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        user: { id: user.id, handle: user.publicHandle, name: user.legalName, phone: user.phoneE164 },
        seeded: results,
        owned
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
