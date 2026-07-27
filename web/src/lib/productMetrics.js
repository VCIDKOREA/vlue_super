import { apiUrl } from "./apiBase.js";
import { vlueAuthHeaders } from "./vlueAuthHeaders.js";

const DEDUPE_MS = 8_000;
const lastSent = new Map();

/**
 * 제품 지표 이벤트 (관리자 DB 차트용). 실패해도 UX에 영향 없음.
 * @param {"call_interface"|"showcase_view"} eventType
 * @param {{ targetUserId?: string, source?: string, meta?: object }} [opts]
 */
export function trackProductMetric(eventType, opts = {}) {
  const type = String(eventType || "").trim();
  if (type !== "call_interface" && type !== "showcase_view") return;
  if (typeof window === "undefined") return;

  const source = String(opts.source || "").trim().slice(0, 40);
  const targetUserId = String(opts.targetUserId || "").trim();
  const dedupeKey = `${type}|${source}|${targetUserId}`;
  const now = Date.now();
  const prev = lastSent.get(dedupeKey) || 0;
  if (now - prev < DEDUPE_MS) return;
  lastSent.set(dedupeKey, now);

  try {
    void fetch(apiUrl("/api/metrics/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
      body: JSON.stringify({
        eventType: type,
        targetUserId: targetUserId || undefined,
        source: source || undefined,
        meta: opts.meta && typeof opts.meta === "object" ? opts.meta : undefined
      }),
      keepalive: true
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function trackCallInterfaceUse(source = "preview") {
  trackProductMetric("call_interface", { source });
}

export function trackShowcaseView(source = "preview", targetUserId = "") {
  trackProductMetric("showcase_view", { source, targetUserId });
}
