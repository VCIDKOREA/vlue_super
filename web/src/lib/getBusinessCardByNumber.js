import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizePhoneDigits, toKoreaNationalDigits } from "./letteringPhoneMatch.js";

/**
 * §3 — `GET /api/cards/by-number` 클라이언트 헬퍼 (웹·네이티브 공용 로직 분리)
 * 짧은 TTL 캐시로 통화목록 탭 즉시 오픈 체감 개선
 */
const byNumberCache = new Map();
const BY_NUMBER_TTL_MS = 60_000;
const byNumberInflight = new Map();

function cacheKey(raw, opts = {}) {
  const digits =
    toKoreaNationalDigits(raw) || normalizePhoneDigits(raw) || String(raw || "").replace(/\D/g, "");
  const purpose = opts.forCallOverlay ? "call_overlay" : "default";
  const route = String(opts.dcpRoute || "").trim();
  return `${digits}|${purpose}|${route}`;
}

/**
 * @param {string} raw 전화번호 임의 형식
 * @returns {Promise<object|null>}
 */
export async function getBusinessCardByNumber(raw, opts = {}) {
  const number = String(raw || "").trim();
  if (!number) return null;
  const key = cacheKey(number, opts);
  const now = Date.now();
  const cached = byNumberCache.get(key);
  if (cached && now - cached.at < BY_NUMBER_TTL_MS) return cached.value;
  const inflight = byNumberInflight.get(key);
  if (inflight) return inflight;

  const run = (async () => {
    try {
      const params = new URLSearchParams({ number });
      const route = String(opts.dcpRoute || "").trim();
      if (route) params.set("dcp_route", route);
      if (opts.forCallOverlay) params.set("purpose", "call_overlay");
      const res = await vlueAuthFetch(apiUrl(`/api/cards/by-number?${params.toString()}`), {
        headers: vlueAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      const value = !res.ok ? { ok: false, status: res.status, ...data } : { ok: true, ...data };
      byNumberCache.set(key, { at: Date.now(), value });
      return value;
    } catch {
      return null;
    } finally {
      byNumberInflight.delete(key);
    }
  })();

  byNumberInflight.set(key, run);
  return run;
}
