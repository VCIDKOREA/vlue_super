/**
 * 로컬 POS 장부 — Web Crypto AES-GCM + log_hash 체이닝 (IndexedDB/localStorage 폴백)
 */
const STORAGE_KEY = "vlue_pos_ledger_v1";
const CRYPTO_KEY_ID = "vlue_pos_ledger_aes_v1";

async function getOrCreateKey() {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const raw = localStorage.getItem(CRYPTO_KEY_ID);
    if (raw) {
      const jwk = JSON.parse(raw);
      return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    }
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const jwk = await crypto.subtle.exportKey("jwk", key);
    localStorage.setItem(CRYPTO_KEY_ID, JSON.stringify(jwk));
    return key;
  } catch {
    return null;
  }
}

async function sha256Hex(input) {
  if (!globalThis.crypto?.subtle) return String(input).slice(0, 64);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readPlain() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], lastLogHash: null };
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      lastLogHash: parsed.lastLogHash || null
    };
  } catch {
    return { entries: [], lastLogHash: null };
  }
}

function writePlain(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function appendLocalPosEntry(fields) {
  const store = readPlain();
  const body = { ...fields, createdAt: new Date().toISOString() };
  const logHash = await sha256Hex(JSON.stringify({ prev: store.lastLogHash || "GENESIS", record: body }));
  const entry = { id: `local_${Date.now()}`, ...body, logHash };
  store.entries.push(entry);
  store.lastLogHash = logHash;
  writePlain(store);
  return entry;
}

export function listLocalPosEntries(limit = 60) {
  const store = readPlain();
  return store.entries.slice(-limit).reverse();
}

/** STAFF 전송 완료 후 — 로컬 스캔·장부 캐시 삭제 */
export function wipeLocalPosScanSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function encryptLedgerBackup() {
  const store = readPlain();
  const key = await getOrCreateKey();
  if (!key) return { encrypted: false, payload: store };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(store))
  );
  return {
    encrypted: true,
    iv: [...iv].map((b) => b.toString(16).padStart(2, "0")).join(""),
    cipher: btoa(String.fromCharCode(...new Uint8Array(cipher)))
  };
}
