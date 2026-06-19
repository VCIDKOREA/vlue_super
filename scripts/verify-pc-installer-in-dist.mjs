/**
 * Vite 빌드 후 dist/downloads 에 Windows 설치 파일 강제 동기화·검증
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicInstaller = join(root, "web/public/downloads/VLUE-Setup-1.0.0.exe");
const dest = join(root, "web/dist/downloads/VLUE-Setup-1.0.0.exe");
const MIN_BYTES = 5_000_000;

const strict =
  process.env.REQUIRE_PC_INSTALLER === "1" || Boolean(process.env.RAILWAY_ENVIRONMENT);

function isElectronPackBuild() {
  return String(process.env.VITE_ELECTRON_PACK || "").trim() === "1";
}

function isValidPe(path) {
  if (!existsSync(path)) return false;
  if (statSync(path).size < MIN_BYTES) return false;
  const head = readFileSync(path).subarray(0, 2);
  return head[0] === 0x4d && head[1] === 0x5a;
}

function fail(message) {
  if (strict) {
    console.error(`[verify-pc-installer] FAIL: ${message}`);
    process.exit(1);
  }
  console.warn(`[verify-pc-installer] SKIP (non-strict): ${message}`);
  process.exit(0);
}

if (isElectronPackBuild()) {
  console.log("[verify-pc-installer] SKIP (VITE_ELECTRON_PACK=1 — Electron web/dist 검증 생략)");
  process.exit(0);
}

if (!isValidPe(publicInstaller)) {
  fail(`invalid or missing public installer: ${publicInstaller}`);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(publicInstaller, dest);

if (!isValidPe(dest)) {
  fail(`dist copy failed or invalid PE: ${dest}`);
}

const size = statSync(dest).size;
console.log(`[verify-pc-installer] OK → ${dest} (${size} bytes, forced public→dist)`);
