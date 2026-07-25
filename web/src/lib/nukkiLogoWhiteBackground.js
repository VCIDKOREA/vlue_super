/**
 * 로고 이미지 흰 사각(밝은 배경)을 투명 처리 — 캔버스 누끼
 * @param {string} src
 * @param {{ threshold?: number, soft?: number }} [opts]
 * @returns {Promise<string>} data URL (실패 시 원본 src)
 */
export async function nukkiLogoWhiteBackground(src, opts = {}) {
  const url = String(src || "").trim();
  if (!url) return "";
  /* 이미 SVG·투명 가능성이 높은 data svg 는 패스 */
  if (url.startsWith("data:image/svg")) return url;

  const threshold = Number(opts.threshold) > 0 ? Number(opts.threshold) : 236;
  const soft = Number(opts.soft) > 0 ? Number(opts.soft) : 28;

  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return url;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return url;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const low = Math.max(0, threshold - soft);

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a === 0) continue;
      /* 밝기 — 흰·연회색 사각 제거 */
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum >= threshold) {
        d[i + 3] = 0;
        continue;
      }
      if (lum >= low) {
        const t = (lum - low) / (threshold - low || 1);
        d[i + 3] = Math.round(a * (1 - t));
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return url;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    /* 외부 R2 등 — CORS 허용 시 캔버스 읽기 가능 */
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo_load_failed"));
    img.src = src;
  });
}
