import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { requestIamportCertification } from "./iamportClient.js";
import { getPortoneUserCode } from "./portoneEnv.js";
import { makeDevLocalImpUid } from "./identityCompleteApi.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `요청 실패 (${res.status})`);
    err.code = data?.code;
    throw err;
  }
  return data;
}

/** 보호자 PASS 인증 imp_uid (자녀 초대·앱 승인 공통) */
export async function requestGuardianPassImpUid({ devBypass = false } = {}) {
  if (devBypass) {
    if (!import.meta.env.DEV) {
      throw new Error("개발 전용 부모 인증 우회는 로컬에서만 가능합니다.");
    }
    return makeDevLocalImpUid("guardian");
  }
  const userCode = getPortoneUserCode();
  const rsp = await requestIamportCertification(userCode);
  const impUid = rsp?.imp_uid;
  if (!impUid) {
    throw new Error("보호자 본인인증 imp_uid가 없습니다.");
  }
  return impUid;
}

/** 자녀 기기 — 같은 기기에서 부모 PASS 승인 (자녀 JWT) */
export async function approveParentalConsentWithPass({ devBypass = false } = {}) {
  const guardianImpUid = await requestGuardianPassImpUid({ devBypass });
  const res = await vlueAuthFetch(apiUrl("/api/auth/parental-consent/approve"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ guardianImpUid })
  });
  return parseJson(res);
}

/** 자녀 — 부모 VLUE 아이디로 승인 요청 푸시 */
export async function requestParentalConsentToGuardian(guardianHandle) {
  const handle = String(guardianHandle || "").trim().replace(/^@+/, "");
  const res = await vlueAuthFetch(apiUrl("/api/auth/parental-consent/request"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ guardianHandle: handle })
  });
  return parseJson(res);
}

/** 보호자 — 승인 대기 자녀 목록 */
export async function fetchPendingParentalConsents() {
  const res = await vlueAuthFetch(apiUrl("/api/auth/parental-consent/pending"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

/** 보호자 앱 — 부모 폰에서 PASS 승인 */
export async function approveParentalConsentAsGuardian(wardUserId, { devBypass = false } = {}) {
  const guardianImpUid = await requestGuardianPassImpUid({ devBypass });
  const res = await vlueAuthFetch(apiUrl("/api/auth/parental-consent/approve-guardian"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ wardUserId, guardianImpUid })
  });
  return parseJson(res);
}
