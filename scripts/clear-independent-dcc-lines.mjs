/**
 * 내선·대표번호에 잘못 복사된 대표계정 쇼케이스/명함을 비운다.
 * 인증번호(010)는 그대로 둔다.
 * 실행: node scripts/clear-independent-dcc-lines.mjs
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
const USER_ID = "aca042f1-e679-4457-854a-954ad01832b0";

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: { phoneE164: true }
  });
  const certified = String(user?.phoneE164 || "").trim();
  const lines = await prisma.businessCard.findMany({
    where: { userId: USER_ID, kind: { in: ["mobile", "extension", "rep_number"] } },
    select: {
      id: true,
      kind: true,
      phoneE164: true,
      displayName: true,
      jobTitle: true,
      dccSnapshotJson: true,
      activeDccAgentProfileId: true
    }
  });
  const cleared = [];
  for (const line of lines) {
    if (certified && line.phoneE164 === certified) continue;
    const agent = line.activeDccAgentProfileId
      ? await prisma.userDccAgentProfile.findUnique({
          where: { id: line.activeDccAgentProfileId },
          select: { displayName: true, title: true, department: true, photoUrl: true }
        })
      : null;
    const dcc = {
      name: agent?.displayName || line.displayName || "",
      displayName: agent?.displayName || line.displayName || "",
      title: agent?.title || line.jobTitle || "",
      department: agent?.department || ""
    };
    await prisma.businessCard.update({
      where: { id: line.id },
      data: {
        dccSnapshotJson: dcc,
        lineShowcaseStyleJson: null,
        lineShowcaseLiveStyleJson: null,
        lineShowcaseLiveSourceJson: null,
        lineShowcaseUpdatedAt: null
      }
    });
    cleared.push({ id: line.id, kind: line.kind, phoneE164: line.phoneE164, displayName: dcc.displayName });
  }
  console.log(JSON.stringify({ ok: true, certified, cleared }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
