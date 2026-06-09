import { apiUrl } from "./apiBase.js";
import { vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { pricingNumbers } from "./pricingConfig.js";

let accessCache = null;
let accessInflight = null;

export async function fetchMembershipAccess({ force = false } = {}) {
  if (!force && accessCache) return accessCache;
  if (!force && accessInflight) return accessInflight;
  accessInflight = fetch(apiUrl("/api/pricing/access"), { headers: vlueAuthHeaders() })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "멤버십 권한 조회 실패");
      accessCache = data.access;
      return accessCache;
    })
    .finally(() => {
      accessInflight = null;
    });
  return accessInflight;
}

export function clearMembershipAccessCache() {
  accessCache = null;
}

export async function requirePrimaryForFeature(feature, { onBlocked } = {}) {
  const nums = pricingNumbers();
  try {
    const access = await fetchMembershipAccess();
    const ok = feature === "chat" ? access?.canUseChat : access?.canUseShopping;
    if (ok) return { ok: true, access };
    const msg =
      feature === "chat"
        ? `채팅은 SOHO 활동형(월 ${nums.sohoMonthly.toLocaleString("ko-KR")}원) 또는 B2B 회선이 필요합니다.`
        : `쇼핑은 SOHO 활동형(월 ${nums.sohoMonthly.toLocaleString("ko-KR")}원) 또는 B2B 회선이 필요합니다.`;
    onBlocked?.(msg, access);
    return { ok: false, message: msg, access };
  } catch (e) {
    const msg = e?.message || "멤버십 확인에 실패했습니다.";
    onBlocked?.(msg, null);
    return { ok: false, message: msg, access: null };
  }
}
