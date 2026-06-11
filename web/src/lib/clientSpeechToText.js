/**
 * 온디바이스 STT — Web Speech API (Android WebView / Chrome)
 * 오디오 파일을 서버로 전송하지 않음.
 */

export function hasClientSpeechRecognition() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * @param {{ lang?: string, onInterim?: (text: string) => void, timeoutMs?: number }} [options]
 * @returns {Promise<string>}
 */
export function listenClientSpeech(options = {}) {
  const { lang = "ko-KR", onInterim, timeoutMs = 12000 } = options;
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      reject(new Error("이 기기에서는 음성 인식을 지원하지 않습니다."));
      return;
    }

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      fn(value);
    };

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = Boolean(onInterim);
    rec.maxAlternatives = 1;

    const timer = setTimeout(() => {
      finish(resolve, "");
    }, timeoutMs);

    rec.onresult = (e) => {
      const last = e.results?.[e.results.length - 1];
      const text = last?.[0]?.transcript?.trim() || "";
      if (last?.isFinal) {
        finish(resolve, text);
      } else if (onInterim && text) {
        onInterim(text);
      }
    };
    rec.onerror = (e) => {
      const code = e?.error || "unknown";
      if (code === "no-speech") {
        finish(resolve, "");
        return;
      }
      finish(reject, new Error("음성 인식에 실패했습니다."));
    };
    rec.onend = () => {
      if (!settled) finish(resolve, "");
    };

    try {
      rec.start();
    } catch (err) {
      settled = true;
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error("음성 인식을 시작할 수 없습니다."));
    }
  });
}
