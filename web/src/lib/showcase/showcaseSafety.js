const BLOCK_KEY = "vlue_showcase_blocked_v1";
const listeners = new Set();

const PROFANITY = [
  /시\s*발/gi,
  /씨\s*발/gi,
  /씨발/gi,
  /시발/gi,
  /병\s*신/gi,
  /지\s*랄/gi,
  /좆/gi,
  /개\s*새(?:끼)?/gi,
  /ㅅ\s*ㅂ/gi,
  /ㅂ\s*ㅅ/gi
];

export function maskProfanity(text) {
  let out = String(text || "");
  for (const pattern of PROFANITY) out = out.replace(pattern, "***");
  return out;
}

export function showcaseSubjectKey(card, phone) {
  return String(card?.userId || card?.ownerUserId || card?.id || phone || "").trim();
}

function readBlocked() {
  try {
    const raw = JSON.parse(localStorage.getItem(BLOCK_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

export function isShowcaseBlocked(key) {
  const id = String(key || "").trim();
  if (!id) return false;
  return readBlocked().has(id);
}

export function blockShowcase(key) {
  const id = String(key || "").trim();
  if (!id) return;
  const next = readBlocked();
  next.add(id);
  try {
    localStorage.setItem(BLOCK_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeShowcaseBlocks(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getShowcaseBlockSnapshot() {
  try {
    return localStorage.getItem(BLOCK_KEY) || "[]";
  } catch {
    return "[]";
  }
}
