import { SUPPRESS_AREA } from "./spaceConfig.js";

function luma(data, index) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

/**
 * 국소 고휘도 집중점. 넓은 반사면은 suppress 기준으로 버린다.
 * @returns {{ hotspot: {nx:number,ny:number,score:number,area:number}|null, mean:number }}
 */
export function measureHotspot(imageData, suppress = "high") {
  const { data, width, height } = imageData;
  const cols = 24;
  const rows = 18;
  const cellW = width / cols;
  const cellH = height / rows;
  const cells = new Float32Array(cols * rows);
  let total = 0;
  let count = 0;
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const value = luma(data, (y * width + x) * 4);
      total += value;
      count += 1;
      const cx = Math.min(cols - 1, Math.floor(x / cellW));
      const cy = Math.min(rows - 1, Math.floor(y / cellH));
      const idx = cy * cols + cx;
      if (value > cells[idx]) cells[idx] = value;
    }
  }
  const mean = count ? total / count : 0;
  const threshold = Math.max(188, mean + 42);
  let best = -1;
  let bestValue = 0;
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] > bestValue) {
      bestValue = cells[i];
      best = i;
    }
  }
  if (best < 0 || bestValue < threshold) return { hotspot: null, mean };
  const seen = new Uint8Array(cells.length);
  const stack = [best];
  seen[best] = 1;
  let area = 0;
  let sx = 0;
  let sy = 0;
  while (stack.length) {
    const idx = stack.pop();
    area += 1;
    sx += idx % cols;
    sy += Math.floor(idx / cols);
    const x = idx % cols;
    const y = Math.floor(idx / cols);
    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < cols - 1 ? idx + 1 : -1,
      y > 0 ? idx - cols : -1,
      y < rows - 1 ? idx + cols : -1
    ];
    neighbors.forEach((next) => {
      if (next < 0 || seen[next] || cells[next] < threshold) return;
      seen[next] = 1;
      stack.push(next);
    });
  }
  const ratio = area / cells.length;
  const limit = SUPPRESS_AREA[suppress] ?? SUPPRESS_AREA.high;
  if (ratio > limit) return { hotspot: null, mean, rejected: "wide-reflection" };
  return {
    hotspot: {
      nx: (sx / area + 0.5) / cols,
      ny: (sy / area + 0.5) / rows,
      score: Math.round(bestValue),
      area: Number(ratio.toFixed(3))
    },
    mean: Math.round(mean)
  };
}

export function acceptStable(previous, hotspot, stability, zoom) {
  if (!hotspot) return { locked: false, streak: 0, point: null };
  const need = stability === "instant" ? 1 : 8;
  const close =
    previous?.point &&
    Math.hypot(previous.point.nx - hotspot.nx, previous.point.ny - hotspot.ny) < 0.12;
  const streak = close ? previous.streak + 1 : 1;
  const held = streak >= need;
  const zoomOk = stability !== "zoom_verified" || zoom >= 2;
  return { locked: held && zoomOk, streak, point: hotspot, needZoom: held && !zoomOk };
}

export function directionCue(hotspot, zoom) {
  if (!hotspot) {
    return { text: "고휘도 집중점이 없습니다. 시야를 천천히 옮기세요.", dir: "", zoomIn: false };
  }
  const dx = hotspot.nx - 0.5;
  const dy = hotspot.ny - 0.5;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
    return {
      text: zoom >= 2 ? "중앙입니다. 이 배율로 형상을 확인하세요." : "중앙입니다. 2x 또는 3x로 줌인하세요.",
      dir: "center",
      zoomIn: zoom < 2
    };
  }
  const horizontal = dx < -0.1 ? "왼쪽" : dx > 0.1 ? "오른쪽" : "";
  const vertical = dy < -0.1 ? "위" : dy > 0.1 ? "아래" : "";
  const way = [vertical, horizontal].filter(Boolean).join(" ");
  return { text: `${way}으로 시야를 맞추세요.`, dir: way, zoomIn: false };
}
