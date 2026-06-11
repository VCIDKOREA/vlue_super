/** 원본:번역 쌍 — IndexedDB(웹) + Android Room 브리지 */

const DB_NAME = "vlue_translation_cache_v1";
const STORE = "pairs";
const MAX_ENTRIES = 2000;

function pairKey(sourceLang, targetLang, text) {
  const compact = String(text || "").trim();
  return `${sourceLang}|${targetLang}|${compact}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getTranslationFromLocalCache(text, sourceLang, targetLang) {
  const key = pairKey(sourceLang, targetLang, text);
  try {
    const native = window.VlueFamilyBridgeNative?.getTranslationCache?.(key);
    if (native) return String(native);
  } catch {
    /* ignore */
  }
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.translated || null);
    req.onerror = () => resolve(null);
  });
}

export async function saveTranslationToLocalCache(text, sourceLang, targetLang, translated) {
  const original = String(text || "").trim();
  const out = String(translated || "").trim();
  if (!original || !out) return;
  const key = pairKey(sourceLang, targetLang, original);
  const row = { key, original, translated: out, sourceLang, targetLang, at: Date.now() };
  try {
    window.VlueFamilyBridgeNative?.saveTranslationCache?.(JSON.stringify(row));
  } catch {
    /* ignore */
  }
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  try {
    const countReq = indexedDB.open(DB_NAME, 1);
    countReq.onsuccess = () => {
      const idb = countReq.result;
      const tx = idb.transaction(STORE, "readonly");
      const all = tx.objectStore(STORE).getAll();
      all.onsuccess = () => {
        const rows = all.result || [];
        if (rows.length <= MAX_ENTRIES) return;
        rows.sort((a, b) => (a.at || 0) - (b.at || 0));
        const drop = rows.slice(0, rows.length - MAX_ENTRIES);
        const wtx = idb.transaction(STORE, "readwrite");
        drop.forEach((r) => wtx.objectStore(STORE).delete(r.key));
      };
    };
  } catch {
    /* ignore */
  }
}
