/**
 * DB에 없거나 탈퇴·정지된 계정인데 로컬에 로그인 세션이 남은 경우 강제 로그아웃.
 * peer 조회 404 `user_not_found` 와 구분 — 본인 401 ACCOUNT_INACTIVE / USER_NOT_FOUND 만.
 */
import { clearVlueSessionTokens } from "./vlueAuthHeaders.js";
import { clearAccountScopedLocalStorage } from "./clearAccountScopedLocalStorage.js";

export const VLUE_APP_SESSION_KEY = "vlue_logged_in";
export const VLUE_MARKETING_SESSION_KEY = "vlue_marketing_logged_in";
export const VLUE_ONBOARDING_DONE_KEY = "vlue_onboarding_complete_v1";
export const VLUE_FORCE_LOGOUT_EVENT = "vlue-force-logout-inactive";

let forceLogoutInFlight = false;

/** @param {unknown} data */
export function isInactiveAccountPayload(data) {
  if (!data || typeof data !== "object") return false;
  const code = String(/** @type {{ code?: string }} */ (data).code || "").toUpperCase();
  if (code === "ACCOUNT_INACTIVE" || code === "USER_NOT_FOUND") return true;
  const err = String(/** @type {{ error?: string }} */ (data).error || "");
  if (/탈퇴|정지된 계정/.test(err)) return true;
  return false;
}

/**
 * @param {{ reason?: string, message?: string }} [detail]
 */
export function forceLogoutInactiveAccount(detail = {}) {
  if (forceLogoutInFlight) return;
  forceLogoutInFlight = true;
  try {
    clearVlueSessionTokens();
    clearAccountScopedLocalStorage({ keepRememberLogin: true, keepOnboarding: false });
    try {
      localStorage.setItem(VLUE_APP_SESSION_KEY, "0");
      localStorage.setItem(VLUE_MARKETING_SESSION_KEY, "0");
      localStorage.setItem(VLUE_ONBOARDING_DONE_KEY, "0");
      localStorage.removeItem("vlue_server_user_id");
      localStorage.removeItem("vlue_member_handle");
      localStorage.removeItem("vlue_legal_name");
      localStorage.removeItem("vlue_account_status");
    } catch {
      /* ignore */
    }
    const message =
      String(detail.message || "").trim() ||
      "계정이 없거나 탈퇴된 상태입니다. 다시 본인인증 후 가입해 주세요.";
    try {
      window.dispatchEvent(
        new CustomEvent(VLUE_FORCE_LOGOUT_EVENT, {
          detail: { reason: detail.reason || "ACCOUNT_INACTIVE", message }
        })
      );
    } catch {
      /* ignore */
    }
  } finally {
    window.setTimeout(() => {
      forceLogoutInFlight = false;
    }, 2500);
  }
}

/** 401 응답이면 clone 파싱 후 필요 시 강제 로그아웃 */
export async function maybeForceLogoutFrom401(res) {
  if (!res || res.status !== 401) return;
  try {
    const data = await res.clone().json();
    if (isInactiveAccountPayload(data)) {
      forceLogoutInactiveAccount({
        reason: String(data?.code || "ACCOUNT_INACTIVE"),
        message: String(data?.error || "").trim() || undefined
      });
    }
  } catch {
    /* ignore */
  }
}
