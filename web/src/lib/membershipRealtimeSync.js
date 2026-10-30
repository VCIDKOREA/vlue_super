import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizeMembershipKind } from "./membershipBm.js";

/**
 * 웹 PG 결제/웹훅 후 앱 로컬 권한·배지 즉시 동기화 (재부팅 불필요)
 * @param {{ applyLoginMembershipTier?: (data: object) => void, onToast?: (msg: string) => void }} [opts]
 */
export async function refreshMembershipFromServer(opts = {}) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), {
      headers: vlueAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "me-context_failed" };

    if (typeof opts.applyLoginMembershipTier === "function") {
      opts.applyLoginMembershipTier(data);
    } else {
      const raw = String(data?.membershipTier || data?.membershipKind || "")
        .trim()
        .toLowerCase();
      const kind = normalizeMembershipKind(raw === "standard" || raw === "premium" ? "paid" : raw) || "free";
      try {
        localStorage.setItem("membershipTier", kind);
        localStorage.setItem("vlue_membership_tier", kind);
        localStorage.setItem("vlue_membership_kind", kind);
      } catch {
        /* ignore */
      }
    }

    try {
      window.dispatchEvent(
        new CustomEvent("vlue-membership-changed", {
          detail: {
            source: "realtime_sync",
            membershipTier: data?.membershipTier || data?.membershipKind,
            vlueVerifiedBadge: data?.vlueVerifiedBadge ?? data?.cyanBadgeActive
          }
        })
      );
      window.dispatchEvent(new CustomEvent("vlue-verified-badge-changed"));
    } catch {
      /* ignore */
    }

    if (opts.onToast && (data?.membershipTier === "paid" || data?.membershipKind === "paid")) {
      opts.onToast("유료 권한이 동기화되었습니다.");
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

export function isPaidMembershipSseEvent(data) {
  const t = String(data?.type || "");
  return t === "vlue-paid-membership" || t === "vlue-line-billing";
}
