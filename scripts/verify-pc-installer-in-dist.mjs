/**
 * Vite 빌드 후 dist/downloads 에 Windows 설치 파일이 포함됐는지 검증
 * public/downloads 에 있으면 dist 로 복사 후 검증
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicInstaller = join(root, "web/public/downloads/VLUE-Setup-1.0.0.exe");
const dest = join(root, "web/dist/downloads/VLUE-Setup-1.0.0.exe");
const MIN_BYTES = 5_000_000;

const strict =
  process.env.REQUIRE_PC_INSTALLER === "1" || Boolean(process.env.RAILWAY_ENVIRONMENT);

function fail(message) {
  if (strict) {
    console.error(`[verify-pc-installer] FAIL: ${message}`);
    process.exit(1);
  }
  console.warn(`[verify-pc-installer] SKIP (non-strict): ${message}`);
  process.exit(0);
}

if (!existsSync(dest) && existsSync(publicInstaller)) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(publicInstaller, dest);
  console.log(`[verify-pc-installer] copied public → dist`);
}

if (!existsSync(dest)) {
  fail(`missing ${dest}`);
}

const size = statSync(dest).size;
if (size < MIN_BYTES) {
  fail(`file too small (${size} bytes)`);
}

console.log(`[verify-pc-installer] OK → ${dest} (${size} bytes)`);
