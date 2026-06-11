import { applyLocalSpellingDictionary } from "./localSpellingDictionary.js";
import { postSpellingCheck } from "./spellingCheckApi.js";

/** 맞춤법 교정 파이프라인 — debounce 후 호출 (타이핑 중 실시간 API 금지) */
export async function runSpellingCorrectionPipeline(text) {
  const input = String(text || "").trim();
  if (!input) {
    return { corrected_text: "", source: "empty", corrections: [] };
  }

  console.info("[spelling] pipeline start", { chars: input.length });

  const layer1 = applyLocalSpellingDictionary(input);
  console.info("[spelling] layer1", {
    fullyResolved: layer1.fullyResolved,
    corrections: layer1.corrections.length
  });

  if (layer1.fullyResolved && layer1.text !== input) {
    console.info("[spelling] pipeline end — layer1 only");
    return {
      corrected_text: layer1.text,
      source: "local-spelling",
      corrections: layer1.corrections,
      original: input,
      reason: "로컬 맞춤법 사전"
    };
  }

  if (layer1.fullyResolved && layer1.text === input) {
    return {
      corrected_text: input,
      source: "unchanged",
      corrections: [],
      original: input,
      reason: "교정 불필요"
    };
  }

  try {
    const layer2 = await postSpellingCheck(input, layer1.text);
    const out = layer2.corrected_text || layer1.text || input;
    console.info("[spelling] pipeline end — layer2");
    return {
      corrected_text: out,
      source: layer2.source,
      corrections: layer1.corrections,
      original: input,
      reason: "AI 맞춤법 검사"
    };
  } catch (e) {
    console.warn("[spelling] layer2 failed — local draft", e?.message);
    if (layer1.text !== input) {
      return {
        corrected_text: layer1.text,
        source: "local-fallback",
        corrections: layer1.corrections,
        original: input,
        reason: "로컬 교정만 적용"
      };
    }
    throw e;
  }
}
