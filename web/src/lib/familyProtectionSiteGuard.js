import { reportRiskySiteAccess } from "./familyProtectionApi.js";

let activeChildWard = false;

/** 자녀 피보호자일 때만 외부 URL 감시 */
export function setFamilyChildWardActive(active) {
  activeChildWard = Boolean(active);
}

function shouldInspectUrl(url) {
  if (!activeChildWard || !url) return false;
  try {
    const u = new URL(url, window.location.href);
    if (u.protocol === "http:" || u.protocol === "https:") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** VLUE 웹뷰·인앱 브라우저 — 링크 클릭·window.open 감시 */
export function installFamilySiteGuard() {
  if (typeof window === "undefined" || window.__vlueFamilySiteGuard) return;
  window.__vlueFamilySiteGuard = true;

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target?.closest?.("a[href]");
      if (!a?.href || !shouldInspectUrl(a.href)) return;
      reportRiskySiteAccess(a.href, document.location.href).catch(() => {});
    },
    true
  );

  const origOpen = window.open;
  window.open = function patchedOpen(url, ...rest) {
    if (typeof url === "string" && shouldInspectUrl(url)) {
      reportRiskySiteAccess(url, document.location.href).catch(() => {});
    }
    return origOpen.call(window, url, ...rest);
  };
}
