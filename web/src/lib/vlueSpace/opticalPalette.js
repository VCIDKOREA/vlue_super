const ironLut = buildIronLut();

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function buildIronLut() {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    const r = t < 0.34 ? t * 80 : (t - 0.18) * 340;
    const g = t < 0.22 ? t * 40 : t < 0.72 ? (t - 0.18) * 470 : 255 - (t - 0.72) * 620;
    const b = t < 0.18 ? 40 + t * 700 : t < 0.5 ? 170 - t * 280 : 18 + (1 - t) * 30;
    lut[i * 3] = clampByte(r);
    lut[i * 3 + 1] = clampByte(g);
    lut[i * 3 + 2] = clampByte(b);
  }
  return lut;
}

function lumaAt(data, index) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

/** 원본 프레임 픽셀에 팔레트를 덮어쓴다. 분석은 호출 전에 끝낸다. */
export function applyOpticalPalette(imageData, palette) {
  const { data, width, height } = imageData;
  if (palette === "HIGH_CONTRAST_EDGE") {
    const luma = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const y = lumaAt(data, i);
      luma[p] = clampByte((y - 128) * 1.85 + 128);
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        const left = x > 0 ? luma[p - 1] : luma[p];
        const up = y > 0 ? luma[p - width] : luma[p];
        const edge = Math.min(255, Math.abs(luma[p] - left) + Math.abs(luma[p] - up));
        const v = clampByte(luma[p] * 0.35 + edge * 1.7);
        const i = p * 4;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    return;
  }
  for (let i = 0; i < data.length; i += 4) {
    const y = clampByte((lumaAt(data, i) - 128) * (palette === "NVG_PHOSPHOR" ? 2.05 : 1.35) + 128);
    if (palette === "NVG_PHOSPHOR") {
      data[i] = clampByte(y * 0.16);
      data[i + 1] = y;
      data[i + 2] = clampByte(y * 0.28);
    } else {
      data[i] = ironLut[y * 3];
      data[i + 1] = ironLut[y * 3 + 1];
      data[i + 2] = ironLut[y * 3 + 2];
    }
    data[i + 3] = 255;
  }
}

export function paintSampleScene(ctx, width, height) {
  ctx.fillStyle = "#121820";
  ctx.fillRect(0, 0, width, height);
  const body = ctx.createRadialGradient(width * 0.46, height * 0.58, width * 0.04, width * 0.46, height * 0.58, width * 0.42);
  body.addColorStop(0, "#8b97a6");
  body.addColorStop(0.45, "#4a5563");
  body.addColorStop(1, "#121820");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.arc(width * 0.63, height * 0.36, Math.max(7, width * 0.016), 0, Math.PI * 2);
  ctx.fill();
}
