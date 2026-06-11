/**
 * 브이밍 음성 번역 — Universal Translation Manager 연동
 */
import { listenClientSpeech, hasClientSpeechRecognition } from "./clientSpeechToText.js";
import { translateUniversal } from "./universalTranslationManager.js";

export { hasClientSpeechRecognition };

export async function runVmingVoiceTranslate(options = {}) {
  const { targetLang = "en", sourceLang = "ko", sttLang = "ko-KR", enhanced = false } = options;

  const original = await listenClientSpeech({ lang: sttLang });
  if (!original) {
    return { original: "", translated: "", translateSource: "empty", cacheHit: false };
  }

  const result = await translateUniversal({
    text: original,
    sourceLang,
    targetLang,
    enhanced,
    origin: "vming"
  });

  return {
    original,
    translated: result.translated,
    translateSource: result.source,
    cacheHit: result.cacheHit
  };
}

export function formatVoiceTranslateMessage({ original, translated, targetLang }) {
  if (!original) return "";
  if (!translated || translated === original) return original;
  const langLabel = targetLang?.toUpperCase() || "EN";
  return `${original}\n\n🌐 ${langLabel}: ${translated}`;
}
