/**
 * Electron Windows 설치 파일 → web/public/downloads (Vite 정적 배포용)
 * npm run electron:build:win 이후 실행하거나 web:build 전에 연동
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "apps/electron/dist/VLUE-Setup-1.0.0.exe");
const destDir = join(root, "web/public/downloads");
const dest = join(destDir, "VLUE-Setup-1.0.0.exe");

if (!existsSync(src)) {
  console.warn("[sync-pc-installer] 설치 파일 없음 — npm run electron:build:win 먼저 실행");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-pc-installer] OK → web/public/downloads/VLUE-Setup-1.0.0.exe`);
