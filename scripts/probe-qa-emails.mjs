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
const p = new PrismaClient();
const rows = await p.$queryRawUnsafe(`
  SELECT u.legal_name, u.public_handle, u.email AS user_email,
    (u.email IS NOT NULL AND length(trim(u.email))>0) AS has_user_email,
    d.organization, d.photo_url, d.logo_url, d.display_name
  FROM users u
  LEFT JOIN digital_cards d ON d.user_id = u.id
  WHERE u.public_handle IN ('seulgi1','ceo','jeonjunghee','sangchoon1')
`);
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
