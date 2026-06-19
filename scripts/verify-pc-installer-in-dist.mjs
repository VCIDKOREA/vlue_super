/**
 * Vite 빌드 후 dist/downloads 에 Windows 설치 파일이 포함됐는지 검증
 * REQUIRE_PC_INSTALLER=1 또는 Railway 환경에서만 실패(exit 1)
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "..", "web/dist/downloads/VLUE-Setup-1.0.0.exe");
const MIN_BYTES = 5_000_000;

const strict =
  process.env.REQUIRE_PC_INSTALLER === "1" || Boolean(process.env.RAILWAY_ENVIRONMENT);

function fail(message) {
  if (strict) {
    console.error(`[verify-pc-installer] FAIL: ${message}`);
    process.exit(1);
  }
  console.warn(`[verify-pc-installer] SKIP (non-strict): ${message}`);
}

if (!existsSync(dest)) {
  fail(`missing ${dest}`);
  process.exit(0);
}

const size = statSync(dest).size;
if (size < MIN_BYTES) {
  fail(`file too small (${size} bytes)`);
  process.exit(0);
}

console.log(`[verify-pc-installer] OK → ${dest} (${size} bytes)`);
