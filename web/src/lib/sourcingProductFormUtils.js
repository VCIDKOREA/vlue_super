import { fileToDataUrl } from "./vlueCoreShoppingApi.js";

export const SOURCING_DRAFT_STORAGE_KEY = "vlue_sourcing_product_draft_v1";
export const MAX_SOURCING_PHOTOS = 10;
export const MAX_TITLE_LEN = 40;
export const MAX_HASHTAGS = 10;
export const MAX_SOURCING_VIDEO_BYTES = 12 * 1024 * 1024;

export function parsePriceDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatPriceDisplay(digits) {
  const n = parsePriceDigits(digits);
  if (!n) return "";
  return Number(n).toLocaleString("ko-KR");
}

export function calcDiscountPercent(saleDigits, listDigits) {
  const sale = Number(parsePriceDigits(saleDigits)) || 0;
  const list = Number(parsePriceDigits(listDigits)) || 0;
  if (!sale || !list || list <= sale) return null;
  return Math.round(((list - sale) / list) * 100);
}

export async function readSourcingMediaFile(file) {
  if (!file) throw new Error("파일을 선택해 주세요.");
  if (file.type.startsWith("image/")) {
    const url = await compressImageFile(file);
    return { type: "image", url, name: file.name };
  }
  if (file.type.startsWith("video/")) {
    if (file.size > MAX_SOURCING_VIDEO_BYTES) {
      throw new Error("영상은 12MB 이하만 등록할 수 있습니다.");
    }
    const url = await fileToDataUrl(file);
    return { type: "video", url, name: file.name };
  }
  throw new Error("이미지 또는 영상 파일만 업로드할 수 있습니다.");
}

export function buildRegisterMediaFromForm(form) {
  if (form.listingType === "media_single" && form.mediaPrimary?.url) {
    if (form.mediaPrimary.type === "video") {
      return {
        imageUrls: [],
        videoUrl: form.mediaPrimary.url,
        mediaKind: "video",
        listingType: "media_single",
        posterUrl: form.mediaPrimary.posterUrl || ""
      };
    }
    return {
      imageUrls: [form.mediaPrimary.url],
      videoUrl: "",
      mediaKind: "image",
      listingType: "media_single",
      posterUrl: ""
    };
  }
  const imageUrls = [
    ...form.previews,
    ...(form.inlineItem?.imageUrl && !form.previews.includes(form.inlineItem.imageUrl)
      ? [form.inlineItem.imageUrl]
      : [])
  ].filter(Boolean);
  return {
    imageUrls,
    videoUrl: "",
    mediaKind: "gallery",
    listingType: "photo_gallery",
    posterUrl: ""
  };
}

export function sourcingHasVisualMedia(state) {
  if (state.listingType === "media_single" && state.mediaPrimary?.url) return true;
  if (state.previews?.length) return true;
  if (state.inlineItem?.imageUrl) return true;
  return false;
}

export async function compressImageFile(file, maxBytes = 1024 * 1024) {
  const dataUrl = await fileToDataUrl(file);
  if (dataUrl.length * 0.75 <= maxBytes) return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxSide = 1600;
      if (width > maxSide || height > maxSide) {
        const ratio = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.88;
      let out = canvas.toDataURL("image/jpeg", quality);
      while (out.length * 0.75 > maxBytes && quality > 0.45) {
        quality -= 0.08;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error("이미지 압축에 실패했습니다."));
    img.src = dataUrl;
  });
}

export function suggestProductNames(keywords, draftTitle) {
  const base = (draftTitle || keywords || "추천 상품").trim().slice(0, 24);
  const k = keywords.trim();
  const variants = [
    k ? `${k.split(/[,，]/)[0].trim()} ${base}`.trim() : base,
    `${base} (실사 촬영)`,
    `[특가] ${base}`
  ];
  return [...new Set(variants.map((s) => s.slice(0, MAX_TITLE_LEN)))].slice(0, 3);
}

export function suggestPriceKrw(keywords, category) {
  const text = `${keywords} ${category}`.toLowerCase();
  if (/전자|폰|노트북|태블릿/.test(text)) return "890000";
  if (/가구|소파|침대/.test(text)) return "320000";
  if (/의류|패션|신발/.test(text)) return "59000";
  if (/식품|건강|비타민/.test(text)) return "39000";
  if (/유아|완구|장난감/.test(text)) return "45000";
  return "49000";
}

export function buildDefaultFormState() {
  return {
    title: "",
    category: "",
    categoryExtras: {},
    salePrice: "",
    listPrice: "",
    quantity: 1,
    description: "",
    hashtags: [],
    tradeMethods: { parcel: true, vluePay: true },
    shipping: {
      feePayer: "buyer",
      shippingFee: "",
      leadDays: "3"
    },
    previews: [],
    listingType: "photo_gallery",
    mediaPrimary: null,
    syncToMyPage: false,
    keywords: "",
    inlineUrl: "",
    draft: null,
    inlineItem: null,
    provider: ""
  };
}

export function validateSourcingForm(state, opts = {}) {
  const missing = [];
  if (!state.title.trim()) missing.push({ id: "basic", label: "상품명" });
  if (!state.category) missing.push({ id: "basic", label: "카테고리" });
  if (opts.saleType === "auction") {
    const auction = state.auction || {};
    if (!parsePriceDigits(auction.startPrice)) missing.push({ id: "auction", label: "시작 금액" });
    if (!auction.startsAt) missing.push({ id: "auction", label: "경매 시작 일시" });
    if (!auction.endsAt) missing.push({ id: "auction", label: "경매 종료 일시" });
  } else if (!parsePriceDigits(state.salePrice)) {
    missing.push({ id: "price", label: "판매가" });
  }
  if (state.listingType === "media_single" && !state.mediaPrimary?.url) {
    missing.push({ id: "media", label: "미디어(사진·영상)" });
  }
  return missing;
}

export function sectionComplete(state, sectionId) {
  switch (sectionId) {
    case "basic":
      return Boolean(state.title.trim() && state.category);
    case "price":
      return Boolean(parsePriceDigits(state.salePrice));
    case "detail":
      return Boolean(state.description.trim() || state.hashtags.length);
    case "shipping":
      return !state.tradeMethods.parcel || Boolean(state.shipping.leadDays);
    case "photos":
    case "media":
      return sourcingHasVisualMedia(state);
    case "ai":
      return Boolean(state.draft || state.keywords.trim());
    case "url":
      return Boolean(state.inlineUrl.trim() || state.inlineItem);
    default:
      return false;
  }
}

export function readSourcingDraft() {
  try {
    const raw = localStorage.getItem(SOURCING_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSourcingDraft(state) {
  try {
    localStorage.setItem(SOURCING_DRAFT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearSourcingDraft() {
  try {
    localStorage.removeItem(SOURCING_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
