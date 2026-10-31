/** Web Speech API — 한국어 길안내 TTS (터치 언락 + 큐 + 중복 방지) */

let muted = false;
let lastKey = "";
let lastAt = 0;
let unlocked = false;
let audioCtx = null;
const queue = [];
let speaking = false;

export function setVmapTtsMuted(next) {
  muted = Boolean(next);
  if (muted && typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    queue.length = 0;
    speaking = false;
  }
  return muted;
}

export function isVmapTtsMuted() {
  return muted;
}

/**
 * [출발] 클릭 제스처 안에서 호출. Autoplay 정책 우회용 AudioContext + SpeechSynthesis 워밍업.
 */
export function unlockVmapSpeech() {
  if (typeof window === "undefined") return false;
  unlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") void audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const warm = new SpeechSynthesisUtterance(" ");
      warm.lang = "ko-KR";
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
    }
  } catch {
    /* ignore */
  }
  return true;
}

function pumpQueue() {
  if (speaking || muted || typeof window === "undefined" || !window.speechSynthesis) return;
  const next = queue.shift();
  if (!next) return;
  speaking = true;
  try {
    const utter = new SpeechSynthesisUtterance(next.text);
    utter.lang = "ko-KR";
    utter.rate = 1.05;
    utter.pitch = 1;
    utter.onend = () => {
      speaking = false;
      pumpQueue();
    };
    utter.onerror = () => {
      speaking = false;
      pumpQueue();
    };
    window.speechSynthesis.speak(utter);
  } catch {
    speaking = false;
  }
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
  if (!unlocked) unlockVmapSpeech();
  if (options.interrupt) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    queue.length = 0;
    speaking = false;
  }
  queue.push({ text: phrase, key });
  pumpQueue();
  return true;
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
