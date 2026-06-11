/**
 * Universal Translation Manager
 * 스캐너 OCR · 브이밍 STT · 채팅 말풍선 — 단일 번역 파이프라인
 *
 * 1) 로컬 캐시 (IndexedDB / Room)
 * 2) 온디바이스 ML Kit Translation (Android) · Chrome Translator
 * 3) 서버 경량 (딕셔너리·메모리) — standard 모드
 * 4) Gemini 최종 검수 — enhanced 모드 또는 낮은 신뢰도
 */
import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";
import { getTranslationFromLocalCache, saveTranslationToLocalCache } from "./translationLocalCache.js";
import { hasNativeMlKitTranslation, runNativeMlKitTranslate } from "./mlKitTranslationBridge.js";

export const TRANSLATE_LANGS = [
  { id: "en", label: "English", badge: "EN" },
  { id: "ja", label: "日本語", badge: "JA" },
  { id: "zh", label: "中文", badge: "ZH" },
  { id: "vi", label: "Tiếng Việt", badge: "VI" },
  { id: "th", label: "ไทย", badge: "TH" },
  { id: "ko", label: "한국어", badge: "KO" }
];

const browserTranslatorCache = new Map();

async function getBrowserTranslator(sourceLang, targetLang) {
  const key = `${sourceLang}->${targetLang}`;
  if (browserTranslatorCache.has(key)) return browserTranslatorCache.get(key);
  const T = window.Translator;
  if (!T?.create) return null;
  try {
    const can = await T.availability?.({ sourceLanguage: sourceLang, targetLanguage: targetLang });
    if (can === "unavailable") return null;
    const tr = await T.create({ sourceLanguage: sourceLang, targetLanguage: targetLang });
    browserTranslatorCache.set(key, tr);
    return tr;
  } catch {
    return null;
  }
}

export function assessTranslationConfidence(original, translated) {
  const src = String(original || "").trim();
  const out = String(translated || "").trim();
  if (!src || !out) return 0;
  if (src === out) return 0.15;
  const ratio = out.length / Math.max(src.length, 1);
  if (ratio < 0.2 || ratio > 4) return 0.35;
  if (/^[\[\(].*번역.*[\]\)]/i.test(out)) return 0.2;
  return 0.82;
}

async function runOnDeviceTranslation(text, sourceLang, targetLang) {
  if (sourceLang === targetLang) {
    return { translated: text, source: "identity", confidence: 1 };
  }

  if (hasNativeMlKitTranslation()) {
    const native = await runNativeMlKitTranslate(text, sourceLang, targetLang);
    if (native.translated) {
      return {
        translated: native.translated,
        source: "mlkit",
        confidence: native.confidence ?? assessTranslationConfidence(text, native.translated)
      };
    }
  }

  const browserTr = await getBrowserTranslator(sourceLang, targetLang);
  if (browserTr) {
    try {
      const translated = await browserTr.translate(text);
      const out = String(translated || "").trim();
      return {
        translated: out,
        source: "browser",
        confidence: assessTranslationConfidence(text, out)
      };
    } catch {
      /* server path */
    }
  }

  return { translated: "", source: "none", confidence: 0 };
}

async function postServerTranslate({
  text,
  sourceLang,
  targetLang,
  mode,
  draftTranslation,
  clientConfidence
}) {
  const res = await vlueAuthFetch(apiUrl("/api/translate/text"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang,
      mode,
      draftTranslation,
      clientConfidence
    })
  });
  if (!res.ok) throw new Error("번역 서버에 연결하지 못했습니다.");
  const data = await res.json();
  return {
    translated: data.translated || text,
    source: data.source || "server",
    cacheHit: Boolean(data.cacheHit),
    confidence: data.confidence ?? clientConfidence ?? 0.7,
    geminiReviewed: Boolean(data.geminiReviewed)
  };
}

/**
 * @param {object} input
 * @param {string} input.text
 * @param {string} [input.sourceLang]
 * @param {string} [input.targetLang]
 * @param {boolean} [input.enhanced] - 고도화 번역(Gemini 검수)
 * @param {'chat'|'scanner'|'vming'} [input.origin]
 */
export async function translateUniversal(input = {}) {
  const text = String(input.text || "").trim();
  const sourceLang = input.sourceLang || "ko";
  const targetLang = input.targetLang || "en";
  const enhanced = Boolean(input.enhanced);

  if (!text) {
    return { translated: "", source: "empty", cacheHit: false, confidence: 0 };
  }
  if (sourceLang === targetLang) {
    return { translated: text, source: "identity", cacheHit: false, confidence: 1 };
  }

  const cached = await getTranslationFromLocalCache(text, sourceLang, targetLang);
  if (cached) {
    return {
      translated: cached,
      source: "local-cache",
      cacheHit: true,
      confidence: 1
    };
  }

  const onDevice = await runOnDeviceTranslation(text, sourceLang, targetLang);
  const confidence = onDevice.confidence ?? assessTranslationConfidence(text, onDevice.translated);
  const needsGemini = enhanced || confidence < 0.55;

  if (onDevice.translated && !needsGemini) {
    await saveTranslationToLocalCache(text, sourceLang, targetLang, onDevice.translated);
    return {
      translated: onDevice.translated,
      source: onDevice.source,
      cacheHit: false,
      confidence
    };
  }

  const server = await postServerTranslate({
    text,
    sourceLang,
    targetLang,
    mode: needsGemini ? "enhanced" : "standard",
    draftTranslation: onDevice.translated || "",
    clientConfidence: confidence
  });

  if (server.translated) {
    await saveTranslationToLocalCache(text, sourceLang, targetLang, server.translated);
  }
  return server;
}

/** @deprecated — translateUniversal 사용 권장 */
export async function translateTextClientFirst(text, options = {}) {
  const result = await translateUniversal({
    text,
    sourceLang: options.sourceLang,
    targetLang: options.targetLang,
    enhanced: options.enhanced,
    origin: options.origin || "scanner"
  });
  return {
    translated: result.translated,
    source: result.source,
    cacheHit: result.cacheHit
  };
}

export const SCAN_TRANSLATE_LANGS = TRANSLATE_LANGS.filter((l) => l.id !== "th");
