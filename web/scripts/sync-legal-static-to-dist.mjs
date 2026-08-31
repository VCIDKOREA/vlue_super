/**
 * Vite public/ → dist/ 복사 보강 + 검증 (Railway 등에서 약관 정적 HTML 누락 방지)
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const publicDir = join(webRoot, "public");
const distDir = join(webRoot, "dist");
const LEGAL_DIRS = ["privacy", "terms", "data-deletion", "refund"];

const strict =
  process.env.REQUIRE_PC_INSTALLER === "1" || Boolean(process.env.RAILWAY_ENVIRONMENT);

function fail(message) {
  if (strict) {
    console.error(`[legal-static] FAIL: ${message}`);
    process.exit(1);
  }
  console.warn(`[legal-static] WARN: ${message}`);
}

if (!existsSync(distDir)) {
  fail(`dist missing: ${distDir}`);
}

for (const name of LEGAL_DIRS) {
  const src = join(publicDir, name, "index.html");
  const destDir = join(distDir, name);
  const dest = join(destDir, "index.html");
  if (!existsSync(src)) {
    fail(`source missing: ${src}`);
    continue;
  }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  if (!existsSync(dest)) {
    fail(`copy failed: ${dest}`);
  }
}

console.log(`[legal-static] OK → dist/{${LEGAL_DIRS.join(", ")}}/index.html`);
