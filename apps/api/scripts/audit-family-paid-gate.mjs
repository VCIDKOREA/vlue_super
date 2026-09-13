/**
 * 유료인데 가족보호 게이트가 막히는 회원 전수 점검.
 * Usage (apps/api): node --env-file=.env scripts/audit-family-paid-gate.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PAID_SNAPS = new Set(["paid", "standard", "premium", "b2b"]);

function oldGateOk(u) {
  const snap = String(u.digitalCard?.membershipTierSnapshot || "").toLowerCase();
  if (PAID_SNAPS.has(snap)) return true;
  if ((u.subscriptions || []).length > 0) return true;
  return false;
}

function newGateOk(u) {
  if (oldGateOk(u)) return true;
  return (u.b2bEnterprisesAdministered || []).length > 0;
}

async function main() {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      legalName: true,
      phoneE164: true,
      publicHandle: true,
      digitalCard: { select: { membershipTierSnapshot: true, displayName: true } },
      subscriptions: {
        where: { status: "active", cycleEndAt: { gt: now } },
        select: { id: true },
        take: 1
      },
      b2bEnterprisesAdministered: {
        where: { status: { in: ["draft", "active"] } },
        select: { id: true },
        take: 1
      }
    }
  });

  const paidLike = [];
  const falseNegatives = [];
  for (const u of users) {
    const snap = String(u.digitalCard?.membershipTierSnapshot || "").toLowerCase();
    const hasSub = (u.subscriptions || []).length > 0;
    const hasB2b = (u.b2bEnterprisesAdministered || []).length > 0;
    const looksPaid = PAID_SNAPS.has(snap) || hasSub || hasB2b;
    if (!looksPaid) continue;
    const row = {
      id: u.id,
      legalName: u.legalName,
      displayName: u.digitalCard?.displayName,
      phone: u.phoneE164,
      handle: u.publicHandle,
      snap: snap || null,
      hasSub,
      hasB2b,
      oldGate: oldGateOk(u),
      newGate: newGateOk(u)
    };
    paidLike.push(row);
    if (row.newGate && !row.oldGate) falseNegatives.push(row);
  }

  console.log(`ACTIVE users: ${users.length}`);
  console.log(`Paid-like (snap/sub/b2b): ${paidLike.length}`);
  console.log(`Fixed by aligning to isSelfPaidMember (old fail, new pass): ${falseNegatives.length}`);
  for (const row of falseNegatives.slice(0, 80)) {
    console.log(JSON.stringify(row));
  }

  const byName = paidLike.filter((u) => {
    const blob = `${u.legalName || ""} ${u.displayName || ""} ${u.handle || ""}`;
    return blob.includes("김광덕") || /zazajin|2000.?6466|6466/i.test(blob + (u.phone || ""));
  });
  console.log(`김광덕 / related matches: ${byName.length}`);
  for (const row of byName) console.log(JSON.stringify(row));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
