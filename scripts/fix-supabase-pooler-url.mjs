/**
 * 로컬 Prisma — db.*.supabase.co:5432 (IPv6-only) 연결 실패 시
 * Transaction pooler(6543) URL로 DATABASE_URL 갱신. DIRECT_URL 은 session pooler(5432).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const REF = "ywhjhdpecwvaujiagaln";
/** Supabase 대시보드 pooler 호스트와 동일해야 함 (ywhj = aws-1-ap-northeast-2) */
const POOLER_PREFIX = process.env.VLUE_POOLER_PREFIX || "aws-1";
const REGION = process.env.VLUE_POOLER_REGION || "ap-northeast-2";

const ENV_PATHS = [
  resolve(root, ".env"),
  resolve(root, "apps/api/.env"),
  resolve(root, "packages/db/.env")
];

function parsePg(url) {
  const raw = String(url || "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  try {
    const u = new URL(raw.replace(/^postgresql:/, "http:"));
    return { password: decodeURIComponent(u.password || ""), database: u.pathname?.slice(1) || "postgres" };
  } catch {
    return null;
  }
}

function buildPoolerUrls(password, database = "postgres") {
  const enc = encodeURIComponent(password);
  const user = `postgres.${REF}`;
  const host = `${POOLER_PREFIX}-${REGION}.pooler.supabase.com`;
  const databaseUrl = `postgresql://${user}:${enc}@${host}:6543/${database}?pgbouncer=true`;
  const directUrl = `postgresql://${user}:${enc}@${host}:5432/${database}`;
  return { databaseUrl, directUrl };
}

function upsertEnv(content, databaseUrl, directUrl) {
  const lines = content.split(/\r?\n/);
  let hasDb = false;
  let hasDirect = false;
  const out = lines.map((line) => {
    if (/^DATABASE_URL=/.test(line)) {
      hasDb = true;
      return `DATABASE_URL="${databaseUrl}"`;
    }
    if (/^DIRECT_URL=/.test(line)) {
      hasDirect = true;
      return `DIRECT_URL="${directUrl}"`;
    }
    return line;
  });
  if (!hasDb) out.push(`DATABASE_URL="${databaseUrl}"`);
  if (!hasDirect) out.push(`DIRECT_URL="${directUrl}"`);
  return `${out.join("\n").replace(/\n*$/, "")}\n`;
}

let source = null;
for (const p of ENV_PATHS) {
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  const m = text.match(/^DATABASE_URL=(.+)$/m);
  if (m) {
    source = parsePg(m[1]);
    if (source?.password) break;
  }
}

if (!source?.password) {
  console.error("[fix-supabase-pooler] DATABASE_URL with password not found in .env files");
  process.exit(1);
}

const { databaseUrl, directUrl } = buildPoolerUrls(source.password, source.database);

for (const p of ENV_PATHS) {
  if (!existsSync(p)) continue;
  const next = upsertEnv(readFileSync(p, "utf8"), databaseUrl, directUrl);
  writeFileSync(p, next, "utf8");
  console.log("[fix-supabase-pooler] updated", p.replace(root, "."));
}

console.log("[fix-supabase-pooler] host → " + POOLER_PREFIX + "-" + REGION + ".pooler.supabase.com:6543");
console.log("[fix-supabase-pooler] Restart: npm run api:dev");
