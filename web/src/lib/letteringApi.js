import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizePhoneDigits } from "./letteringPhoneMatch.js";

export async function checkLetteringPhoneBlocked(raw) {
  const q = encodeURIComponent(String(raw || "").trim());
  if (!q) return { blocked: false };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/blocks/check?number=${q}`), {
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { blocked: false, ...data };
    return data;
  } catch {
    return { blocked: false };
  }
}

export async function postLetteringPhoneBlock(raw, meta = {}) {
  const phone = String(raw || "").trim();
  if (!phone) return { ok: false, error: "no_phone" };
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/blocks"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        reason: meta.reason || "",
        reportId: meta.reportId || ""
      })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

export async function postLetteringReport({ phone, reasonId, detail, card, verified }) {
  const digits = normalizePhoneDigits(phone);
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/reports"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: digits || phone,
        reasonId,
        detail,
        verified: Boolean(verified),
        cardSnapshot: card
          ? {
              name: card.name || "",
              title: card.title || "",
              organization: card.organization || "",
              phone: card.phone || "",
              feedId: card.feedId || ""
            }
          : null
      })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** 발신자 제보 — 한 줄 라벨만 DB 저장 */
export async function postLetteringTip({ phone, label = "", displayName = "", organization = "", note = "" }) {
  const digits = normalizePhoneDigits(phone);
  const tipLabel = String(label || displayName || organization || note || "")
    .trim()
    .replace(/\s+/g, " ");
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/tips"), {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: digits || phone,
        label: tipLabel
      })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** 번호별 제보 집계 (쇼케이스 송출) */
export async function fetchLetteringTipSummary(phone) {
  const raw = String(phone || "").trim();
  const q = encodeURIComponent(raw);
  if (!q) {
    return {
      ok: false,
      tipCount: 0,
      topLabel: "",
      topCount: 0,
      labels: [],
      analysis: { status: "none", message: "분석결과는 없습니다" }
    };
  }
  try {
    const res = await fetch(apiUrl(`/api/lettering/tips/summary?number=${q}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        tipCount: 0,
        topLabel: "",
        topCount: 0,
        labels: [],
        analysis: { status: "none", message: "분석결과는 없습니다" }
      };
    }
    return {
      ok: true,
      phoneE164: data.phoneE164 || "",
      tipCount: Number(data.tipCount) || 0,
      topLabel: String(data.topLabel || "").trim(),
      topCount: Number(data.topCount) || 0,
      labels: Array.isArray(data.labels) ? data.labels : [],
      analysis: data.analysis || { status: "none", message: "분석결과는 없습니다" }
    };
  } catch {
    return {
      ok: false,
      tipCount: 0,
      topLabel: "",
      topCount: 0,
      labels: [],
      analysis: { status: "none", message: "분석결과는 없습니다" }
    };
  }
}
