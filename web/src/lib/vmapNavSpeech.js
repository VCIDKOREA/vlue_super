/** Web Speech API — 한국어 턴바이턴 TTS (중복 방지 + mute) */

let muted = false;
let lastKey = "";
let lastAt = 0;

export function setVmapTtsMuted(next) {
  muted = Boolean(next);
  if (muted && typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  return muted;
}

export function isVmapTtsMuted() {
  return muted;
}

export function speakVmapGuide(text, options = {}) {
  if (muted || typeof window === "undefined" || !window.speechSynthesis) return false;
  const phrase = String(text || "").trim();
  if (!phrase) return false;
  const key = String(options.key || phrase);
  const now = Date.now();
  if (key === lastKey && now - lastAt < (options.dedupeMs || 12000)) return false;
  lastKey = key;
  lastAt = now;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.lang = "ko-KR";
    utter.rate = 1.05;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function formatTurnSpeech(cue) {
  if (!cue) return "";
  const dist = Number(cue.distanceM);
  const distLabel =
    Number.isFinite(dist) && dist > 0
      ? dist >= 1000
        ? `${(dist / 1000).toFixed(1)}킬로미터`
        : `${Math.round(dist)}미터`
      : "";
  const action = String(cue.instruction || cue.text || "").trim() || "직진";
  if (distLabel) return `${distLabel} 앞 ${action}입니다`;
  return action;
}
