import { SUPPRESS_AREA } from "./spaceConfig.js";

export const MAX_CANDIDATES = 8;
export const TRACK_MATCH_DIST = 0.12;
export const TRACK_SUSTAIN_MS = 700;
export const TRACK_LOST_MS = 450;

const scratch = {
  key: "",
  luma: new Uint8Array(0),
  mask: new Uint8Array(0),
  seen: new Uint8Array(0),
  hist: new Uint32Array(256),
  dev: new Uint32Array(256),
  stack: []
};

function buffers(width, height) {
  const n = width * height;
  const key = `${width}x${height}`;
  if (scratch.key !== key) {
    scratch.key = key;
    scratch.luma = new Uint8Array(n);
    scratch.mask = new Uint8Array(n);
    scratch.seen = new Uint8Array(n);
  } else {
    scratch.mask.fill(0);
    scratch.seen.fill(0);
  }
  scratch.hist.fill(0);
  scratch.dev.fill(0);
  scratch.stack.length = 0;
  return scratch;
}

function histogramMedian(hist, total) {
  let acc = 0;
  const half = Math.max(1, (total + 1) >> 1);
  for (let value = 0; value < 256; value += 1) {
    acc += hist[value];
    if (acc >= half) return value;
  }
  return 0;
}

function emptyMeasurement() {
  return {
    candidates: [],
    hotspot: null,
    mean: 0,
    threshold: 0,
    rejected: "",
    limited: false,
    rejectedWide: 0
  };
}

/**
 * 화면 픽셀의 연결 영역. 렌즈 판정이 아니다.
 * 좌표는 프레임 안 비율이며 공간 좌표가 아니다.
 */
export function measureCandidates(imageData, suppress = "high") {
  if (!imageData?.data || !imageData.width || !imageData.height) return emptyMeasurement();
  const { data, width, height } = imageData;
  const n = width * height;
  if (data.length < n * 4) return emptyMeasurement();
  const buf = buffers(width, height);
  const { luma, mask, seen, hist, dev, stack } = buf;
  let sum = 0;
  for (let p = 0, i = 0; p < n; p += 1, i += 4) {
    const y = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    luma[p] = y;
    hist[y] += 1;
    sum += y;
  }
  const mean = sum / n;
  const median = histogramMedian(hist, n);
  for (let value = 0; value < 256; value += 1) dev[Math.abs(value - median)] += hist[value];
  const mad = histogramMedian(dev, n);
  const lift = Math.max(32, mad * 3);
  const threshold = median + lift;
  let brightCount = 0;
  if (threshold <= 255) {
    for (let p = 0; p < n; p += 1) {
      if (luma[p] >= threshold) {
        mask[p] = 1;
        brightCount += 1;
      }
    }
  }
  const roundedMean = Math.round(mean);
  if (!brightCount) {
    return { candidates: [], hotspot: null, mean: roundedMean, threshold, rejected: "", limited: false, rejectedWide: 0 };
  }
  if (brightCount > n * 0.42) {
    return { candidates: [], hotspot: null, mean: roundedMean, threshold, rejected: "wide-reflection", limited: false, rejectedWide: 1 };
  }
  const limit = SUPPRESS_AREA[suppress] ?? SUPPRESS_AREA.high;
  const found = [];
  let rejectedWide = 0;
  for (let seed = 0; seed < n; seed += 1) {
    if (!mask[seed] || seen[seed]) continue;
    let area = 0;
    let sumL = 0;
    let maxL = 0;
    let sx = 0;
    let sy = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let perimeter = 0;
    let edgeTouch = false;
    stack.length = 0;
    stack.push(seed);
    seen[seed] = 1;
    while (stack.length) {
      const q = stack.pop();
      const x = q % width;
      const y = (q / width) | 0;
      const level = luma[q];
      area += 1;
      sumL += level;
      if (level > maxL) maxL = level;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) edgeTouch = true;
      let outside = 0;
      const neighbors = [
        x > 0 ? q - 1 : -1,
        x < width - 1 ? q + 1 : -1,
        y > 0 ? q - width : -1,
        y < height - 1 ? q + width : -1
      ];
      for (let k = 0; k < 4; k += 1) {
        const next = neighbors[k];
        if (next < 0 || !mask[next]) outside += 1;
        else if (!seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
      if (outside) perimeter += 1;
    }
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const ratio = area / n;
    const span = Math.max(boxW / width, boxH / height);
    const wide = ratio > limit || (edgeTouch && ratio > 0.02 && span >= 0.6);
    if (wide) {
      rejectedWide += 1;
      continue;
    }
    const contrast = maxL - median;
    if (area <= 2 && contrast < 70) continue;
    if (area < 6 && contrast < 45) continue;
    const x0 = Math.max(0, minX - 3);
    const y0 = Math.max(0, minY - 3);
    const x1 = Math.min(width - 1, maxX + 3);
    const y1 = Math.min(height - 1, maxY + 3);
    let surroundSum = 0;
    let surroundCount = 0;
    for (let y = y0; y <= y1; y += 1) {
      const row = y * width;
      for (let x = x0; x <= x1; x += 1) {
        const p = row + x;
        if (mask[p]) continue;
        surroundSum += luma[p];
        surroundCount += 1;
      }
    }
    const meanLuma = sumL / area;
    const surroundLuma = surroundCount ? surroundSum / surroundCount : median;
    const aspect = boxW / boxH;
    const circularity = perimeter > 0 ? Math.min(1, (4 * Math.PI * area) / (perimeter * perimeter)) : 0;
    let boundary = "irregular";
    if (circularity >= 0.55 && aspect >= 0.7 && aspect <= 1.45) boundary = "compact";
    else if (aspect >= 2.2 || aspect <= 0.45) boundary = "elongated";
    found.push({
      nx: (sx / area + 0.5) / width,
      ny: (sy / area + 0.5) / height,
      score: maxL,
      area: Number(ratio.toFixed(4)),
      pixelArea: area,
      width: boxW,
      height: boxH,
      aspect: Number(aspect.toFixed(3)),
      circularity: Number(circularity.toFixed(3)),
      perimeter,
      maxLuma: maxL,
      meanLuma: Math.round(meanLuma),
      surroundLuma: Math.round(surroundLuma),
      centerContrast: Math.round(meanLuma - surroundLuma),
      edgeTouch,
      boundary,
      space: "screen"
    });
  }
  found.sort((a, b) => b.centerContrast - a.centerContrast || b.maxLuma - a.maxLuma);
  const limited = found.length > MAX_CANDIDATES;
  const candidates = limited ? found.slice(0, MAX_CANDIDATES) : found;
  return {
    candidates,
    hotspot: candidates[0] || null,
    mean: roundedMean,
    threshold,
    rejected: !candidates.length && rejectedWide ? "wide-reflection" : "",
    limited,
    rejectedWide
  };
}

export function measureHotspot(imageData, suppress = "high") {
  const measured = measureCandidates(imageData, suppress);
  return {
    hotspot: measured.hotspot,
    mean: measured.mean,
    rejected: measured.rejected,
    candidates: measured.candidates,
    limited: measured.limited,
    rejectedWide: measured.rejectedWide
  };
}

function trackFeatures(candidate) {
  return {
    nx: candidate.nx,
    ny: candidate.ny,
    score: candidate.score,
    area: candidate.area,
    pixelArea: candidate.pixelArea,
    width: candidate.width,
    height: candidate.height,
    aspect: candidate.aspect,
    circularity: candidate.circularity,
    centerContrast: candidate.centerContrast,
    boundary: candidate.boundary,
    space: "screen"
  };
}

/** 화면 좌표 추적. 지속 여부는 프레임 수가 아니라 밀리초로 판단한다. */
export function updateCandidateTracks(previous, candidates, now) {
  const prevTracks = previous?.tracks || [];
  let seq = previous?.seq || 1;
  const at = Number.isFinite(now) ? now : 0;
  const incoming = Array.isArray(candidates) ? candidates : [];
  const used = new Uint8Array(prevTracks.length);
  const tracks = [];
  const ended = [];
  for (let c = 0; c < incoming.length; c += 1) {
    const cand = incoming[c];
    let best = -1;
    let bestDist = TRACK_MATCH_DIST;
    for (let i = 0; i < prevTracks.length; i += 1) {
      if (used[i]) continue;
      const track = prevTracks[i];
      const dist = Math.hypot(track.nx - cand.nx, track.ny - cand.ny);
      const areaOk =
        !track.pixelArea ||
        !cand.pixelArea ||
        (cand.pixelArea >= track.pixelArea * 0.35 && cand.pixelArea <= track.pixelArea * 2.8);
      if (dist < bestDist && areaOk) {
        best = i;
        bestDist = dist;
      }
    }
    if (best >= 0) {
      used[best] = 1;
      const track = prevTracks[best];
      const durationMs = Math.max(0, at - track.firstSeen);
      tracks.push({
        ...trackFeatures(cand),
        id: track.id,
        firstSeen: track.firstSeen,
        lastSeen: at,
        durationMs,
        status: durationMs >= TRACK_SUSTAIN_MS ? "sustained" : "transient"
      });
    } else {
      const id = seq;
      seq += 1;
      tracks.push({
        ...trackFeatures(cand),
        id,
        firstSeen: at,
        lastSeen: at,
        durationMs: 0,
        status: "new"
      });
    }
  }
  for (let i = 0; i < prevTracks.length; i += 1) {
    if (used[i]) continue;
    const track = prevTracks[i];
    const gap = at - track.lastSeen;
    if (gap >= TRACK_LOST_MS) ended.push({ ...track, status: "ended", endedAt: at, space: "screen" });
    else tracks.push({ ...track, status: track.durationMs >= TRACK_SUSTAIN_MS ? "sustained" : "gap", space: "screen" });
  }
  return { tracks, ended, seq };
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
