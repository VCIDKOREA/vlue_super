/**
 * 이미지 업로드 공통 — 픽셀·용량 자동 맞춤 (비율 유지)
 */

export const IMAGE_FIT_READ_MAX_BYTES = 20 * 1024 * 1024;

/** 프로필/명함 사진 — 클라이언트 압축 후 R2 */
export const IMAGE_FIT_PHOTO = {
  maxWidth: 1920,
  maxHeight: 1920,
  maxBytes: 900 * 1024,
  preferPng: false,
  fileNamePrefix: "photo"
};

/** 회사·브랜드 로고 */
export const IMAGE_FIT_LOGO = {
  maxWidth: 512,
  maxHeight: 512,
  maxBytes: 400 * 1024,
  preferPng: true,
  fileNamePrefix: "logo"
};

/** 아바타·페이지 프로필 */
export const IMAGE_FIT_AVATAR = {
  maxWidth: 1200,
  maxHeight: 1200,
  maxBytes: 700 * 1024,
  preferPng: false,
  fileNamePrefix: "avatar"
};

/** 피드 커버·카카오 썸네일 */
export const IMAGE_FIT_COVER = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxBytes: 800 * 1024,
  preferPng: false,
  fileNamePrefix: "cover"
};

/** 일반 첨부 (쇼케이스 제외) */
export const IMAGE_FIT_GENERAL = {
  maxWidth: 1920,
  maxHeight: 1920,
  maxBytes: 900 * 1024,
  preferPng: false,
  fileNamePrefix: "image"
};

/** 쇼케이스 갤러리 — 상대적으로 고화질 유지 */
export const IMAGE_FIT_SHOWCASE = {
  maxWidth: 1920,
  maxHeight: 2560,
  maxBytes: 1800 * 1024,
  preferPng: false,
  fileNamePrefix: "showcase"
};

/**
 * 통화 화면 미리보기용 권장 픽셀 (세로 풀스크린 · 하단 통화버튼 가림 고려)
 * 업로드 상한은 IMAGE_FIT_SHOWCASE 와 동일
 */
export const SHOWCASE_CALL_IMAGE_GUIDE = {
  recommendWidthPx: 1080,
  recommendHeightPx: 1920,
  maxWidthPx: IMAGE_FIT_SHOWCASE.maxWidth,
  maxHeightPx: IMAGE_FIT_SHOWCASE.maxHeight,
  aspectLabel: "9:16",
  safeZoneHint:
    "하단은 키패드·음소거·스피커·통화종료 버튼에 가려질 수 있어요. 상품·문구는 위쪽 ⅔에 두세요.",
  sizeHint: "권장 1080×1920px (9:16) · 최대 1920×2560px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 1080×1920px (9:16) · 최대 1920×2560px · 초과 시 자동 맞춤 · 중요 내용은 위쪽 ⅔"
};

/** DCC·명함 프로필 사진 (photo kind) */
export const DCC_PROFILE_PHOTO_IMAGE_GUIDE = {
  recommendWidthPx: IMAGE_FIT_PHOTO.maxWidth,
  recommendHeightPx: IMAGE_FIT_PHOTO.maxHeight,
  aspectLabel: "1:1",
  sizeHint: "권장 1920×1920px (1:1 정사각) · 최대 1920×1920px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 1920×1920px (1:1 정사각) · 최대 900KB · 초과 시 자동 맞춤 · 원형 표시, 얼굴은 중앙"
};

/** DCC 타이틀 사진 · 케이스함 상단 배너 (photo kind, 가로 크롭) */
export const DCC_TITLE_PHOTO_IMAGE_GUIDE = {
  recommendWidthPx: 1920,
  recommendHeightPx: 600,
  aspectLabel: "가로형",
  sizeHint: "권장 1920×600px 전후 가로형 · 최대 1920×1920px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 1920×600px 전후 가로형 · 최대 900KB · 초과 시 자동 맞춤 · 중요 피사체는 위쪽(초점)"
};

/** DCC·쇼케이스 링크 회사 로고 (logo kind) */
export const DCC_LOGO_IMAGE_GUIDE = {
  recommendWidthPx: IMAGE_FIT_LOGO.maxWidth,
  recommendHeightPx: IMAGE_FIT_LOGO.maxHeight,
  aspectLabel: "1:1",
  sizeHint: "권장 512×512px (1:1) · 최대 512×512px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 512×512px (1:1, PNG 투명 권장) · 최대 400KB · 초과 시 자동 맞춤"
};

/** 앱 프로필 패널·VLUE PAGE (avatar kind) */
export const AVATAR_IMAGE_GUIDE = {
  recommendWidthPx: IMAGE_FIT_AVATAR.maxWidth,
  recommendHeightPx: IMAGE_FIT_AVATAR.maxHeight,
  aspectLabel: "1:1",
  sizeHint: "권장 1200×1200px (1:1) · 최대 1200×1200px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 1200×1200px (1:1) · 최대 700KB · 초과 시 자동 맞춤 · 얼굴은 중앙"
};

/** 카카오 피드·OG 커버 (cover kind) */
export const COVER_IMAGE_GUIDE = {
  recommendWidthPx: IMAGE_FIT_COVER.maxWidth,
  recommendHeightPx: IMAGE_FIT_COVER.maxHeight,
  aspectLabel: "1:1",
  sizeHint: "권장 1600×1600px (1:1) · 최대 1600×1600px",
  uploadHint:
    "PNG, JPG, WEBP · 권장 1600×1600px (1:1) · 최대 800KB · 초과 시 자동 맞춤"
};

/** 채팅 전송 이미지 */
export const IMAGE_FIT_CHAT = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxBytes: 1200 * 1024,
  preferPng: false,
  fileNamePrefix: "chat"
};

/** 스토어 상품·신청 서류(이미지) */
export const IMAGE_FIT_STORE = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxBytes: 800 * 1024,
  preferPng: false,
  fileNamePrefix: "store"
};

/** 확인 서류 스캔본(이미지) */
export const IMAGE_FIT_DOC = {
  maxWidth: 1600,
  maxHeight: 2200,
  maxBytes: 1500 * 1024,
  preferPng: false,
  fileNamePrefix: "doc"
};

function dataUrlByteLength(dataUrl) {
  const comma = String(dataUrl || "").indexOf(",");
  if (comma < 0) return String(dataUrl || "").length;
  const b64 = String(dataUrl).slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}

function readImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function extForMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * data URL을 maxWidth×maxHeight·maxBytes에 맞게 축소·압축
 * @param {string} dataUrl
 * @param {{ maxWidth:number, maxHeight:number, maxBytes:number, preferPng?:boolean }} rules
 * @param {string} [sourceType]
 */
export async function fitImageDataUrlToRules(dataUrl, rules, sourceType = "image/jpeg") {
  const img = await readImageFromDataUrl(dataUrl);
  const srcW = Math.max(1, img.naturalWidth || img.width);
  const srcH = Math.max(1, img.naturalHeight || img.height);
  const scale = Math.min(1, rules.maxWidth / srcW, rules.maxHeight / srcH);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 변환에 실패했습니다.");
  ctx.drawImage(img, 0, 0, w, h);

  const wantPng =
    Boolean(rules.preferPng) && (sourceType === "image/png" || sourceType === "image/webp");

  const encode = (mime, quality) =>
    mime === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL(mime, quality);

  let outType = wantPng ? "image/png" : "image/jpeg";
  let out = encode(outType, 0.88);
  if (dataUrlByteLength(out) <= rules.maxBytes) {
    return { dataUrl: out, mime: outType, width: w, height: h };
  }

  outType = "image/jpeg";
  for (const q of [0.85, 0.78, 0.7, 0.62, 0.55, 0.48]) {
    out = encode(outType, q);
    if (dataUrlByteLength(out) <= rules.maxBytes) {
      return { dataUrl: out, mime: outType, width: w, height: h };
    }
  }

  const shrink = Math.sqrt(rules.maxBytes / Math.max(1, dataUrlByteLength(out)));
  const w2 = Math.max(1, Math.round(w * Math.min(0.92, shrink)));
  const h2 = Math.max(1, Math.round(h * Math.min(0.92, shrink)));
  canvas.width = w2;
  canvas.height = h2;
  const ctx2 = canvas.getContext("2d");
  if (!ctx2) throw new Error("이미지 변환에 실패했습니다.");
  ctx2.drawImage(img, 0, 0, w2, h2);
  for (const q of [0.72, 0.6, 0.5]) {
    out = canvas.toDataURL("image/jpeg", q);
    if (dataUrlByteLength(out) <= rules.maxBytes) {
      return { dataUrl: out, mime: "image/jpeg", width: w2, height: h2 };
    }
  }

  throw new Error(
    `용량을 ${Math.round(rules.maxBytes / 1024)}KB 이하로 줄이지 못했습니다. 다른 이미지를 사용해 주세요.`
  );
}

/**
 * File → 자동 맞춤 data URL
 * @param {File} file
 * @param {Partial<typeof IMAGE_FIT_GENERAL> & { maxWidth:number, maxHeight:number, maxBytes:number }} rules
 * @returns {Promise<{ ok:true, dataUrl:string, fileName:string, mime:string, width:number, height:number } | { ok:false, error:string }>}
 */
export async function fitImageFile(file, rules = IMAGE_FIT_GENERAL) {
  if (!file) return { ok: false, error: "파일을 선택해 주세요." };
  const type = String(file.type || "").toLowerCase();
  if (!type.startsWith("image/")) {
    return { ok: false, error: "이미지 파일만 업로드할 수 있습니다." };
  }
  if (file.size > IMAGE_FIT_READ_MAX_BYTES) {
    return { ok: false, error: "이미지 파일이 너무 큽니다. 20MB 이하로 선택해 주세요." };
  }

  try {
    const raw = await readFileAsDataUrl(file);
    if (!raw.startsWith("data:image/")) {
      return { ok: false, error: "이미지 형식이 올바르지 않습니다." };
    }
    const fitted = await fitImageDataUrlToRules(raw, rules, type);
    const prefix = String(rules.fileNamePrefix || "image").trim() || "image";
    const ext = extForMime(fitted.mime);
    const base = String(file.name || prefix).replace(/\.[^.]+$/, "") || prefix;
    return {
      ok: true,
      dataUrl: fitted.dataUrl,
      fileName: `${base}.${ext}`,
      mime: fitted.mime,
      width: fitted.width,
      height: fitted.height
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "이미지 변환에 실패했습니다." };
  }
}

/** Promise 스타일 — 실패 시 throw (기존 readImageFileAsDataUrl 호환) */
export async function fitImageFileOrThrow(file, rules = IMAGE_FIT_GENERAL) {
  const result = await fitImageFile(file, rules);
  if (!result.ok) throw new Error(result.error);
  return { dataUrl: result.dataUrl, fileName: result.fileName, mime: result.mime };
}
