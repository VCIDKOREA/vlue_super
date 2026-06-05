import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const REF = "ywhjhdpecwvaujiagaln";

function loadPassword() {
  const p = resolve(root, "apps/api/.env");
  const text = readFileSync(p, "utf8");
  const m = text.match(/^DATABASE_URL="?([^"\n]+)"?/m);
  if (!m) throw new Error("no DATABASE_URL");
  const u = new URL(m[1].replace(/^postgresql:/, "http:"));
  return decodeURIComponent(u.password || "");
}

const password = loadPassword();
const prefixes = ["aws-0", "aws-1"];
const regions = ["ap-northeast-2", "ap-northeast-1", "ap-southeast-1", "us-east-1", "eu-west-1"];

for (const prefix of prefixes) {
  for (const region of regions) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const user = `postgres.${REF}`;
    const url = `postgresql://${user}:${encodeURIComponent(password)}@${host}:6543/postgres?pgbouncer=true`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      console.log("OK", host);
      process.exit(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("FAIL", host, msg.slice(0, 100));
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
console.log("No working pooler found");
process.exit(1);
