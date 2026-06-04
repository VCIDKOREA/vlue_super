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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient();
const handle = process.argv[2] || "test_b2b";

const result = await prisma.user.updateMany({
  where: { publicHandle: handle },
  data: { role: "admin" }
});

const user = await prisma.user.findFirst({
  where: { publicHandle: handle },
  select: { publicHandle: true, role: true, legalName: true }
});

console.log(`updated rows: ${result.count}`);
console.log(user || "(user not found)");
await prisma.$disconnect();
