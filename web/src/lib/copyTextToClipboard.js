/**
 * WebView·브라우저 공통 클립보드 복사.
 * Android WebView는 navigator.clipboard.writeText 가 존재해도 NotAllowedError 로
 * 실패하는 경우가 많아, 실패 시 execCommand / 네이티브 브리지로 폴백한다.
 *
 * @param {string} text
 * @returns {Promise<{ ok: boolean, channel?: string, error?: string }>}
 */
export async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) {
    return { ok: false, error: "복사할 내용이 없습니다." };
  }

  /* 1) Android 네이티브 브리지 (가장 확실) */
  try {
    const bridge =
      typeof window !== "undefined" ? window.Android || window.VlueAndroid || null : null;
    if (bridge && typeof bridge.copyText === "function") {
      const r = bridge.copyText(value);
      const ok =
        r === true ||
        r === 1 ||
        r === "1" ||
        r === "ok" ||
        String(r).toLowerCase() === "true";
      /* Kotlin void 반환 시 JS null — 예외 없이 끝났으면 성공으로 간주 */
      if (ok || r == null) {
        return { ok: true, channel: "android_bridge" };
      }
    }
  } catch {
    /* fall through */
  }

  /* 2) Clipboard API — 실패해도 throw 하지 않고 폴백 */
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return { ok: true, channel: "clipboard_api" };
    }
  } catch {
    /* fall through */
  }

  /* 3) execCommand fallback (구형 WebView·권한 거부 대비) */
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
