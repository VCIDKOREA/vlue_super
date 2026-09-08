import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve("apps/api/.env") });
const prisma = new PrismaClient();

const u = await prisma.user.findFirst({
  where: { phoneE164: "+821063358746" },
  select: {
    digitalCard: { select: { photoUrl: true, exportSnapshotJson: true } }
  }
});

const col = String(u?.digitalCard?.photoUrl || "");
const snap = u?.digitalCard?.exportSnapshotJson;
const snapObj = snap && typeof snap === "object" ? snap : {};
const sp = String(snapObj.photoUrl || "");
const title = String(snapObj.titlePhotoUrl || "");

console.log("FULL_COLUMN=", col);
console.log("FULL_SNAP=", sp);
console.log("TITLE=", title);
console.log("noProfilePhoto=", snapObj.noProfilePhoto);

for (const [label, url] of [
  ["column", col],
  ["snap", sp],
  ["title", title]
]) {
  if (!url) continue;
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log(label, "status", res.status, "ctype", res.headers.get("content-type"));
  } catch (e) {
    console.log(label, "fetch error", e.message);
  }
}

await prisma.$disconnect();
