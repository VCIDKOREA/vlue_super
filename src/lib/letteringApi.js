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
