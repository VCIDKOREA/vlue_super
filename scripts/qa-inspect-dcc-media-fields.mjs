/**
 * QA: DCC organization / logo / titlePhoto fields only (no tokens).
 * node scripts/qa-inspect-dcc-media-fields.mjs
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();

function brief(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/금융결제|kftc|fss|vlue-shield|lettering-demo/i.test(s)) {
    return `[FLAGGED] ${s.slice(0, 100)}`;
  }
  return s.length > 90 ? `${s.slice(0, 70)}…(${s.length})` : s;
}

function snapFields(snap) {
  if (!snap || typeof snap !== "object") return null;
  return {
    organization: snap.organization || snap.companyName || "",
    name: snap.name || snap.displayName || "",
    logoUrl: brief(snap.logoUrl),
    photoUrl: brief(snap.photoUrl),
    titlePhotoUrl: brief(snap.titlePhotoUrl),
    noTitlePhoto: Boolean(snap.noTitlePhoto),
    noCompanyLogo: Boolean(snap.noCompanyLogo)
  };
}

async function main() {
  for (const handle of ["jeonjunghee", "sangchoon1"]) {
    const u = await prisma.user.findFirst({
      where: { publicHandle: handle },
      select: {
        publicHandle: true,
        legalName: true,
        digitalCard: {
          select: {
            displayName: true,
            organization: true,
            logoUrl: true,
            photoUrl: true,
            exportSnapshotJson: true
          }
        }
      }
    });
    console.log(`=== ${handle} ===`);
    if (!u) {
      console.log("missing");
      continue;
    }
    console.log(
      JSON.stringify(
        {
          legalName: u.legalName,
          card: {
            organization: u.digitalCard?.organization || "",
            logoUrl: brief(u.digitalCard?.logoUrl),
            photoUrl: brief(u.digitalCard?.photoUrl)
          },
          export: snapFields(u.digitalCard?.exportSnapshotJson)
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
