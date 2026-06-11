/** Android ML Kit — 일반 문서 블록 OCR (bounding box + 텍스트) */
let documentOcrWaiter = null;

export function registerDocumentOcrBridge() {
  if (typeof window === "undefined") return;
  const prev = window.VlueFamilyBridge || {};
  window.VlueFamilyBridge = {
    ...prev,
    onDocumentOcrResult: (payload) => {
      const data =
        payload && typeof payload === "object"
          ? payload
          : { text: String(payload || ""), blocks: [] };
      if (documentOcrWaiter) {
        documentOcrWaiter.resolve(data);
        documentOcrWaiter = null;
      }
    }
  };
}

export function hasNativeDocumentOcr() {
  try {
    return Boolean(window.VlueFamilyBridgeNative?.runDocumentOcr);
  } catch {
    return false;
  }
}

export function runNativeDocumentOcr(dataUrl, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const native = window.VlueFamilyBridgeNative;
    if (!native?.runDocumentOcr || !dataUrl) {
      resolve({ text: "", blocks: [], imageWidth: 0, imageHeight: 0 });
      return;
    }
    const timer = setTimeout(() => {
      documentOcrWaiter = null;
      resolve({ text: "", blocks: [], imageWidth: 0, imageHeight: 0 });
    }, timeoutMs);
    documentOcrWaiter = {
      resolve: (data) => {
        clearTimeout(timer);
        resolve({
          text: data?.text || "",
          blocks: Array.isArray(data?.blocks) ? data.blocks : [],
          imageWidth: data?.imageWidth || 0,
          imageHeight: data?.imageHeight || 0
        });
      }
    };
    try {
      native.runDocumentOcr(String(dataUrl));
    } catch {
      clearTimeout(timer);
      documentOcrWaiter = null;
      resolve({ text: "", blocks: [], imageWidth: 0, imageHeight: 0 });
    }
  });
}
