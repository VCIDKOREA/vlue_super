/** Android Google ML Kit Translation — 온디바이스 무료 번역 */

let mlKitWaiter = null;

export function registerMlKitTranslationBridge() {
  if (typeof window === "undefined") return;
  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onMlKitTranslateResult: (payload) => {
      const data =
        payload && typeof payload === "object"
          ? payload
          : { translated: String(payload || ""), confidence: 0 };
      if (mlKitWaiter) {
        mlKitWaiter.resolve(data);
        mlKitWaiter = null;
      }
    }
  };
}

export function hasNativeMlKitTranslation() {
  try {
    return Boolean(window.VlueFamilyBridgeNative?.runMlKitTranslate);
  } catch {
    return false;
  }
}

export function runNativeMlKitTranslate(text, sourceLang, targetLang, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const native = window.VlueFamilyBridgeNative;
    if (!native?.runMlKitTranslate || !text) {
      resolve({ translated: "", confidence: 0, source: "none" });
      return;
    }
    const timer = setTimeout(() => {
      mlKitWaiter = null;
      resolve({ translated: "", confidence: 0, source: "timeout" });
    }, timeoutMs);
    mlKitWaiter = {
      resolve: (data) => {
        clearTimeout(timer);
        resolve({
          translated: data?.translated || "",
          confidence: Number(data?.confidence ?? 0.7),
          source: "mlkit"
        });
      }
    };
    try {
      native.runMlKitTranslate(
        JSON.stringify({
          text: String(text),
          sourceLang: sourceLang || "ko",
          targetLang: targetLang || "en"
        })
      );
    } catch {
      clearTimeout(timer);
      mlKitWaiter = null;
      resolve({ translated: "", confidence: 0, source: "error" });
    }
  });
}
