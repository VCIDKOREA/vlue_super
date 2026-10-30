/**
 * VLUE DCC 발급용 본인인증 가드.
 * - 소셜 즉시 가입 유저(미인증)는 DCC 진입 시 PASS 본인인증 필요
 * - 인증 직전 사전 안내 모달 → 이니시스 통합 본인인증
 */
import { requestIamportCertification } from "./iamportClient.js";
import { getPortoneUserCode } from "./portoneEnv.js";
import { postPortoneIdentityComplete } from "./identityCompleteApi.js";
import { setVlueSessionTokens } from "./vlueAuthHeaders.js";

export const DCC_IDENTITY_GUIDE_TITLE = "VLUE DCC 발급을 위한 본인인증";
export const DCC_IDENTITY_GUIDE_BODY =
  "원활한 인증 진행을 위해 [카카오, 카카오뱅크, PASS, 삼성패스] 인증 이용을 권장합니다.";

const IDENTITY_KEY = "vlue_identity_verified";
const ONBOARDING_KEY = "vlue_onboarding_complete_v1";

/** 로컬 세션 기준 본인인증 완료 여부 */
export function isLocalIdentityVerified() {
  try {
    const raw = String(localStorage.getItem(IDENTITY_KEY) || "").trim().toLowerCase();
    if (raw === "0" || raw === "false" || raw === "no") return false;
    if (raw === "1" || raw === "true" || raw === "yes") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** 로그인/가입 응답에서 본인인증 상태를 명시적으로 저장 */
export function persistIdentityVerifiedFlag(verified) {
  try {
    localStorage.setItem(IDENTITY_KEY, verified ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ openGuideModal: () => Promise<boolean>, onToast?: (m: string) => void }} opts
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, verified?: boolean, error?: string }>}
 */
export async function ensureIdentityForDcc(opts = {}) {
  if (isLocalIdentityVerified()) {
    return { ok: true, verified: true };
  }

  const proceed = await opts.openGuideModal?.();
  if (!proceed) {
    return { ok: false, cancelled: true };
  }

  try {
    opts.onToast?.("본인인증 창을 엽니다…");
    const rsp = await requestIamportCertification(getPortoneUserCode());
    const impUid = String(rsp?.imp_uid || "").trim();
    if (!impUid) {
      return { ok: false, error: "본인인증이 완료되지 않았습니다." };
    }

    let userId = "";
    try {
      userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
    } catch {
      /* ignore */
    }

    const data = await postPortoneIdentityComplete({
      impUid,
      isBusinessMember: false,
      requestDigitalCard: false,
      attachToUserId: userId || undefined
    });

    if (data?.accessToken || data?.refreshToken) {
      setVlueSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
    }
    if (data?.userId) {
      try {
        localStorage.setItem("vlue_server_user_id", String(data.userId));
      } catch {
        /* ignore */
      }
    }
    if (data?.legalName) {
      try {
        localStorage.setItem("vlue_legal_name", String(data.legalName).trim());
      } catch {
        /* ignore */
      }
    }
    if (data?.publicHandle) {
      try {
        localStorage.setItem("vlue_member_handle", `@${String(data.publicHandle)}`);
      } catch {
        /* ignore */
      }
    }
    if (data?.phoneE164) {
      try {
        localStorage.setItem("vlue_member_phone", String(data.phoneE164));
      } catch {
        /* ignore */
      }
    }
    if (data?.accountStatus != null) {
      try {
        localStorage.setItem("vlue_account_status", String(data.accountStatus));
      } catch {
        /* ignore */
      }
    }

    persistIdentityVerifiedFlag(true);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* ignore */
    }

    try {
      window.dispatchEvent(
        new CustomEvent("vlue-identity-verified", {
          detail: { userId: data?.userId, legalName: data?.legalName }
        })
      );
    } catch {
      /* ignore */
    }

    opts.onToast?.("본인인증이 완료되었습니다.");
    return { ok: true, verified: true };
  } catch (e) {
    const msg = e?.message || "본인인증에 실패했습니다.";
    opts.onToast?.(msg);
    return { ok: false, error: msg };
  }
}
