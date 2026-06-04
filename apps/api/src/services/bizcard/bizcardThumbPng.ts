import sharp from "sharp";
import { buildClassicBizcardSvg, BIZCARD_ASPECT } from "./bizcardClassicSpec.js";
import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";

/** 카카오 OG — 명함 카드만 크롭된 PNG (1200×667 ≈ 90×50mm) */
export const THUMB_WIDTH = 1200;
export const THUMB_HEIGHT = Math.round(THUMB_WIDTH / BIZCARD_ASPECT);

export async function renderBizcardThumbPng(
  snapshot: BizcardClassicSnapshot,
  invalidated = false
): Promise<Buffer> {
  const svg = buildClassicBizcardSvg(snapshot, {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    invalidated
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
