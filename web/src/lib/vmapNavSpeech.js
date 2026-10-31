/** 길안내 TTS. 급한 상황이면 재생 중인 일반 안내를 끊고 그 문장만 말한다. */

import { TTS_PRIORITY } from "./vmapSpeechCues.js";

let muted = false;
let lastKey = "";
let lastAt = 0;
let unlocked = false;
let audioCtx = null;
let generation = 0;
let draining = false;
let cancelAt = 0;
/** 지금 엔진이 읽고 있는 문장. 이보다 급한 상황만 끊을 수 있다. */
let current = null;
const queue = [];

function nativeBridge() {
  if (typeof window === "undefined") return null;
  return window.Android || window.VlueLettering || null;
}

function estimatedMs(phrase) {
  return Math.min(14000, Math.max(700, String(phrase || "").length * 170));
}

function abortPlayback() {
  cancelAt = Date.now();
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

function priorityOf(options) {
  const level = Number(options?.priority);
  if (level === TTS_PRIORITY.URGENT || level === TTS_PRIORITY.NEAR || level === TTS_PRIORITY.GENERAL) return level;
  return TTS_PRIORITY.GENERAL;
}

export function setVmapTtsMuted(next) {
  muted = Boolean(next);
  if (muted) {
    generation += 1;
    queue.length = 0;
    abortPlayback();
  }
  return muted;
}

export function isVmapTtsMuted() {
  return muted;
}

/**
 * [출발] 클릭 제스처 안에서 호출. Autoplay 정책 우회용 AudioContext 워밍업.
 * speechSynthesis.resume() 반복 호출은 안드로이드에서 대기 멘트를 한꺼번에 터뜨리므로 하지 않는다.
 */
export function unlockVmapSpeech() {
  if (typeof window === "undefined") return false;
  unlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx || audioCtx.state === "closed") audioCtx = new Ctx();
      if (audioCtx.state === "suspended") void audioCtx.resume();
    }
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.getVoices?.();
  } catch {
    /* ignore */
  }
  try {
    nativeBridge()?.warmVmapSpeech?.();
  } catch {
    /* ignore */
  }
  return true;
}

function speakNative(phrase, gen) {
  return new Promise((resolve) => {
    if (gen !== generation || muted) {
      resolve();
      return;
    }
    const bridge = nativeBridge();
    const id = `v${gen}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const queued = typeof bridge?.speakVmapQueued === "function";
    let settled = false;
    let cap = 0;
    let watch = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(cap);
      window.clearInterval(watch);
      window.removeEventListener("vlue-vmap-tts-done", onDone);
      resolve();
    };
    const onDone = (event) => {
      const got = event?.detail?.id;
      if (got && got !== id) return;
      finish();
    };
    window.addEventListener("vlue-vmap-tts-done", onDone);
    watch = window.setInterval(() => {
      if (gen !== generation || muted) finish();
    }, 40);
    cap = window.setTimeout(finish, queued ? estimatedMs(phrase) + 4000 : estimatedMs(phrase));
    try {
      if (queued) bridge.speakVmapQueued(phrase, id);
      else bridge.speakVmap?.(phrase);
    } catch {
      finish();
    }
  });
}

function speakWeb(phrase, gen) {
  return new Promise((resolve) => {
    if (gen !== generation || muted) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) {
      window.setTimeout(resolve, estimatedMs(phrase));
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(cap);
      window.clearInterval(watch);
      resolve();
    };
    const started = Date.now();
    const minHold = estimatedMs(phrase);
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
    utter.onend = () => {
      const elapsed = Date.now() - started;
      /* 안드로이드 WebView 는 onend 가 재생 전에 바로 온다. 그 경우 추정 길이만큼 기다린다. */
      if (elapsed < minHold * 0.55) {
        window.setTimeout(finish, minHold - elapsed);
        return;
      }
      finish();
    };
    utter.onerror = () => {
      if (gen !== generation) {
        finish();
        return;
      }
      window.setTimeout(finish, 60);
    };
    const cap = window.setTimeout(finish, minHold + 2500);
    const watch = window.setInterval(() => {
      if (gen !== generation || muted) finish();
    }, 40);
    try {
      synth.speak(utter);
    } catch {
      finish();
    }
  });
}

function waitAfterCancel(gen) {
  const wait = Math.max(0, 90 - (Date.now() - cancelAt));
  if (!wait) return Promise.resolve(gen === generation && !muted);
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(gen === generation && !muted), wait);
  });
}

async function speakOne(phrase, gen) {
  const ready = await waitAfterCancel(gen);
  if (!ready) return;
  const bridge = nativeBridge();
  if (bridge && (typeof bridge.speakVmapQueued === "function" || typeof bridge.speakVmap === "function")) {
    await speakNative(phrase, gen);
    return;
  }
  await speakWeb(phrase, gen);
}

async function drain(gen) {
  if (draining) return;
  draining = true;
  try {
    while (gen === generation && !muted && queue.length) {
      const next = queue.shift();
      current = { priority: next.priority, key: next.key, gen };
      try {
        await speakOne(next.text, gen);
      } finally {
        if (current && current.gen === gen && current.key === next.key) current = null;
      }
    }
  } finally {
    draining = false;
    if (!muted && queue.length) void drain(generation);
  }
}

export function speakVmapGuide(text, options = {}) {
  if (muted || typeof window === "undefined") return false;
  const phrase = String(text || "").trim();
  if (!phrase) return false;
  const key = String(options.key || phrase);
  const priority = priorityOf(options);
  const force = Boolean(options.interrupt);
  const now = Date.now();
  if (!force && key === lastKey && now - lastAt < (options.dedupeMs || 12000)) return false;
  /* 이미 더 급하거나 같은 급의 문장을 읽는 중이면 지난 안내를 뒤에 쌓지 않는다. */
  if (!force && current && priority >= current.priority) return false;
  if (!unlocked) unlockVmapSpeech();
  const cut = force || (current && priority < current.priority);
  if (cut) {
    generation += 1;
    queue.length = 0;
    current = null;
    abortPlayback();
  }
  queue.length = 0;
  queue.push({ text: phrase, key, priority });
  lastKey = key;
  lastAt = now;
  void drain(generation);
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
