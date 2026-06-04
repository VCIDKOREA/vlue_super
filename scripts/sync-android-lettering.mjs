/**
 * android-call-overlay → apps/android/app/src/main 병합 (소스 단일화)
 * 실행: node scripts/sync-android-lettering.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcRoot = path.join(root, "apps/android-call-overlay/app/src/main");
const destRoot = path.join(root, "apps/android/app/src/main");
const srcGradleApp = path.join(root, "apps/android-call-overlay/app/build.gradle.kts");
const destGradleApp = path.join(root, "apps/android/app/build.gradle.kts");

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    console.error("소스 없음:", from);
    process.exit(1);
  }
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from, { withFileTypes: true })) {
    const sf = path.join(from, name.name);
    const df = path.join(to, name.name);
    if (name.isDirectory()) {
      copyRecursive(sf, df);
    } else {
      fs.mkdirSync(path.dirname(df), { recursive: true });
      fs.copyFileSync(sf, df);
    }
  }
}

console.log("VLUE Android merge");
console.log("  from:", srcRoot);
console.log("  to:  ", destRoot);
if (fs.existsSync(destRoot)) {
  fs.rmSync(destRoot, { recursive: true, force: true });
}
copyRecursive(srcRoot, destRoot);
fs.mkdirSync(path.dirname(destGradleApp), { recursive: true });
fs.copyFileSync(srcGradleApp, destGradleApp);
console.log("  gradle:", destGradleApp);
console.log("OK — merge complete");
