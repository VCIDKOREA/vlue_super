/**
 * VLUE Electron 패키징용 아이콘 생성
 * vlue-shield-eye-logo.svg → icon.png + icon.ico (BMP DIB, rcedit/NSIS 호환)
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

/** @param {{ size: number, rgba: Buffer, width: number, height: number }[]} images */
function buildStandardIco(images) {
  const count = images.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const entries = [];

  for (const { size, rgba, width, height } of images) {
    const maskRowBytes = Math.ceil(width / 32) * 4;
    const andMaskSize = maskRowBytes * height;
    const xorSize = width * height * 4;
    const dibSize = 40 + xorSize + andMaskSize;
    const body = Buffer.alloc(dibSize);
    body.writeUInt32LE(40, 0);
    body.writeInt32LE(width, 4);
    body.writeInt32LE(height * 2, 8);
    body.writeUInt16LE(1, 12);
    body.writeUInt16LE(32, 14);
    body.writeUInt32LE(0, 16);
    body.writeUInt32LE(xorSize, 20);
    let o = 40;

    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        body[o++] = rgba[i + 2];
        body[o++] = rgba[i + 1];
        body[o++] = rgba[i];
        body[o++] = rgba[i + 3];
      }
    }

    entries.push({ size, dibSize, offset, body });
    offset += dibSize;
  }

  const out = Buffer.alloc(offset);
  let p = 0;
  out.writeUInt16LE(0, p);
  p += 2;
  out.writeUInt16LE(1, p);
  p += 2;
  out.writeUInt16LE(count, p);
  p += 2;

  for (const e of entries) {
    out.writeUInt8(e.size >= 256 ? 0 : e.size, p);
    p += 1;
    out.writeUInt8(e.size >= 256 ? 0 : e.size, p);
    p += 1;
    out.writeUInt8(0, p);
    p += 2;
    out.writeUInt16LE(1, p);
    p += 2;
    out.writeUInt16LE(32, p);
    p += 2;
    out.writeUInt32LE(e.dibSize, p);
    p += 4;
    out.writeUInt32LE(e.offset, p);
    p += 4;
  }

  for (const e of entries) {
    e.body.copy(out, e.offset);
  }

  return out;
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

  const renderRgba = async (size) => {
    const { data, info } = await sharp(svgPath)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { rgba: data, width: info.width, height: info.height, size };
  };

  const png512 = await sharp(svgPath)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  writeFileSync(iconPng, png512);
  console.log("[electron-icons] wrote", iconPng);

  const icoSizes = [256, 128, 64, 48, 32, 16];
  const images = await Promise.all(icoSizes.map((size) => renderRgba(size)));
  writeFileSync(iconIco, buildStandardIco(images));
  console.log("[electron-icons] wrote", iconIco);
}

main().catch((err) => {
  console.warn("[electron-icons]", err.message || err);
  process.exit(0);
});
