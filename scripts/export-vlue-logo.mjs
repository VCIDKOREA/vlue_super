/**
 * VLUE 눈(브랜드) 로고 → 128×128 PNG (앱과 동일 SVG 소스: src/assets/vlue-shield-logo.svg)
 *
 * Sharp(librsvg)는 브라우저(Skia)와 안티앨리어싱이 다를 수 있어,
 * 높은 DPI로 래스터화한 뒤 128px로 축소합니다.
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "src", "assets", "vlue-shield-logo.svg");
const outPath = join(root, "vlue-logo-128.png");

const svg = readFileSync(svgPath);

await sharp(svg, {
  density: 384
})
  .resize(128, 128, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3
  })
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log("Written:", outPath);
