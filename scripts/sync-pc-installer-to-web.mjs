/**
 * Electron Windows 설치 파일 → web/public/downloads (Vite 정적 배포용)
 * npm run electron:build:win 이후 실행하거나 web:build 전에 연동
 * Railway: VLUE_PC_INSTALLER_URL 환경 변수로 원격 .exe 다운로드 가능
 */
import { copyFileSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";
import { get as httpGet } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "apps/electron/dist/VLUE-Setup-1.0.0.exe");
const destDir = join(root, "web/public/downloads");
const dest = join(destDir, "VLUE-Setup-1.0.0.exe");

function downloadFile(url, outPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? get : httpGet;
    client(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, outPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`download failed: HTTP ${res.statusCode}`));
        return;
      }
      const file = createWriteStream(outPath);
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  mkdirSync(destDir, { recursive: true });

  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log("[sync-pc-installer] OK → web/public/downloads/VLUE-Setup-1.0.0.exe");
    return;
  }

  const remote = String(process.env.VLUE_PC_INSTALLER_URL || "").trim();
  if (remote.startsWith("http")) {
    await downloadFile(remote, dest);
    console.log(`[sync-pc-installer] OK (remote) → ${dest}`);
    return;
  }

  console.warn("[sync-pc-installer] 설치 파일 없음 — npm run electron:build:win 또는 VLUE_PC_INSTALLER_URL 설정");
}

main().catch((e) => {
  console.error("[sync-pc-installer]", e.message || e);
  process.exit(1);
});
