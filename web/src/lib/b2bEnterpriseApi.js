import { apiUrl } from "./apiBase.js";
import { vlueAuthHeaders, vlueAuthFetch } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.error || data.detail || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.payload = data;
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function fetchB2bEnterpriseMe() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/me"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchB2bMembershipUiContext() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/membership-ui-context"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function saveB2bEnterpriseSetup(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/setup"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function addB2bCartLine(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/cart/lines"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function patchB2bCartLine(lineId, payload) {
  const res = await vlueAuthFetch(apiUrl(`/api/b2b/cart/lines/${lineId}`), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function removeB2bCartLine(lineId) {
  const res = await vlueAuthFetch(apiUrl(`/api/b2b/cart/lines/${lineId}`), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function validateB2bCheckout() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/cart/checkout-validate"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function activateB2bCart() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/cart/activate"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchB2bEnrollmentStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enrollment/status"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function uploadB2bEnrollmentDocument({ kind, fileName, file }) {
  let url;
  if (file && typeof FileReader !== "undefined") {
    url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enrollment/documents"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({
      kind,
      fileName: fileName || file?.name || "document.pdf",
      url: url?.startsWith("data:") ? undefined : url
    })
  });
  return parseJson(res);
}

export async function submitB2bEnrollment() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enrollment/submit"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchB2bEnterpriseBranding() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/branding"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function patchB2bEnterpriseBranding(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/branding"), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

/** 기업 로고 이미지 파일 업로드 (data URL → DB · 계정 전체 적용) */
export async function uploadB2bEnterpriseLogo({ dataUrl, fileName }) {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/branding/logo"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ dataUrl, fileName })
  });
  return parseJson(res);
}

export async function fetchMemberCredentials() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/member-credentials"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function fetchEnterpriseMembers() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/members"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function patchEnterpriseMember(userId, payload) {
  const res = await vlueAuthFetch(apiUrl(`/api/b2b/enterprise/members/${userId}`), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function patchEnterpriseCartLine(lineId, payload) {
  const res = await vlueAuthFetch(apiUrl(`/api/b2b/enterprise/cart-lines/${lineId}`), {
    method: "PATCH",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function fetchGroupChat() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/group-chat/messages"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function postGroupChatMessage(content) {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/enterprise/group-chat/messages"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ content })
  });
  return parseJson(res);
}

export async function fetchB2bE2ePipeline() {
  const res = await vlueAuthFetch(apiUrl("/api/b2b/mock/e2e-pipeline"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}
