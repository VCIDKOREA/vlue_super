/**
 * 실패한 마이그레이션 정리 후 prisma migrate deploy + generate
 *
 * 사용: npm run db:deploy:safe
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPkg = resolve(root, "packages", "db");

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || dbPkg,
    stdio: "inherit",
    shell: true,
    env: process.env
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

/** 이전에 실패 기록된 마이그레이션 — rolled-back 처리 후 재적용 */
const FAILED_MIGRATIONS_TO_RESET = ["20260521200000_vluer_grade_system"];

for (const name of FAILED_MIGRATIONS_TO_RESET) {
  console.log(`\n[migrate] resolve rolled-back (if failed): ${name}`);
  spawnSync("npx", ["prisma", "migrate", "resolve", "--rolled-back", name], {
    cwd: dbPkg,
    stdio: "inherit",
    shell: true,
    env: process.env
  });
}

run("npx", ["prisma", "migrate", "deploy"]);

const genScript = resolve(root, "scripts", "prisma-generate-safe.mjs");
const gen = spawnSync(process.execPath, [genScript], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});
if (gen.status !== 0) {
  console.warn("[migrate] prisma generate 실패 — API 중지 후 npm run db:generate:safe 재시도");
}

console.log("\n[migrate] deploy 완료");
