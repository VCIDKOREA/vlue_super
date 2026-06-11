/** 채팅방 번역 활성/스킵 정책 */

export function isMostlyKorean(text) {
  const chars = [...String(text || "").replace(/\s/g, "")];
  if (!chars.length) return false;
  const koCount = chars.filter((c) => /[\u3131-\uD79D]/.test(c)).length;
  return koCount / chars.length >= 0.35;
}

/** 번역 대상 언어가 한국어면 기능 전체 비활성 */
export function isTranslationEnabled(targetLang) {
  return String(targetLang || "en") !== "ko";
}

/** 자동 번역: 한국어 말풍선 → 외국어 대상일 때만 */
export function shouldAutoTranslateMessage(text, targetLang) {
  if (!isTranslationEnabled(targetLang)) return false;
  const t = String(text || "").trim();
  if (!t) return false;
  return isMostlyKorean(t);
}

/** 수동 번역: 한국어 대상이 아니면 허용 (이미 한국어 말풍선도 외국어로 번역 가능) */
export function shouldManualTranslateMessage(text, targetLang) {
  if (!isTranslationEnabled(targetLang)) return false;
  return Boolean(String(text || "").trim());
}

export function isTranslatableChatMessage(msg) {
  if (!msg?.id) return false;
  if (msg.type !== "me" && msg.type !== "target") return false;
  if (msg.card || msg.imageUrl || msg.audioUrl || msg.location || msg.promoCard) return false;
  if (/^\[명함카드\]/i.test(msg.text || "") || /^\[음성메시지\]/i.test(msg.text || "")) return false;
  return Boolean(String(msg.text || "").trim());
}
