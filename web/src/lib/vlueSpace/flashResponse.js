export const FLASH_SETTLE_MS = 350;
export const FLASH_SAMPLE_MS = 700;
export const FLASH_LUMA_STEP = 12;

export function createFlashGate() {
  return { phase: "idle", busy: false, active: false, samples: [] };
}

export function tryBeginFlashSample(gate) {
  if (!gate?.active || gate.busy) return false;
  if (gate.phase !== "off" && gate.phase !== "on") return false;
  gate.busy = true;
  return true;
}

export function finishFlashSample(gate) {
  if (gate) gate.busy = false;
}

export function readTorchSupport(track) {
  if (!track || typeof track.getCapabilities !== "function") {
    return {
      supported: false,
      controllable: false,
      reason: "이 브라우저는 카메라 트랙의 토치 지원 여부를 알려 주지 않습니다. 조명 비교 불가."
    };
  }
  let capabilities = null;
  try {
    capabilities = track.getCapabilities() || {};
  } catch (err) {
    return {
      supported: false,
      controllable: false,
      reason: "토치 지원 여부를 확인하지 못했습니다. 조명 비교 불가.",
      errorName: err?.name || "capabilities"
    };
  }
  if (capabilities.torch !== true) {
    return {
      supported: false,
      controllable: false,
      reason: "이 카메라는 토치를 지원하지 않습니다. 조명 비교 불가.",
      capabilities: { torch: false }
    };
  }
  if (typeof track.applyConstraints !== "function") {
    return {
      supported: false,
      controllable: false,
      reason: "토치 항목은 있으나 제어할 수 없습니다. 조명 비교 불가.",
      capabilities: { torch: true }
    };
  }
  return { supported: true, controllable: true, reason: "", capabilities: { torch: true } };
}

export async function applyTorch(track, enabled) {
  const support = readTorchSupport(track);
  if (!support.supported) {
    return { ok: false, applied: null, supported: false, assumedOff: false, reason: support.reason };
  }
  try {
    await track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    return { ok: true, applied: Boolean(enabled), supported: true, assumedOff: false, reason: "" };
  } catch (err) {
    const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError" || err?.name === "OverconstrainedError";
    return {
      ok: false,
      applied: null,
      supported: true,
      assumedOff: false,
      reason: denied
        ? "토치 제어가 거부되었습니다. 손전등이 꺼졌는지는 확인하지 못했습니다. 조명 비교 불가."
        : "토치를 바꾸지 못했습니다. 손전등이 꺼졌는지는 확인하지 못했습니다.",
      errorName: err?.name || "apply"
    };
  }
}

export async function shutdownVideo(track, stop) {
  let torch = { attempted: false, ok: false, applied: null, assumedOff: false, reason: "" };
  if (track && typeof track.getCapabilities === "function") {
    torch = { ...(await applyTorch(track, false)), attempted: true };
  }
  if (typeof stop === "function") stop();
  return { torch, stopped: true };
}

function box(candidate, frame) {
  const width = Math.max(1, frame?.width || 640);
  const height = Math.max(1, frame?.height || 480);
  const w = Math.max(1, Number(candidate?.width) || 1) / width;
  const h = Math.max(1, Number(candidate?.height) || 1) / height;
  const nx = Number(candidate?.nx) || 0;
  const ny = Number(candidate?.ny) || 0;
  return { x0: nx - w / 2, y0: ny - h / 2, x1: nx + w / 2, y1: ny + h / 2 };
}

function intersectionOverUnion(a, b) {
  const width = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const height = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = width * height;
  const areaA = Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
  const areaB = Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

function areaSimilarity(left, right) {
  const a = Number(left) || 0;
  const b = Number(right) || 0;
  if (a <= 0 || b <= 0) return 0;
  return Math.min(a, b) / Math.max(a, b);
}

function scoreTarget(source, target, frame) {
  const dist = Math.hypot(Number(source.nx) - Number(target.nx), Number(source.ny) - Number(target.ny));
  const overlap = intersectionOverUnion(box(source, frame), box(target, frame));
  const areaRatio = areaSimilarity(source.pixelArea, target.pixelArea);
  const eligible = dist <= 0.1 && (overlap >= 0.2 || (dist <= 0.05 && areaRatio >= 0.5));
  return { dist, overlap, areaRatio, eligible, rank: overlap * 2 + areaRatio - dist * 4 };
}

/** 거리만으로 같은 후보를 확정하지 않는다. 겹침이 없거나 차이가 작으면 uncertain 또는 unmatched. */
export function matchFlashCandidate(source, targets, frame = { width: 640, height: 480 }) {
  const ranked = (targets || [])
    .map((target, index) => ({ index, target, ...scoreTarget(source, target, frame) }))
    .filter((item) => item.eligible)
    .sort((a, b) => b.rank - a.rank);
  if (!ranked.length) return { status: "unmatched", match: null, index: -1, dist: null, overlap: 0, areaRatio: 0 };
  const best = ranked[0];
  const second = ranked[1];
  if (second && best.rank - second.rank < 0.15) {
    return { status: "uncertain", match: null, index: -1, dist: best.dist, overlap: best.overlap, areaRatio: best.areaRatio };
  }
  if (best.overlap < 0.2 && !(best.dist <= 0.05 && best.areaRatio >= 0.5)) {
    return { status: "unmatched", match: null, index: -1, dist: best.dist, overlap: best.overlap, areaRatio: best.areaRatio };
  }
  return { status: "matched", match: best.target, index: best.index, dist: best.dist, overlap: best.overlap, areaRatio: best.areaRatio };
}

export function classifyBrightness(off, on) {
  const deltaMax = Math.round(Number(on?.maxLuma) - Number(off?.maxLuma));
  const deltaMean = Math.round(Number(on?.meanLuma) - Number(off?.meanLuma));
  const spread = Math.max(Number(off?.sampleSpread) || 0, Number(on?.sampleSpread) || 0);
  if (!Number.isFinite(deltaMax) || !Number.isFinite(deltaMean)) {
    return { status: "unstable", deltaMaxLuma: null, deltaMeanLuma: null };
  }
  if (spread > 20) return { status: "unstable", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
  const signMax = Math.sign(deltaMax);
  const signMean = Math.sign(deltaMean);
  if (signMax !== 0 && signMean !== 0 && signMax !== signMean && Math.abs(deltaMax) >= 8 && Math.abs(deltaMean) >= 8) {
    return { status: "unstable", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
  }
  if (Math.abs(deltaMax) < FLASH_LUMA_STEP && Math.abs(deltaMean) < FLASH_LUMA_STEP) {
    return { status: "unchanged", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
  }
  if (deltaMax >= FLASH_LUMA_STEP && deltaMean >= 0) return { status: "increased", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
  if (deltaMax <= -FLASH_LUMA_STEP && deltaMean <= 0) return { status: "decreased", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
  return { status: "unstable", deltaMaxLuma: deltaMax, deltaMeanLuma: deltaMean };
}

function average(items, key) {
  const values = items.map((item) => Number(item?.[key])).filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeFlashSamples(samples, frame = { width: 640, height: 480 }) {
  const list = (samples || []).filter((sample) => Array.isArray(sample?.candidates));
  const clusters = [];
  list.forEach((sample) => {
    const used = new Set();
    (sample.candidates || []).forEach((candidate) => {
      let best = -1;
      let bestRank = -Infinity;
      clusters.forEach((cluster, index) => {
        if (used.has(index)) return;
        const found = matchFlashCandidate(cluster.rep, [candidate], frame);
        if (found.status !== "matched") return;
        const rank = found.overlap - found.dist;
        if (rank > bestRank) {
          bestRank = rank;
          best = index;
        }
      });
      if (best >= 0) {
        used.add(best);
        clusters[best].hits.push(candidate);
        clusters[best].rep = candidate;
      } else {
        clusters.push({ rep: candidate, hits: [candidate] });
      }
    });
  });
  const candidates = clusters.map((cluster) => {
    const hits = cluster.hits;
    const maxes = hits.map((hit) => Number(hit.maxLuma) || 0);
    const last = hits[hits.length - 1];
    return {
      nx: average(hits, "nx"),
      ny: average(hits, "ny"),
      width: last.width,
      height: last.height,
      pixelArea: Math.round(average(hits, "pixelArea")),
      maxLuma: Math.round(average(hits, "maxLuma")),
      meanLuma: Math.round(average(hits, "meanLuma")),
      centerContrast: Math.round(average(hits, "centerContrast")),
      aspect: Number(average(hits, "aspect").toFixed(3)),
      circularity: Number(average(hits, "circularity").toFixed(3)),
      boundary: last.boundary,
      sampleSpread: maxes.length ? Math.max(...maxes) - Math.min(...maxes) : 0,
      seenCount: hits.length,
      sampleCount: list.length,
      space: "screen"
    };
  });
  return {
    at: list[0]?.at || null,
    endedAt: list.length ? list[list.length - 1].at : null,
    candidates,
    sampleCount: list.length
  };
}

function pairFrom(off, on, match) {
  if (match.status !== "matched" || !on) {
    return {
      match: match.status,
      status: match.status,
      deltaMaxLuma: null,
      deltaMeanLuma: null,
      deltaArea: null,
      deltaContrast: null,
      deltaAspect: null,
      deltaCircularity: null,
      off,
      on: null,
      space: "screen"
    };
  }
  const brightness = classifyBrightness(off, on);
  return {
    match: "matched",
    status: brightness.status,
    deltaMaxLuma: brightness.deltaMaxLuma,
    deltaMeanLuma: brightness.deltaMeanLuma,
    deltaArea: Math.round(Number(on.pixelArea) - Number(off.pixelArea)),
    deltaContrast: Math.round(Number(on.centerContrast) - Number(off.centerContrast)),
    deltaAspect: Number((Number(on.aspect) - Number(off.aspect)).toFixed(3)),
    deltaCircularity: Number((Number(on.circularity) - Number(off.circularity)).toFixed(3)),
    off,
    on,
    space: "screen"
  };
}

export function compareFlashPhases(offPhase, onPhase, frame = { width: 640, height: 480 }) {
  const onList = [...(onPhase?.candidates || [])];
  const used = new Set();
  const pairs = [];
  (offPhase?.candidates || []).forEach((off) => {
    const available = onList.filter((_, index) => !used.has(index));
    const found = matchFlashCandidate(off, available, frame);
    if (found.status === "matched" && found.index >= 0) {
      const realIndex = onList.findIndex((item, index) => !used.has(index) && item === found.match);
      if (realIndex >= 0) used.add(realIndex);
    }
    pairs.push(pairFrom(off, found.match, found));
  });
  onList.forEach((on, index) => {
    if (used.has(index)) return;
    pairs.push({
      match: "unmatched",
      status: "unmatched",
      deltaMaxLuma: null,
      deltaMeanLuma: null,
      deltaArea: null,
      deltaContrast: null,
      deltaAspect: null,
      deltaCircularity: null,
      off: null,
      on,
      space: "screen"
    });
  });
  return pairs;
}

export function buildFlashReport({ support, offPhase, onPhase, control, at = new Date().toISOString(), frame }) {
  if (!support?.supported) {
    return {
      at,
      status: "unsupported",
      torchSupported: false,
      reason: support?.reason || "조명 비교 불가.",
      off: null,
      on: null,
      pairs: [],
      torchLitConfirmed: false
    };
  }
  if (control && control.ok === false) {
    return {
      at,
      status: "failed",
      torchSupported: true,
      reason: control.reason || "토치 제어 또는 측정에 실패했습니다.",
      off: offPhase || null,
      on: onPhase || null,
      pairs: [],
      torchLitConfirmed: false,
      assumedOff: false
    };
  }
  const pairs = compareFlashPhases(offPhase, onPhase, frame);
  return {
    at,
    status: "observed",
    torchSupported: true,
    reason: "",
    off: offPhase || null,
    on: onPhase || null,
    pairs,
    torchLitConfirmed: false,
    space: "screen"
  };
}
