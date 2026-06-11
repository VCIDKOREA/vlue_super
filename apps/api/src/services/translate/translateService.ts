import { lookupPhraseDictionary, type PhraseLang } from "./phraseCache.js";
import { geminiTranslateReview, sanitizeTranslationPacket } from "./geminiTranslateReview.js";

type LangCode = PhraseLang;

const memoryCache = new Map<string, { translated: string; at: number }>();
const CACHE_MAX = 500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function cacheKey(text: string, sourceLang: string, targetLang: string) {
  return `${sourceLang}|${targetLang}|${text}`;
}

function readCache(key: string): string | null {
  const row = memoryCache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return row.translated;
}

function writeCache(key: string, translated: string) {
  if (memoryCache.size >= CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { translated, at: Date.now() });
}

export type TranslateResult = {
  translated: string;
  source: "dictionary" | "memory" | "draft" | "gemini" | "passthrough";
  cacheHit: boolean;
  confidence: number;
  geminiReviewed: boolean;
};

export async function translateTextPacket(input: {
  text: string;
  sourceLang?: string;
  targetLang?: string;
  mode?: "standard" | "enhanced";
  draftTranslation?: string;
  clientConfidence?: number;
}): Promise<TranslateResult> {
  const text = sanitizeTranslationPacket(String(input.text || ""));
  const sourceLang = (input.sourceLang || "ko") as LangCode;
  const targetLang = (input.targetLang || "en") as LangCode;
  const mode = input.mode === "enhanced" ? "enhanced" : "standard";
  const draft = sanitizeTranslationPacket(input.draftTranslation || "");
  const clientConfidence = Number(input.clientConfidence ?? 0);

  if (!text) {
    return { translated: "", source: "passthrough", cacheHit: false, confidence: 0, geminiReviewed: false };
  }
  if (sourceLang === targetLang) {
    return { translated: text, source: "passthrough", cacheHit: false, confidence: 1, geminiReviewed: false };
  }

  const dictHit = lookupPhraseDictionary(text, targetLang);
  if (dictHit) {
    return { translated: dictHit, source: "dictionary", cacheHit: true, confidence: 1, geminiReviewed: false };
  }

  const key = cacheKey(text, sourceLang, targetLang);
  const mem = readCache(key);
  if (mem) {
    return { translated: mem, source: "memory", cacheHit: true, confidence: 1, geminiReviewed: false };
  }

  const needsGemini = mode === "enhanced" || clientConfidence < 0.55;

  if (!needsGemini && draft) {
    writeCache(key, draft);
    return { translated: draft, source: "draft", cacheHit: false, confidence: clientConfidence, geminiReviewed: false };
  }

  if (needsGemini) {
    const gemini = await geminiTranslateReview({
      text,
      draftTranslation: draft,
      sourceLang,
      targetLang
    });
    if (gemini) {
      writeCache(key, gemini);
      return {
        translated: gemini,
        source: "gemini",
        cacheHit: false,
        confidence: 0.92,
        geminiReviewed: true
      };
    }
  }

  if (draft) {
    writeCache(key, draft);
    return { translated: draft, source: "draft", cacheHit: false, confidence: clientConfidence, geminiReviewed: false };
  }

  writeCache(key, text);
  return { translated: text, source: "passthrough", cacheHit: false, confidence: 0.3, geminiReviewed: false };
}
