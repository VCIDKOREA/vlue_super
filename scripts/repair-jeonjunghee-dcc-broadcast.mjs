/**
 * 전중희 DCC 송출 오염 제거:
 * - business_cards.companyName "VLUE" → ""
 * - 라인 dccSnapshot 의 kftc/금융결제 로고 제거
 * - export titlePhotoUrl 이 프로필과 같거나 잔재면 비움
 *
 * node scripts/repair-jeonjunghee-dcc-broadcast.mjs
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

function snapObj(raw) {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
}

function isPollutedLogo(url) {
  return /kftc|금융결제|lettering-demo|vlue-shield/i.test(String(url || ""));
}

async function main() {
  const u = await prisma.user.findFirst({
    where: { OR: [{ publicHandle: "jeonjunghee" }, { legalName: "전중희" }] },
    select: {
      id: true,
      publicHandle: true,
      phoneE164: true,
      digitalCard: {
        select: {
          id: true,
          logoUrl: true,
          photoUrl: true,
          organization: true,
          exportSnapshotJson: true
        }
      }
    }
  });
  if (!u) throw new Error("전중희 없음");

  const cards = await prisma.businessCard.findMany({
    where: { userId: u.id },
    select: {
      id: true,
      phoneE164: true,
      companyName: true,
      dccSnapshotJson: true
    }
  });

  const cardFixes = [];
  for (const c of cards) {
    const snap = snapObj(c.dccSnapshotJson);
    let changed = false;
    const data = {};
    if (/^vlue$/i.test(String(c.companyName || "").trim())) {
      data.companyName = "";
      changed = true;
    }
    if (isPollutedLogo(snap.logoUrl)) {
      delete snap.logoUrl;
      changed = true;
      data.dccSnapshotJson = snap;
    }
    if (/^vlue$/i.test(String(snap.organization || snap.companyName || "").trim())) {
      snap.organization = "";
      snap.companyName = "";
      data.dccSnapshotJson = snap;
      changed = true;
    }
    if (changed) {
      await prisma.businessCard.update({ where: { id: c.id }, data });
      cardFixes.push({
        phone: c.phoneE164,
        companyNameCleared: "companyName" in data,
        logoCleared: Boolean(data.dccSnapshotJson)
      });
    }
  }

  let exportFix = null;
  const dc = u.digitalCard;
  if (dc) {
    const snap = snapObj(dc.exportSnapshotJson);
    const photo = String(dc.photoUrl || snap.photoUrl || "").trim();
    const title = String(snap.titlePhotoUrl || "").trim();
    const logo = String(dc.logoUrl || snap.logoUrl || "").trim();
    let dirty = false;
    /* 설정 UI에 타이틀 없음 — 서버에만 남은 타이틀(프로필 복제·잔재) 제거 */
    if (title) {
      snap.titlePhotoUrl = "";
      dirty = true;
    }
    if (isPollutedLogo(logo) || isPollutedLogo(snap.logoUrl)) {
      snap.logoUrl = "";
      snap.noCompanyLogo = true;
      dirty = true;
    }
    if (/^vlue$/i.test(String(snap.organization || snap.companyName || "").trim())) {
      snap.organization = "";
      snap.companyName = "";
      dirty = true;
    }
    if (dirty) {
      await prisma.digitalCard.update({
        where: { id: dc.id },
        data: {
          exportSnapshotJson: snap,
          logoUrl: isPollutedLogo(dc.logoUrl) ? "" : dc.logoUrl,
          organization:
            /^vlue$/i.test(String(dc.organization || "").trim()) ? "" : dc.organization
        }
      });
      exportFix = {
        titlePhotoCleared: !String(snap.titlePhotoUrl || "").trim(),
        logoCleared: !String(snap.logoUrl || "").trim(),
        orgCleared: !String(snap.organization || "").trim()
      };
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        handle: u.publicHandle,
        phone: u.phoneE164,
        cardFixes,
        exportFix
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
