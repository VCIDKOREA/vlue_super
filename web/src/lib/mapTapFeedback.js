/** V-Map / 가족지도 버튼 탭 피드백 — 짧은 클릭음 + 진동 */

let audioCtx = null;
let lastAt = 0;

function ensureAudio() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function playClick() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  } catch {
    /* ignore */
  }
}

function vibrateNative(ms) {
  try {
    const bridge = window.Android || window.VlueLettering;
    if (typeof bridge?.vibrateTap === "function") {
      bridge.vibrateTap(ms);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 지도 UI 버튼 탭 — 소리 + 짧은 진동 */
export function mapTapFeedback(strength = "light") {
  const now = Date.now();
  if (now - lastAt < 40) return;
  lastAt = now;
  const ms = strength === "heavy" ? 28 : 14;
  vibrateNative(ms);
  playClick();
}

export function bindMapTapFeedback(event) {
  const target = event?.target;
  if (!target || typeof target.closest !== "function") return;
  if (!target.closest("button, [data-map-tap], a[href]")) return;
  if (target.closest("[data-no-tap-feedback]")) return;
  mapTapFeedback("light");
}
