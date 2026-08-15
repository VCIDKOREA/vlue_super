/**
 * 전중희 인증번호(010) 쇼케이스·명함이 빈 회선에 가려진 것을 복구
 * 실행: node scripts/restore-jeonjunghee-certified-line.mjs
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
const MOBILE_ID = "b17a911e-9fd4-423c-8696-51315fbba28a";
const AGENT_JEON = "bef0fbfa-8bbc-400f-81ae-d720e7381ccb";

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: {
      legalName: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      showcaseLiveSourceJson: true,
      showcaseStyleUpdatedAt: true,
      digitalCard: {
        select: {
          exportSnapshotJson: true,
          photoUrl: true,
          logoUrl: true
        }
      }
    }
  });
  if (!user) throw new Error("user not found");
  const agent = await prisma.userDccAgentProfile.findUnique({ where: { id: AGENT_JEON } });
  const exportSnap =
    user.digitalCard?.exportSnapshotJson && typeof user.digitalCard.exportSnapshotJson === "object"
      ? { ...user.digitalCard.exportSnapshotJson }
      : {};
  const restoredExport = {
    ...exportSnap,
    name: user.legalName || "전중희",
    displayName: user.legalName || "전중희",
    activityName: user.legalName || "전중희",
    title: agent?.title || "",
    department: agent?.department || ""
  };
  if (user.digitalCard?.photoUrl) restoredExport.photoUrl = user.digitalCard.photoUrl;
  if (user.digitalCard?.logoUrl) restoredExport.logoUrl = user.digitalCard.logoUrl;
  if (agent?.photoUrl) restoredExport.photoUrl = agent.photoUrl;

  await prisma.digitalCard.update({
    where: { userId: USER_ID },
    data: {
      displayName: user.legalName || "전중희",
      titleSnapshot: agent?.title || null,
      departmentSnapshot: agent?.department || null,
      photoUrl: String(restoredExport.photoUrl || user.digitalCard?.photoUrl || "") || null,
      exportSnapshotJson: restoredExport
    }
  });

  await prisma.userDccAgentProfile.updateMany({
    where: { userId: USER_ID, isActive: true },
    data: { isActive: false }
  });
  await prisma.userDccAgentProfile.update({
    where: { id: AGENT_JEON },
    data: { isActive: true }
  });

  await prisma.businessCard.update({
    where: { id: MOBILE_ID },
    data: {
      displayName: user.legalName || "전중희",
      jobTitle: agent?.title || null,
      activeDccAgentProfileId: AGENT_JEON,
      dccSnapshotJson: restoredExport,
      lineShowcaseStyleJson: user.showcaseStyleJson ?? undefined,
      lineShowcaseLiveStyleJson: user.showcaseLiveStyleJson ?? undefined,
      lineShowcaseLiveSourceJson: user.showcaseLiveSourceJson ?? undefined,
      lineShowcaseUpdatedAt: user.showcaseStyleUpdatedAt || new Date()
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        restored: {
          digitalCardName: restoredExport.displayName,
          photo: Boolean(restoredExport.photoUrl),
          logo: Boolean(restoredExport.logoUrl),
          email: restoredExport.email,
          showcaseCopied: Boolean(user.showcaseLiveStyleJson || user.showcaseStyleJson)
        }
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
