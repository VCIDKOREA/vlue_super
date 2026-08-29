import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const u = await p.user.findFirst({
  where: { OR: [{ publicHandle: "ceo" }, { phoneE164: "+821080144666" }] },
  include: { digitalCard: true, businessProfile: true }
});
const snap = u?.digitalCard?.exportSnapshotJson;
const snapObj = snap && typeof snap === "object" ? snap : {};
console.log(
  JSON.stringify(
    {
      hasUser: Boolean(u),
      emailSet: Boolean(u?.email),
      emailLen: String(u?.email || "").length,
      handle: u?.publicHandle,
      companySet: Boolean(u?.businessProfile?.companyName),
      companyLen: String(u?.businessProfile?.companyName || "").length,
      snapEmailSet: Boolean(snapObj.email),
      snapWebsiteSet: Boolean(snapObj.website),
      snapOrgSet: Boolean(snapObj.organization || snapObj.companyName),
      snapKeys: Object.keys(snapObj).slice(0, 40)
    },
    null,
    2
  )
);
await p.$disconnect();
