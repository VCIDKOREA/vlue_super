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
async function main() {
  for (const [label, sql] of [
    [
      "diagnostic_events",
      `SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*)::int AS n
       FROM diagnostic_events WHERE created_at > now() - interval '6 days' GROUP BY 1 ORDER BY 1`
    ],
    [
      "family_ward_presence",
      `SELECT (updated_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*)::int AS n
       FROM family_ward_presence WHERE updated_at > now() - interval '6 days' GROUP BY 1 ORDER BY 1`
    ],
    [
      "diagnostic_sessions_upd",
      `SELECT (updated_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*)::int AS n
       FROM diagnostic_sessions WHERE updated_at > now() - interval '6 days' GROUP BY 1 ORDER BY 1`
    ],
    [
      "line_call_events",
      `SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*)::int AS n
       FROM line_call_events WHERE created_at > now() - interval '6 days' GROUP BY 1 ORDER BY 1`
    ]
  ]) {
    const rows = await p.$queryRawUnsafe(sql);
    console.log(label, rows);
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
