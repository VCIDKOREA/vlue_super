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

const p = new PrismaClient();

async function main() {
  const rows = await p.$queryRawUnsafe(`
    SELECT legal_name, public_handle, phone_e164, identity_verified,
      (showcase_live_style_json->>'includeDigitalCard') AS live_idc,
      (showcase_style_json->>'includeDigitalCard') AS ed_idc,
      length(coalesce(showcase_live_style_json::text,'')) AS live_len,
      length(coalesce(showcase_style_json::text,'')) AS ed_len
    FROM users
    WHERE public_handle IN ('seulgi1','ceo','jeonjunghee','sangchoon1')
       OR legal_name IN ('이슬기','이종근','전중희','이상춘')
  `);
  console.log("users", JSON.stringify(rows, null, 2));

  const dc = await p.$queryRawUnsafe(`
    SELECT u.legal_name, u.public_handle, d.organization,
      (d.logo_url IS NOT NULL AND length(trim(d.logo_url))>0) AS has_logo,
      (d.photo_url IS NOT NULL AND length(trim(d.photo_url))>0) AS has_photo,
      d.display_name
    FROM digital_cards d
    JOIN users u ON u.id = d.user_id
    WHERE u.public_handle IN ('seulgi1','ceo','jeonjunghee','sangchoon1')
       OR u.legal_name IN ('이슬기','이종근','전중희','이상춘')
  `);
  console.log("cards", JSON.stringify(dc, null, 2));

  const traffic = await p.$queryRawUnsafe(`
    SELECT (updated_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*)::int AS n
    FROM digital_cards
    WHERE updated_at > now() - interval '6 days'
    GROUP BY 1 ORDER BY 1
  `);
  console.log("digital_cards updates by day", traffic);

  const pg = await p.$queryRawUnsafe(`
    SELECT relname, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
    FROM pg_stat_user_tables
    ORDER BY (n_tup_upd + n_tup_ins) DESC
    LIMIT 25
  `);
  console.log("pg_stat top", pg);

  const calls = await p.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name ILIKE '%call%'
  `);
  console.log("call-like tables", calls);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
