/**
 * 전중희 대표계정: 휴대폰·내선·대표번호 + 번호별 담당자
 * 실행: node scripts/seed-jeonjunghee-dcc-lines.mjs
 *
 * 010-6335-8746 전중희 (사용 중)
 * 02-5551-8746 테스트 (사용 중)
 * 1577-8746 홍길동 (사용 중)
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

function pickAgent(agents, name) {
  const exact = agents.find((a) => a.displayName === name);
  if (exact) return exact;
  return agents.find((a) => String(a.displayName || "").includes(name)) || null;
}

async function upsertLine(user, spec) {
  const taken = await prisma.businessCard.findFirst({
    where: { phoneE164: spec.phoneE164 },
    select: { id: true, userId: true }
  });
  if (taken && taken.userId !== user.id) {
    return { ...spec, ok: false, error: "다른 계정이 이미 사용 중인 번호" };
  }
  const row = await prisma.businessCard.upsert({
    where: { phoneE164: spec.phoneE164 },
    create: {
      userId: user.id,
      kind: spec.kind,
      phoneE164: spec.phoneE164,
      displayName: spec.agentName,
      companyName: "VLUE",
      isPremiumLine: spec.kind !== "mobile",
      verificationStatus: "approved"
    },
    update: {
      kind: spec.kind,
      isPremiumLine: spec.kind !== "mobile",
      verificationStatus: "approved"
    }
  });
  return { ok: true, id: row.id, kind: row.kind, phoneE164: row.phoneE164 };
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ publicHandle: "jeonjunghee" }, { legalName: "전중희" }] },
    select: { id: true, legalName: true, publicHandle: true, phoneE164: true }
  });
  if (!user) {
    throw new Error("전중희 계정을 찾을 수 없습니다. 먼저 seed-member-jeonjunghee.mjs 를 실행하세요.");
  }

  const mobileE164 = String(user.phoneE164 || "").trim() || "+821063358746";
  const specs = [
    { kind: "mobile", phoneE164: mobileE164, agentName: "전중희" },
    { kind: "extension", phoneE164: "+82255518746", agentName: "테스트" },
    { kind: "rep_number", phoneE164: "+8215778746", agentName: "홍길동" }
  ];

  const seeded = [];
  for (const spec of specs) {
    seeded.push(await upsertLine(user, spec));
  }

  const agents = await prisma.userDccAgentProfile.findMany({
    where: { userId: user.id },
    select: { id: true, displayName: true, title: true, department: true }
  });

  const assigned = [];
  for (const spec of specs) {
    const agent = pickAgent(agents, spec.agentName);
    const card = await prisma.businessCard.findFirst({
      where: { userId: user.id, phoneE164: spec.phoneE164 }
    });
    if (!agent || !card) {
      assigned.push({ phoneE164: spec.phoneE164, ok: false, error: agent ? "번호 없음" : `담당자 '${spec.agentName}' 없음` });
      continue;
    }
    const prevSnap =
      card.dccSnapshotJson && typeof card.dccSnapshotJson === "object" && !Array.isArray(card.dccSnapshotJson)
        ? { ...card.dccSnapshotJson }
        : {};
    const prevPj =
      card.profileJson && typeof card.profileJson === "object" && !Array.isArray(card.profileJson)
        ? { ...card.profileJson }
        : {};
    await prisma.businessCard.update({
      where: { id: card.id },
      data: {
        displayName: agent.displayName,
        jobTitle: agent.title || null,
        activeDccAgentProfileId: agent.id,
        dccSnapshotJson: {
          ...prevSnap,
          name: agent.displayName,
          displayName: agent.displayName,
          title: agent.title,
          department: agent.department
        },
        profileJson: {
          ...prevPj,
          title: agent.title,
          department: agent.department
        }
      }
    });
    assigned.push({
      ok: true,
      phoneE164: spec.phoneE164,
      displayName: agent.displayName,
      agentId: agent.id
    });
  }

  const owned = await prisma.businessCard.findMany({
    where: { userId: user.id, kind: { in: ["mobile", "extension", "rep_number"] } },
    select: {
      id: true,
      kind: true,
      phoneE164: true,
      displayName: true,
      activeDccAgentProfileId: true
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        user: { id: user.id, handle: user.publicHandle, name: user.legalName, phone: user.phoneE164 },
        agents: agents.map((a) => ({ id: a.id, displayName: a.displayName })),
        seeded,
        assigned,
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
