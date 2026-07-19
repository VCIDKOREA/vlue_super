/**
 * 웹 명함 OCR — Tesseract.js (kor+eng) via CDN
 * Android 네이티브 ML Kit이 없을 때 폴백. 별도 클라우드 API·npm 패키지 불필요.
 */

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

let workerPromise = null;
let preloadStarted = false;
let tesseractApiPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("document unavailable"));
      return;
    }
    if (window.Tesseract?.createWorker) {
      resolve(window.Tesseract);
      return;
    }
    const existing = document.querySelector(`script[data-vlue-tesseract="1"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Tesseract?.createWorker) resolve(window.Tesseract);
        else reject(new Error("Tesseract CDN load failed"));
      });
      existing.addEventListener("error", () => reject(new Error("Tesseract CDN network error")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.vlueTesseract = "1";
    s.onload = () => {
      if (window.Tesseract?.createWorker) resolve(window.Tesseract);
      else reject(new Error("Tesseract CDN load failed"));
    };
    s.onerror = () => reject(new Error("Tesseract CDN network error"));
    document.head.appendChild(s);
  });
}

async function loadTesseractApi() {
  if (tesseractApiPromise) return tesseractApiPromise;
  tesseractApiPromise = loadScript(TESSERACT_CDN).catch((err) => {
    tesseractApiPromise = null;
    throw err;
  });
  return tesseractApiPromise;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await loadTesseractApi();
      const worker = await Tesseract.createWorker("kor+eng", 1, {
        errorHandler: () => undefined
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** 스캐너 화면 열릴 때 워커·언어팩 미리 받아 촬영 대기 시간 단축 */
export function preloadBizcardTesseract() {
  if (preloadStarted) return;
  preloadStarted = true;
  void getWorker().catch(() => {
    preloadStarted = false;
  });
}

/**
 * @param {string} dataUrl
 * @returns {Promise<string>}
 */
export async function runTesseractBizcardOcr(dataUrl) {
  if (!dataUrl) return "";
  const worker = await getWorker();
  const result = await worker.recognize(dataUrl);
  return String(result?.data?.text || "").trim();
}
