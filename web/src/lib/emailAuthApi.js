import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { clientKindHeaders } from "./deviceAuth.js";

export const EMAIL_AUTH_SUPPORT =
  "이메일이 기억나지 않으면 고객센터 support@vlue.kr 로 문의해 주세요.";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || "요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function sendAuthCode(body, { auth = false } = {}) {
  const init = {
    method: "POST",
    headers: auth
      ? vlueAuthHeaders()
      : { "Content-Type": "application/json", ...clientKindHeaders() },
    body: JSON.stringify(body)
  };
  const res = auth
    ? await vlueAuthFetch(apiUrl("/api/auth/send-code"), init)
    : await fetch(apiUrl("/api/auth/send-code"), init);
  return parseJson(res);
}

export async function verifyAuthCode(body, { auth = false } = {}) {
  const init = {
    method: "POST",
    headers: auth
      ? vlueAuthHeaders()
      : { "Content-Type": "application/json", ...clientKindHeaders() },
    body: JSON.stringify(body)
  };
  const res = auth
    ? await vlueAuthFetch(apiUrl("/api/auth/verify-code"), init)
    : await fetch(apiUrl("/api/auth/verify-code"), init);
  return parseJson(res);
}
