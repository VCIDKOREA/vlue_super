import { apiUrl } from "./apiBase.js";
import { setVlueSessionTokens, vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "요청에 실패했습니다.");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function persistTokensIfPresent(data) {
  if (data?.accessToken || data?.refreshToken) {
    setVlueSessionTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    });
  }
  try {
    localStorage.removeItem("vlue_saved_login_password");
  } catch {
    /* ignore */
  }
}

export async function changePasswordWithCurrent(oldPassword, newPassword) {
  const res = await vlueAuthFetch(apiUrl("/api/auth/password/change"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ oldPassword, newPassword })
  });
  const data = await parseJson(res);
  persistTokensIfPresent(data);
  return data;
}

export async function changePasswordWithIdentity(impUid, newPassword, { anonymous = false } = {}) {
  const init = {
    method: "POST",
    headers: anonymous ? { "Content-Type": "application/json" } : vlueAuthHeaders(),
    body: JSON.stringify({ impUid, newPassword })
  };
  const res = anonymous
    ? await fetch(apiUrl("/api/auth/password/change-with-identity"), init)
    : await vlueAuthFetch(apiUrl("/api/auth/password/change-with-identity"), init);
  const data = await parseJson(res);
  if (!anonymous) persistTokensIfPresent(data);
  return data;
}

export const PASSWORD_CHANGE_CERT_KEY = "vlue_password_change_cert_v1";
export const PASSWORD_CHANGE_RESUME_KEY = "vlue_password_change_resume";

export function markPasswordChangeCertPending(resume = "settings") {
  try {
    sessionStorage.setItem(PASSWORD_CHANGE_CERT_KEY, "1");
    sessionStorage.setItem(PASSWORD_CHANGE_RESUME_KEY, resume === "login" ? "login" : "settings");
  } catch {
    /* ignore */
  }
}

export function clearPasswordChangeCertPending() {
  try {
    sessionStorage.removeItem(PASSWORD_CHANGE_CERT_KEY);
    sessionStorage.removeItem(PASSWORD_CHANGE_RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export function isPasswordChangeCertPending() {
  try {
    return sessionStorage.getItem(PASSWORD_CHANGE_CERT_KEY) === "1";
  } catch {
    return false;
  }
}

export function readPasswordChangeResume() {
  try {
    return String(sessionStorage.getItem(PASSWORD_CHANGE_RESUME_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function buildPasswordChangeSupportMailto({ handle = "", legalName = "", phone = "" } = {}) {
  const subject = encodeURIComponent("[VLUE] 비밀번호 변경 신청");
  const lines = [
    "안녕하세요. 비밀번호 변경을 신청합니다.",
    "",
    `회원 ID: ${handle || "(작성해 주세요)"}`,
    `성명: ${legalName || "(작성해 주세요)"}`,
    `가입 휴대폰: ${phone || "(작성해 주세요)"}`,
    "신청 사유: 비밀번호를 분실했고 본인인증이 어렵습니다.",
    "",
    "본인 확인을 위해 고객센터에서 추가로 요청할 수 있습니다.",
    "※ 접수 후 영업일 3일 이내 회신 예정입니다."
  ];
  return `mailto:support@vlue.kr?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
}
