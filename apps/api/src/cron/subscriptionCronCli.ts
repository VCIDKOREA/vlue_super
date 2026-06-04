/**
 * CLI: npx tsx apps/api/src/cron/subscriptionCronCli.ts [--asOf=YYYY-MM-DD] [--dry-run] [--overdue]
 */
import "../loadEnv.js";
import { prisma } from "../db/client.js";
import { runSubscriptionBillingBatch } from "./subscriptionScheduler.js";

const args = process.argv.slice(2);
let asOf: string | undefined;
let dryRun = false;
let includeOverdue = false;

for (const a of args) {
  if (a.startsWith("--asOf=")) asOf = a.slice("--asOf=".length);
  else if (a === "--dry-run" || a === "--dryRun") dryRun = true;
  else if (a === "--overdue") includeOverdue = true;
}

const asOfDate = asOf ? new Date(`${asOf}T12:00:00+09:00`) : new Date();

const summary = await runSubscriptionBillingBatch({
  asOf: asOfDate,
  dryRun,
  includeOverdue: includeOverdue || process.env.VLUE_SUBSCRIPTION_CRON_OVERDUE === "1"
});

console.log(JSON.stringify(summary, null, 2));
await prisma.$disconnect();
process.exit(summary.failed > 0 ? 1 : 0);
