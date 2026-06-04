import { getApiBase } from "./apiBase.js";
import {
  buildDynamicBizcardSvgDocument,
  cardToSvgSnapshot
} from "./bizcardSvgEngineCore.js";
import {
  getVlueViralLinks,
  resolvePublicCardApiBase
} from "./vlueViralLinks.js";

export { getVlueViralLinks, buildHostedCardViewUrl, buildCardThumbOgUrl, buildPublicCardViewUrl } from "./vlueViralLinks.js";
export { cardToSvgSnapshot } from "./bizcardSvgEngineCore.js";

function resolveExportApiBase() {
  const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  const fromGetter = getApiBase();
  const local =
    fromGetter.startsWith("http") && !fromGetter.includes("localhost") && !fromGetter.includes("127.0.0.1")
      ? fromGetter
      : fromEnv.startsWith("http") &&
          !fromEnv.includes("localhost") &&
          !fromEnv.includes("127.0.0.1")
        ? fromEnv
        : typeof window !== "undefined" && window.location?.origin
          ? window.location.origin.replace(/\/$/, "")
          : "";
  return resolvePublicCardApiBase(local);
}

export function buildBizcardSvgFileName(card) {
  const slug = String(card?.name || "vlue-card")
    .replace(/\s+/g, "-")
    .replace(/[^\w\u3131-\uD79D-]/g, "")
    .slice(0, 24);
  return `VLUE-${slug || "card"}.svg`;
}

export function downloadBizcardSvgFile(svg, fileName) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "VLUE-card.svg";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildExportableBizcardSvg(card, cardId) {
  const viral = getVlueViralLinks();
  return buildDynamicBizcardSvgDocument({
    card,
    cardId: cardId || "",
    apiBase: resolveExportApiBase(),
    createUrl: viral.createUrl
  });
}
