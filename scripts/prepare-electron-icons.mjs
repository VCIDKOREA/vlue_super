/**
 * VLUE Electron 패키징용 PNG 아이콘 생성 (선택)
 * web/public/favicon.svg → apps/electron/build/icons/icon.png
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "apps/electron/build/icons");
const iconPng = join(iconsDir, "icon.png");
const faviconSvg = join(root, "web/public/favicon.svg");

async function main() {
  mkdirSync(iconsDir, { recursive: true });

  if (existsSync(iconPng)) {
    console.log("[electron-icons] icon.png already exists — skip");
    return;
  }

  if (!existsSync(faviconSvg)) {
    console.warn("[electron-icons] favicon.svg not found — skip (Electron default icon)");
    return;
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    try {
      const sharpPath = join(root, "web/node_modules/sharp/lib/index.js");
      sharp = (await import(sharpPath)).default;
    } catch {
      console.warn("[electron-icons] sharp not available — skip icon.png generation");
      return;
    }
  }

  await sharp(faviconSvg).resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(iconPng);
  console.log("[electron-icons] created", iconPng);
}

main().catch((err) => {
  console.warn("[electron-icons]", err.message || err);
  process.exit(0);
});
