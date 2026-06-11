/**
 * 드래그 영역 내 OCR 텍스트 추출 (부분 번역용)
 */

export function normalizeRect(a, b) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x1, y1, x2, y2 };
}

function boxIntersectsRect(box, rect) {
  const bx2 = box.x + box.w;
  const by2 = box.y + box.h;
  return !(bx2 < rect.x1 || box.x > rect.x2 || by2 < rect.y1 || box.y > rect.y2);
}

function overlapArea(box, rect) {
  const x1 = Math.max(box.x, rect.x1);
  const y1 = Math.max(box.y, rect.y1);
  const x2 = Math.min(box.x + box.w, rect.x2);
  const y2 = Math.min(box.y + box.h, rect.y2);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  return w * h;
}

/**
 * @param {Array<{ text: string, box: { x,y,w,h } }>} blocks
 * @param {{ x1,y1,x2,y2 }} rect — 0~100 퍼센트 좌표
 */
export function extractBlocksInRect(blocks, rect) {
  if (!blocks?.length || !rect) return "";
  const minArea = 0.05;
  const hits = blocks
    .filter((b) => boxIntersectsRect(b.box, rect))
    .map((b) => ({ block: b, area: overlapArea(b.box, rect) }))
    .filter((x) => x.area >= minArea)
    .sort((a, b) => a.block.box.y - b.block.box.y || a.block.box.x - b.block.box.x);

  return hits
    .map((x) => x.block.text)
    .join("\n")
    .trim();
}

export function pointerToPercent(container, clientX, clientY) {
  const r = container.getBoundingClientRect();
  if (!r.width || !r.height) return { x: 0, y: 0 };
  return {
    x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)),
    y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100))
  };
}

export function rectLargeEnough(rect, minSize = 2) {
  return Math.abs(rect.x2 - rect.x1) >= minSize && Math.abs(rect.y2 - rect.y1) >= minSize;
}
