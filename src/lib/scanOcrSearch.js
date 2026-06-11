/**
 * OCR 블록 정규화 및 Ctrl+F 검색·포커싱
 * @typedef {{ id: string, text: string, box: { x: number, y: number, w: number, h: number } }} OcrBlock
 */

export function linesToBlocks(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const n = Math.max(lines.length, 1);
  const lineH = 90 / n;
  return lines.map((lineText, i) => ({
    id: `line-${i}`,
    text: lineText,
    box: { x: 4, y: 5 + i * lineH, w: 92, h: lineH * 0.85 }
  }));
}

export function normalizeOcrBlocks(raw) {
  if (!raw) return { text: "", blocks: [] };
  if (typeof raw === "string") {
    const t = raw.trim();
    return { text: t, blocks: linesToBlocks(t) };
  }
  const text = String(raw.text || "").trim();
  const blocks = Array.isArray(raw.blocks) && raw.blocks.length
    ? raw.blocks
        .map((b, i) => ({
          id: b.id || `block-${i}`,
          text: String(b.text || "").trim(),
          box: {
            x: Number(b.box?.x ?? 0),
            y: Number(b.box?.y ?? 0),
            w: Number(b.box?.w ?? 10),
            h: Number(b.box?.h ?? 4)
          }
        }))
        .filter((b) => b.text)
    : linesToBlocks(text);
  return { text, blocks };
}

/**
 * @param {OcrBlock[]} blocks
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [options]
 */
export function searchOcrBlocks(blocks, query, options = {}) {
  const q = String(query || "").trim();
  if (!q || !blocks?.length) {
    return { matches: [], total: 0, query: q, focusIndex: -1 };
  }
  const caseSensitive = options.caseSensitive ?? false;
  const needle = caseSensitive ? q : q.toLowerCase();
  const matches = [];

  blocks.forEach((block, blockIndex) => {
    const hay = caseSensitive ? block.text : block.text.toLowerCase();
    let from = 0;
    while (from <= hay.length) {
      const idx = hay.indexOf(needle, from);
      if (idx < 0) break;
      const end = idx + q.length;
      matches.push({
        id: `${block.id}-${idx}`,
        blockIndex,
        start: idx,
        end,
        text: block.text.slice(idx, end),
        box: charRangeToBox(block, idx, end)
      });
      from = idx + Math.max(1, q.length);
    }
  });

  return { matches, total: matches.length, query: q, focusIndex: matches.length ? 0 : -1 };
}

function charRangeToBox(block, start, end) {
  const { x, y, w, h } = block.box;
  const len = Math.max(block.text.length, 1);
  const r0 = start / len;
  const r1 = end / len;
  return {
    x: x + w * r0,
    y,
    w: Math.max(0.8, w * (r1 - r0)),
    h
  };
}

export function clampFocusIndex(total, index) {
  if (total <= 0) return -1;
  return ((index % total) + total) % total;
}

export function stepSearchFocus(searchResult, delta) {
  const { matches, total } = searchResult;
  if (!total) return { ...searchResult, focusIndex: -1 };
  const next = clampFocusIndex(total, (searchResult.focusIndex ?? 0) + delta);
  return { ...searchResult, focusIndex: next };
}

export function getFocusedMatch(searchResult) {
  const idx = searchResult.focusIndex ?? 0;
  if (idx < 0 || !searchResult.matches?.length) return null;
  return searchResult.matches[idx] || null;
}
