/**
 * VLUE Electron 패키징용 아이콘 생성
 * vlue-shield-eye-logo.svg → icon.png + icon.ico
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "apps/electron/build/icons");
const iconPng = join(iconsDir, "icon.png");
const iconIco = join(iconsDir, "icon.ico");
const logoSvg = join(root, "web/src/assets/vlue-shield-eye-logo.svg");
const faviconSvg = join(root, "web/public/favicon.svg");

/** Windows Vista+ PNG-in-ICO (multi-size) */
function createIcoFromPngs(entries) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * entries.length;
  const parts = [];

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  parts.push(header);

  for (const { size, png } of entries) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    parts.push(entry);
    offset += png.length;
  }

  for (const { png } of entries) {
    parts.push(png);
  }

  return Buffer.concat(parts);
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    const sharpPath = join(root, "web/node_modules/sharp/lib/index.js");
    return (await import(sharpPath)).default;
  }
}

async function main() {
  mkdirSync(iconsDir, { recursive: true });

  const svgPath = existsSync(logoSvg) ? logoSvg : existsSync(faviconSvg) ? faviconSvg : null;
  if (!svgPath) {
    console.warn("[electron-icons] eye logo SVG not found — skip");
    return;
  }

  let sharp;
  try {
    sharp = await loadSharp();
  } catch {
    console.warn("[electron-icons] sharp not available — skip icon generation");
    return;
  }

  const renderPng = async (size) => {
    const buf = await sharp(svgPath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return buf;
  };

  await renderPng(512).then((buf) => writeFileSync(iconPng, buf));
  console.log("[electron-icons] wrote", iconPng);

  const icoSizes = [256, 48, 32, 16];
  const icoEntries = await Promise.all(
    icoSizes.map(async (size) => ({ size, png: await renderPng(size) }))
  );
  writeFileSync(iconIco, createIcoFromPngs(icoEntries));
  console.log("[electron-icons] wrote", iconIco);
}

main().catch((err) => {
  console.warn("[electron-icons]", err.message || err);
  process.exit(0);
});
