/** Web Speech API — 한국어 길안내 TTS (터치 언락 + 큐 + 무음 방지) */

let muted = false;
let lastKey = "";
let lastAt = 0;
let unlocked = false;
let audioCtx = null;
let resumeTimer = 0;
const queue = [];
let speaking = false;

function nativeBridge() {
  if (typeof window === "undefined") return null;
  return window.Android || window.VlueLettering || null;
}

function nativeSpeak(text, interrupt) {
  const bridge = nativeBridge();
  const phrase = String(text || "").trim();
  if (!bridge || !phrase) return false;
  try {
    if (interrupt && typeof bridge.speakVmapNow === "function") {
      bridge.speakVmapNow(phrase);
      return true;
    }
    if (typeof bridge.speakVmap === "function") {
      bridge.speakVmap(phrase);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function ensureResumeHeartbeat() {
  if (resumeTimer || typeof window === "undefined") return;
  resumeTimer = window.setInterval(() => {
    try {
      window.speechSynthesis?.resume?.();
    } catch {
      /* ignore */
    }
    try {
      if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
    } catch {
      /* ignore */
    }
  }, 4000);
}

export function setVmapTtsMuted(next) {
  muted = Boolean(next);
  if (muted && typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    try {
      nativeBridge()?.speakVmapNow?.("");
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
 * 무음 utterance + cancel() 은 안드로이드 WebView에서 이후 멘트를 삼키므로 하지 않는다.
 */
export function unlockVmapSpeech() {
  if (typeof window === "undefined") return false;
  unlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx || audioCtx.state === "closed") audioCtx = new Ctx();
      if (audioCtx.state === "suspended") void audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }
  } catch {
    /* ignore */
  }
  try {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.getVoices?.();
      synth.resume?.();
      if (!synth.__vmapVoicesHook) {
        synth.__vmapVoicesHook = true;
        synth.addEventListener?.("voiceschanged", () => {
          try {
            synth.resume?.();
          } catch {
            /* ignore */
          }
          pumpQueue();
        });
      }
    }
  } catch {
    /* ignore */
  }
  try {
    nativeBridge()?.warmVmapSpeech?.();
  } catch {
    /* ignore */
  }
  ensureResumeHeartbeat();
  return true;
}

function pumpQueue() {
  if (speaking || muted || typeof window === "undefined") return;
  const next = queue.shift();
  if (!next) return;
  speaking = true;
  const phrase = next.text;
  const finish = () => {
    if (!speaking) return;
    speaking = false;
    pumpQueue();
  };
  let heard = false;
  let settled = false;
  let fallbackTimer = 0;
  let stuckTimer = 0;
  const done = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(stuckTimer);
    window.clearTimeout(fallbackTimer);
    finish();
  };
  const synth = window.speechSynthesis;
  if (!synth) {
    nativeSpeak(phrase, Boolean(next.interrupt));
    window.setTimeout(done, Math.min(12000, 800 + phrase.length * 160));
    return;
  }
  try {
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.lang = "ko-KR";
    utter.rate = 1.02;
    utter.pitch = 1;
    utter.volume = 1;
    try {
      const voices = synth.getVoices?.() || [];
      const ko = voices.find((voice) => /ko[-_]?KR/i.test(voice.lang)) || voices.find((voice) => /^ko/i.test(voice.lang));
      if (ko) utter.voice = ko;
    } catch {
      /* ignore */
    }
    utter.onstart = () => {
      heard = true;
    };
    utter.onend = done;
    utter.onerror = () => {
      if (!heard) nativeSpeak(phrase, Boolean(next.interrupt));
      done();
    };
    synth.resume?.();
    synth.speak(utter);
  } catch {
    nativeSpeak(phrase, Boolean(next.interrupt));
    done();
    return;
  }
  fallbackTimer = window.setTimeout(() => {
    if (settled || heard) return;
    try {
      if (synth.speaking || synth.pending) {
        heard = true;
        return;
      }
    } catch {
      /* ignore */
    }
    nativeSpeak(phrase, Boolean(next.interrupt));
  }, 450);
  stuckTimer = window.setTimeout(done, Math.min(14000, 900 + phrase.length * 180));
}

export function speakVmapGuide(text, options = {}) {
  if (muted || typeof window === "undefined") return false;
  const phrase = String(text || "").trim();
  if (!phrase) return false;
  const key = String(options.key || phrase);
  const now = Date.now();
  if (!options.interrupt && key === lastKey && now - lastAt < (options.dedupeMs || 12000)) return false;
  lastKey = key;
  lastAt = now;
  if (!unlocked) unlockVmapSpeech();
  let cancelledLive = false;
  if (options.interrupt) {
    queue.length = 0;
    if (speaking) {
      cancelledLive = true;
      speaking = false;
      try {
        window.speechSynthesis?.cancel?.();
      } catch {
        /* ignore */
      }
      try {
        nativeBridge()?.speakVmapNow?.("");
      } catch {
        /* ignore */
      }
    }
  }
  queue.push({ text: phrase, key, interrupt: Boolean(options.interrupt) });
  if (cancelledLive) window.setTimeout(pumpQueue, 80);
  else pumpQueue();
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
