import { apiUrl } from "./apiBase.js";
import { vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { parseBizcardFromText } from "./bizcardOcrParser.js";

export const EMPTY_BIZCARD = {
  name: "",
  company: "",
  department: "",
  position: "",
  mobile: "",
  tel: "",
  fax: "",
  email: "",
  address: "",
  website: ""
};

function text(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return !s || s === "null" ? "" : s;
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isMobileNumber(value) {
  return /^01[016789]/.test(digits(value));
}

export function cardFromParser(parsed) {
  const phone = text(parsed?.phone);
  const mobile = isMobileNumber(phone) ? phone : "";
  const tel = phone && !mobile ? phone : "";
  return {
    ...EMPTY_BIZCARD,
    name: text(parsed?.name),
    company: text(parsed?.organization),
    position: text(parsed?.title),
    mobile,
    tel,
    fax: text(parsed?.fax),
    email: text(parsed?.email),
    address: text(parsed?.address),
    website: text(parsed?.website)
  };
}

export function cardFromApi(card) {
  return {
    name: text(card?.name),
    company: text(card?.company),
    department: text(card?.department),
    position: text(card?.position),
    mobile: text(card?.mobile),
    tel: text(card?.tel),
    fax: text(card?.fax),
    email: text(card?.email),
    address: text(card?.address),
    website: text(card?.website)
  };
}

export function localBizcardScan(ocrText) {
  return {
    card: cardFromParser(parseBizcardFromText(ocrText)),
    trust: {
      score: 0,
      badge: "미확인",
      dbMatched: false,
      placeMatched: false,
      partial: false,
      notes: ["기기에서 기본 분류만 했습니다."]
    },
    provider: "local"
  };
}

function imagePayload(dataUrl) {
  const raw = String(dataUrl || "");
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(raw);
  if (!match) return { imageBase64: "", mimeType: "" };
  if (match[2].length > 1_500_000) return { imageBase64: "", mimeType: "" };
  return { imageBase64: match[2], mimeType: match[1] };
}

/**
 * OCR 텍스트와 명함 이미지를 Gemini 구조화 파서와 신뢰도 검증에 넘긴다.
 * 서버가 실패하면 기존 정규식 분류로 돌아간다.
 */
export async function structureBizcardScan({ text, imageDataUrl }) {
  const ocr = String(text || "");
  const image = imagePayload(imageDataUrl);
  if (!ocr.trim() && !image.imageBase64) return localBizcardScan("");
  try {
    const res = await fetch(apiUrl("/api/v1/bizcard/scan"), {
      method: "POST",
      headers: vlueAuthHeaders(),
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({
        text: ocr.slice(0, 6000),
        imageBase64: image.imageBase64,
        mimeType: image.mimeType
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data.card) return localBizcardScan(ocr);
    return {
      card: cardFromApi(data.card),
      trust: {
        score: Number(data.trust?.score) || 0,
        badge: data.trust?.badge || "미확인",
        dbMatched: Boolean(data.trust?.dbMatched),
        placeMatched: Boolean(data.trust?.placeMatched),
        partial: Boolean(data.trust?.partial),
        notes: Array.isArray(data.trust?.notes) ? data.trust.notes : []
      },
      provider: data.provider || "gemini"
    };
  } catch {
    return localBizcardScan(ocr);
  }
}
