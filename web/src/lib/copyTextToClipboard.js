/**
 * WebView·브라우저 공통 클립보드 복사.
 * Android WebView 환경에서는 window.Android.copyToClipboard(url) 를 1순위로 호출하여
 * Android OS ClipboardManager 를 직접 실행 (NotAllowedError 차단 및 100% 복사 보장).
 *
 * @param {string} text
 * @returns {Promise<{ ok: boolean, channel?: string, error?: string }>}
 */
export async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) {
    return { ok: false, error: "복사할 내용이 없습니다." };
  }

  /* 1순위: Android 네이티브 브리지 직접 호출 (최우선) */
  try {
    const bridge =
      typeof window !== "undefined"
        ? window.Android || window.VlueAndroid || null
        : null;

    if (bridge) {
      if (typeof bridge.copyToClipboard === "function" || "copyToClipboard" in bridge) {
        const r = bridge.copyToClipboard(value);
        const ok =
          r === true ||
          r === 1 ||
          r === "1" ||
          r === "ok" ||
          String(r).toLowerCase() === "true" ||
          r == null;
        if (ok) {
          return { ok: true, channel: "android_bridge" };
        }
      }
      if (typeof bridge.copyText === "function" || "copyText" in bridge) {
        const r = bridge.copyText(value);
        const ok =
          r === true ||
          r === 1 ||
          r === "1" ||
          r === "ok" ||
          String(r).toLowerCase() === "true" ||
          r == null;
        if (ok) {
          return { ok: true, channel: "android_bridge" };
        }
      }
    }
  } catch (err) {
    console.warn("[copyTextToClipboard] android bridge execution error:", err);
    /* fall through */
  }

  /* 2순위: Web Clipboard API */
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return { ok: true, channel: "clipboard_api" };
    }
  } catch (err) {
    console.warn("[copyTextToClipboard] navigator.clipboard error:", err);
    /* fall through */
  }

  /* 3순위: execCommand fallback (구형 브라우저) */
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      return { ok: true, channel: "execCommand" };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "주소를 복사하지 못했습니다."
    };
  }

  return { ok: false, error: "주소를 복사하지 못했습니다." };
}
