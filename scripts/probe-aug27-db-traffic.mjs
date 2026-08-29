/**
 * Aug 26–28 DB activity probe (Supabase via Prisma).
 * node scripts/probe-aug27-db-traffic.mjs
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const rel of [".env", "packages/db/.env", "apps/api/.env"]) {
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

function dayRange(ymd) {
  const start = new Date(`${ymd}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function safeCount(label, fn) {
  try {
    const n = await fn();
    console.log(`${label}: ${n}`);
    return n;
  } catch (e) {
    console.log(`${label}: ERR ${String(e.message || e).split("\n")[0]}`);
    return null;
  }
}

async function main() {
  const days = ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"];
  for (const d of days) {
    const { start, end } = dayRange(d);
    console.log(`\n=== ${d} KST ===`);
    await safeCount("user.createdAt", () =>
      prisma.user.count({ where: { createdAt: { gte: start, lt: end } } })
    );
    await safeCount("businessCard.createdAt", () =>
      prisma.businessCard.count({ where: { createdAt: { gte: start, lt: end } } })
    );
    await safeCount("digitalCard.updatedAt", () =>
      prisma.digitalCard.count({ where: { updatedAt: { gte: start, lt: end } } })
    );
    await safeCount("callHistory.createdAt", () =>
      prisma.callHistory.count({ where: { createdAt: { gte: start, lt: end } } })
    );
    await safeCount("notification.createdAt", () =>
      prisma.notification.count({ where: { createdAt: { gte: start, lt: end } } })
    );
    await safeCount("pushToken.updatedAt", () =>
      prisma.pushToken.count({ where: { updatedAt: { gte: start, lt: end } } })
    );
    await safeCount("fcmToken.updatedAt", () =>
      prisma.fcmToken.count({ where: { updatedAt: { gte: start, lt: end } } })
    );
    await safeCount("session.createdAt", () =>
      prisma.session.count({ where: { createdAt: { gte: start, lt: end } } })
    );
    await safeCount("auditLog.createdAt", () =>
      prisma.auditLog.count({ where: { createdAt: { gte: start, lt: end } } })
    );
  }

  /* Hot tables / possible loops */
  console.log("\n=== recent callHistory phones (48h) ===");
  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000);
    const rows = await prisma.callHistory.groupBy({
      by: ["peerPhoneE164"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { peerPhoneE164: "desc" } },
      take: 15
    });
    for (const r of rows) {
      console.log(`${r._count._all}\t${r.peerPhoneE164}`);
    }
  } catch (e) {
    console.log("callHistory groupBy ERR", String(e.message || e).split("\n")[0]);
  }

  console.log("\n=== seulgi / ceo / jeonjunghee users ===");
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { publicHandle: { in: ["seulgi1", "ceo", "jeonjunghee", "sangchoon1"] } },
        { legalName: { in: ["이슬기", "이종근", "전중희", "이상춘"] } }
      ]
    },
    select: {
      legalName: true,
      publicHandle: true,
      phoneE164: true,
      identityVerified: true,
      email: true,
      digitalCard: {
        select: {
          displayName: true,
          organization: true,
          email: true,
          photoUrl: true,
          exportSnapshotJson: true
        }
      }
    }
  });
  for (const u of users) {
    const snap =
      u.digitalCard?.exportSnapshotJson &&
      typeof u.digitalCard.exportSnapshotJson === "object"
        ? u.digitalCard.exportSnapshotJson
        : {};
    console.log(
      JSON.stringify({
        name: u.legalName,
        handle: u.publicHandle,
        phone: u.phoneE164,
        verified: u.identityVerified,
        org: u.digitalCard?.organization || null,
        email: u.digitalCard?.email || u.email || null,
        photo: Boolean(u.digitalCard?.photoUrl),
        snapKeys: Object.keys(snap || {}).slice(0, 12)
      })
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
