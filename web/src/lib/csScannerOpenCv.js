const OPENCV_SRC = "https://docs.opencv.org/4.x/opencv.js";
const OPENCV_TIMEOUT_MS = 12000;

let loadPromise = null;

function waitForCvReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.cv?.Mat) {
        resolve(window.cv);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("OpenCV.js 초기화 시간 초과"));
        return;
      }
      setTimeout(tick, 60);
    };
    tick();
  });
}

/** @returns {Promise<typeof cv>} */
export function loadOpenCv({ timeoutMs = OPENCV_TIMEOUT_MS } = {}) {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.cv?.Mat) return Promise.resolve(window.cv);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-opencv="true"]');
      if (existing) {
        waitForCvReady(timeoutMs).then(resolve).catch(reject);
        return;
      }

      const script = document.createElement("script");
      script.src = OPENCV_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.opencv = "true";
      const timer = setTimeout(() => {
        reject(new Error("OpenCV.js 다운로드 시간 초과"));
      }, timeoutMs);

      script.onload = () => {
        waitForCvReady(timeoutMs)
          .then((cv) => {
            clearTimeout(timer);
            resolve(cv);
          })
          .catch((e) => {
            clearTimeout(timer);
            loadPromise = null;
            reject(e);
          });
      };
      script.onerror = () => {
        clearTimeout(timer);
        loadPromise = null;
        reject(new Error("OpenCV.js 로드 실패"));
      };
      document.head.appendChild(script);
    }).catch((e) => {
      loadPromise = null;
      throw e;
    });
  }

  return loadPromise;
}

export function cancelOpenCvLoad() {
  loadPromise = null;
}

/**
 * 4점 → TL, TR, BR, BL
 * @param {{ x: number, y: number }[]} pts
 */
export function orderQuadCorners(pts) {
  if (!pts || pts.length !== 4) return null;
  const sum = pts.map((p) => p.x + p.y);
  const diff = pts.map((p) => p.x - p.y);
  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.max(...diff))];
  const bl = pts[diff.indexOf(Math.min(...diff))];
  return { tl, tr, br, bl };
}

/**
 * @param {{ tl, tr, br, bl }} corners pixel coords
 * @param {number} width
 * @param {number} height
 */
export function pixelCornersToPercent(corners, width, height) {
  const clamp = (v) => Math.min(96, Math.max(4, v));
  const toPct = (p) => ({
    x: clamp((p.x / width) * 100),
    y: clamp((p.y / height) * 100)
  });
  return {
    tl: toPct(corners.tl),
    tr: toPct(corners.tr),
    br: toPct(corners.br),
    bl: toPct(corners.bl)
  };
}

/**
 * @param {typeof cv} cv
 * @param {HTMLCanvasElement} canvas
 */
export function detectDocumentCorners(cv, canvas) {
  if (!cv?.Mat || !canvas?.width || !canvas?.height) return null;

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blur, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    let bestApprox = null;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i += 1) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        const area = cv.contourArea(approx);
        if (area > bestArea && area > imgArea * 0.04 && area < imgArea * 0.98) {
          if (bestApprox) bestApprox.delete();
          bestArea = area;
          bestApprox = approx;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
      cnt.delete();
    }

    if (!bestApprox) return null;

    const points = [];
    for (let i = 0; i < 4; i += 1) {
      points.push({
        x: bestApprox.data32S[i * 2],
        y: bestApprox.data32S[i * 2 + 1]
      });
    }
    bestApprox.delete();
    return orderQuadCorners(points);
  } catch {
    return null;
  } finally {
    src.delete();
    gray.delete();
    blur.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

export function detectDocumentFromVideo(video, cv, maxEdge = 640) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (vw < 32 || vh < 32) return null;

  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const cw = Math.max(1, Math.round(vw * scale));
  const ch = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);

  const pixelCorners = detectDocumentCorners(cv, canvas);
  if (!pixelCorners) return null;

  const inv = scale > 0 ? 1 / scale : 1;
  return pixelCornersToPercent(
    {
      tl: { x: pixelCorners.tl.x * inv, y: pixelCorners.tl.y * inv },
      tr: { x: pixelCorners.tr.x * inv, y: pixelCorners.tr.y * inv },
      br: { x: pixelCorners.br.x * inv, y: pixelCorners.br.y * inv },
      bl: { x: pixelCorners.bl.x * inv, y: pixelCorners.bl.y * inv }
    },
    vw,
    vh
  );
}

/** OpenCV 없이 가벼운 문서 영역 감지 */
function detectDocumentLiteFromCanvas(canvas, sourceW, sourceH) {
  const cw = canvas.width;
  const ch = canvas.height;
  if (cw < 16 || ch < 16) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { data } = ctx.getImageData(0, 0, cw, ch);
  const hist = new Uint32Array(256);
  const total = cw * ch;

  for (let i = 0; i < total; i += 1) {
    const b = Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3);
    hist[b] += 1;
  }

  let cum = 0;
  let threshold = 128;
  for (let i = 0; i < 256; i += 1) {
    cum += hist[i];
    if (cum >= total * 0.38) {
      threshold = i;
      break;
    }
  }

  let minX = cw;
  let minY = ch;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const idx = (y * cw + x) * 4;
      const b = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
      if (b > threshold) {
        hits += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (hits < total * 0.06 || maxX <= minX || maxY <= minY) return null;

  const sx = sourceW / cw;
  const sy = sourceH / ch;
  const padX = Math.max(1, Math.round(cw * 0.01));
  const padY = Math.max(1, Math.round(ch * 0.01));
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(cw - 1, maxX + padX);
  maxY = Math.min(ch - 1, maxY + padY);

  return pixelCornersToPercent(
    {
      tl: { x: minX * sx, y: minY * sy },
      tr: { x: maxX * sx, y: minY * sy },
      br: { x: maxX * sx, y: maxY * sy },
      bl: { x: minX * sx, y: maxY * sy }
    },
    sourceW,
    sourceH
  );
}

export function detectDocumentLiteFromVideo(video, maxEdge = 200) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (vw < 32 || vh < 32) return null;

  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const cw = Math.max(1, Math.round(vw * scale));
  const ch = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  return detectDocumentLiteFromCanvas(canvas, vw, vh);
}

export function detectDocumentLiteFromImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const vw = img.naturalWidth || img.width;
      const vh = img.naturalHeight || img.height;
      const maxEdge = 200;
      const scale = Math.min(1, maxEdge / Math.max(vw, vh));
      const cw = Math.max(1, Math.round(vw * scale));
      const ch = Math.max(1, Math.round(vh * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(detectDocumentLiteFromCanvas(canvas, vw, vh));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export function detectDocumentFromImageDataUrl(dataUrl, cv, maxEdge = 640) {
  return detectDocumentLiteFromImageDataUrl(dataUrl);
}

export function defaultTempScanFileName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `스캔_임시_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.pdf`;
}

export function sanitizeScanFileName(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return defaultTempScanFileName();
  const safe = trimmed.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}
