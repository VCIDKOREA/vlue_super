import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve("apps/api/.env") });
const prisma = new PrismaClient();

const u = await prisma.user.findFirst({
  where: {
    OR: [
      { legalName: "전중희" },
      { phoneE164: "+821063358746" },
      { publicHandle: "jeonjunghee" }
    ]
  },
  select: {
    id: true,
    legalName: true,
    phoneE164: true,
    publicHandle: true,
    digitalCard: {
      select: { photoUrl: true, exportSnapshotJson: true, displayName: true }
    }
  }
});

if (!u) {
  console.log("NOT FOUND");
  await prisma.$disconnect();
  process.exit(0);
}

const snap = u.digitalCard?.exportSnapshotJson;
const snapPhoto = snap && typeof snap === "object" ? snap.photoUrl : null;
const snapLogo = snap && typeof snap === "object" ? snap.logoUrl : null;
const col = String(u.digitalCard?.photoUrl || "");
const sp = String(snapPhoto || "");

console.log(
  JSON.stringify(
    {
      id: u.id,
      name: u.legalName,
      phone: u.phoneE164,
      handle: u.publicHandle,
      columnPhotoPreview: col ? col.slice(0, 140) : null,
      columnPhotoLen: col.length,
      columnIsHttp: /^https?:\/\//i.test(col),
      columnIsData: /^data:/i.test(col),
      columnStartsSlash: col.startsWith("/"),
      snapPhotoPreview: sp ? sp.slice(0, 140) : null,
      snapPhotoLen: sp.length,
      snapIsHttp: /^https?:\/\//i.test(sp),
      snapIsData: /^data:/i.test(sp),
      snapLogoPreview: snapLogo ? String(snapLogo).slice(0, 100) : null,
      mediaKeys:
        snap && typeof snap === "object"
          ? Object.keys(snap).filter((k) => /photo|logo|image|avatar/i.test(k))
          : []
    },
    null,
    2
  )
);

await prisma.$disconnect();
