/**
 * Electron 패키징 사전 검증
 * 1) web/dist 존재 확인  2) 아이콘 PNG 생성
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const indexHtml = join(root, "web/dist/index.html");

if (!existsSync(indexHtml)) {
  console.error("[electron-pack] web/dist/index.html 없음 — 먼저 npm run web:build:electron 실행");
  process.exit(1);
}

const iconScript = join(root, "scripts/prepare-electron-icons.mjs");
spawnSync(process.execPath, [iconScript], { stdio: "inherit", cwd: root });

console.log("[electron-pack] web/dist OK — electron-builder 실행 준비 완료");
