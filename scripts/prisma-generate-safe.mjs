/**
 * Windows EPERM (query_engine dll lock) 우회 — prisma generate
 * node scripts/prisma-generate-safe.mjs
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dbDir = path.join(root, "packages/db");
const clientDir = path.join(root, "node_modules", ".prisma", "client");

function cleanPrismaEngineTemps() {
  if (!fs.existsSync(clientDir)) return;
  try {
    for (const f of fs.readdirSync(clientDir)) {
      if (/query_engine.*\.tmp/i.test(f) || f.endsWith(".dll.node.tmp")) {
        try {
          fs.unlinkSync(path.join(clientDir, f));
          console.log("removed lock file:", f);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function main() {
  console.log("Prisma generate (safe) — cleaning temp engine files…");
  cleanPrismaEngineTemps();

  const result = spawnSync("npx", ["prisma", "generate"], {
    cwd: dbDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env }
  });

  if (result.status !== 0) {
    console.error("\nEPERM이 계속되면:");
    console.error("  1) Cursor에서 실행 중인 터미널(api:dev) 모두 종료");
    console.error("  2) 작업 관리자에서 node.exe 중 prisma 관련만 종료");
    console.error("  3) npm run db:generate:safe 재실행");
    process.exit(result.status ?? 1);
  }
  console.log("OK — prisma client generated");
}

main();
