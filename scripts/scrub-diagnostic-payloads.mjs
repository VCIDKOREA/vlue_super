/**
 * One-shot: shrink fat diagnostic_events payloads that caused Shared Pooler egress spike.
 * Run: cd apps/api && node --import dotenv/config ../../scripts/scrub-diagnostic-payloads.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const before = await prisma.$queryRawUnsafe(`
    SELECT
      count(*)::int AS n,
      coalesce(sum(octet_length(coalesce(payload_json::text,''))),0)::bigint AS payload_bytes
    FROM diagnostic_events
  `);
  const b = before[0];
  console.log(
    `[scrub-diag] before n=${Number(b.n)} payloadMB=${(Number(b.payload_bytes) / 1e6).toFixed(3)} apply=${APPLY}`
  );

  if (!APPLY) {
    console.log("[scrub-diag] dry-run only. Re-run with --apply to shrink rows.");
    return;
  }

  const updated = await prisma.$executeRawUnsafe(`
    UPDATE diagnostic_events
    SET payload_json = jsonb_build_object(
      '_truncated', true,
      'preview', left(payload_json::text, 2000)
    )
    WHERE payload_json IS NOT NULL
      AND octet_length(payload_json::text) > 4000
  `);
  console.log(`[scrub-diag] truncated payload rows ≈ ${updated}`);

  const stacks = await prisma.$executeRawUnsafe(`
    UPDATE diagnostic_events
    SET exception_stack = left(exception_stack, 800)
    WHERE exception_stack IS NOT NULL
      AND length(exception_stack) > 800
  `);
  console.log(`[scrub-diag] truncated stacks ≈ ${stacks}`);

  const after = await prisma.$queryRawUnsafe(`
    SELECT
      count(*)::int AS n,
      coalesce(sum(octet_length(coalesce(payload_json::text,''))),0)::bigint AS payload_bytes
    FROM diagnostic_events
  `);
  const a = after[0];
  console.log(
    `[scrub-diag] after n=${Number(a.n)} payloadMB=${(Number(a.payload_bytes) / 1e6).toFixed(3)}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
