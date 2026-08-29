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

async function main() {
  const user = await prisma.user.findFirst({
    where: { publicHandle: "jeonjunghee" },
    select: {
      legalName: true,
      digitalCard: { select: { exportSnapshotJson: true, displayName: true, photoUrl: true, logoUrl: true } },
      dccAgentProfiles: {
        select: { id: true, displayName: true, title: true, department: true, photoUrl: true, isActive: true }
      }
    }
  });
  const snap = user?.digitalCard?.exportSnapshotJson;
  console.log(
    JSON.stringify(
      {
        legalName: user?.legalName,
        digitalCardDisplay: user?.digitalCard?.displayName,
        export: snap,
        photoUrl: user?.digitalCard?.photoUrl,
        logoUrl: user?.digitalCard?.logoUrl,
        agents: user?.dccAgentProfiles
      },
      null,
      2
    )
  );
}

main()
  .finally(() => prisma.$disconnect());
