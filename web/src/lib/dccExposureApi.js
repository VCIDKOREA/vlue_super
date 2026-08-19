import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export async function fetchDccExposure() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/dcc-exposure"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, exposure: null, error: data.error || data.message };
    return {
      ok: true,
      exposure: data.exposure || null,
      privacy: data.privacy || null
    };
  } catch (e) {
    return { ok: false, exposure: null, error: e?.message || "network" };
  }
}

export async function saveDccExposure(choice) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/dcc-exposure"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneSearch: choice.phoneSearch,
        addressSearch: choice.addressSearch,
        phoneFollow: choice.phoneFollow,
        addressFollow: choice.addressFollow
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "save_failed",
        message: data.message || "노출 설정을 지정해야 저장됩니다."
      };
    }
    return { ok: true, privacy: data.privacy };
  } catch (e) {
    return { ok: false, error: e?.message || "network", message: "네트워크를 확인해 주세요." };
  }
}
