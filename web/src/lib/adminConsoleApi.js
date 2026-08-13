import { apiUrl } from "./apiBase.js";

export const ADMIN_CONSOLE_TOKEN_KEY = "vlue_admin_console_token";
export const ADMIN_CONSOLE_USER_KEY = "vlue_admin_console_user";

function adminHeaders() {
  const h = { "Content-Type": "application/json" };
  try {
    const t = localStorage.getItem(ADMIN_CONSOLE_TOKEN_KEY);
    if (t) h.Authorization = `Bearer ${t}`;
  } catch {
    /* ignore */
  }
  return h;
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function clearAdminConsoleSession() {
  try {
    localStorage.removeItem(ADMIN_CONSOLE_TOKEN_KEY);
    localStorage.removeItem(ADMIN_CONSOLE_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function readAdminConsoleSession() {
  try {
    const raw = localStorage.getItem(ADMIN_CONSOLE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAdminConsoleSession(payload) {
  try {
    if (payload?.accessToken) localStorage.setItem(ADMIN_CONSOLE_TOKEN_KEY, String(payload.accessToken));
    localStorage.setItem(
      ADMIN_CONSOLE_USER_KEY,
      JSON.stringify({
        userId: payload.userId,
        legalName: payload.legalName,
        publicHandle: payload.publicHandle,
        role: payload.role
      })
    );
  } catch {
    /* ignore */
  }
}

export async function adminConsoleLogin(loginId, password) {
  const res = await fetch(apiUrl("/api/admin/console/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password })
  });
  const data = await parseJson(res);
  saveAdminConsoleSession(data);
  return data;
}

export async function fetchAdminConsoleMe() {
  const res = await fetch(apiUrl("/api/admin/console/me"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function fetchAdminUsers({ q = "", limit = 50, offset = 0 } = {}) {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) qs.set("q", q);
  const res = await fetch(apiUrl(`/api/admin/console/users?${qs}`), { headers: adminHeaders() });
  return parseJson(res);
}

export async function fetchAdminUser(userId) {
  const res = await fetch(apiUrl(`/api/admin/console/users/${userId}`), { headers: adminHeaders() });
  return parseJson(res);
}

export async function patchAdminUser(userId, patch) {
  const res = await fetch(apiUrl(`/api/admin/console/users/${userId}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(patch)
  });
  return parseJson(res);
}

export async function fetchAdminPosts() {
  const res = await fetch(apiUrl("/api/admin/console/posts"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function createAdminNotice(payload) {
  const res = await fetch(apiUrl("/api/admin/console/posts/notices"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function updateAdminNotice(id, payload) {
  const res = await fetch(apiUrl(`/api/admin/console/posts/notices/${id}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function deleteAdminNotice(id) {
  const res = await fetch(apiUrl(`/api/admin/console/posts/notices/${id}`), {
    method: "DELETE",
    headers: adminHeaders()
  });
  return parseJson(res);
}

export async function createAdminPopup(payload) {
  const res = await fetch(apiUrl("/api/admin/console/posts/popups"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function updateAdminPopup(id, payload) {
  const res = await fetch(apiUrl(`/api/admin/console/posts/popups/${id}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function deleteAdminPopup(id) {
  const res = await fetch(apiUrl(`/api/admin/console/posts/popups/${id}`), {
    method: "DELETE",
    headers: adminHeaders()
  });
  return parseJson(res);
}

export async function deleteAdminFeedPost(id) {
  const res = await fetch(apiUrl(`/api/admin/console/posts/feed/${id}`), {
    method: "DELETE",
    headers: adminHeaders()
  });
  return parseJson(res);
}

export async function fetchAdminHealth() {
  const res = await fetch(apiUrl("/api/admin/console/health"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function testAdminNotification(message) {
  const res = await fetch(apiUrl("/api/admin/console/health/test-notification"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ message })
  });
  return parseJson(res);
}

export async function testAdminScanner() {
  const res = await fetch(apiUrl("/api/admin/console/health/test-scanner"), {
    method: "POST",
    headers: adminHeaders()
  });
  return parseJson(res);
}

export async function fetchAdminOnboardingStats() {
  const res = await fetch(apiUrl("/api/admin/console/onboarding/stats"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function fetchAdminManualReview() {
  const res = await fetch(apiUrl("/api/admin/console/onboarding/manual-review"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function resolveAdminManualReview(reviewId, action) {
  const res = await fetch(apiUrl(`/api/admin/console/onboarding/manual-review/${reviewId}/resolve`), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ action })
  });
  return parseJson(res);
}

export async function fetchAdminPricingConfig() {
  const res = await fetch(apiUrl("/api/admin/console/pricing-config"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function saveAdminPricingConfig(config) {
  const res = await fetch(apiUrl("/api/admin/console/pricing-config"), {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ config })
  });
  return parseJson(res);
}

export async function fetchAdminPricingRevenueStats({ planSku, from, to } = {}) {
  const qs = new URLSearchParams();
  if (planSku) qs.set("planSku", planSku);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(apiUrl(`/api/pricing/revenue-stats?${qs}`), { headers: adminHeaders() });
  return parseJson(res);
}

/** VLUE Signature Sound 게시판 */
export async function fetchAdminSignatureSounds() {
  const res = await fetch(apiUrl("/api/admin/console/signature-sounds"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function createAdminSignatureSoundUploadUrl(body) {
  const res = await fetch(apiUrl("/api/admin/console/signature-sounds/upload-url"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

export async function createAdminSignatureSound(body) {
  const res = await fetch(apiUrl("/api/admin/console/signature-sounds"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

export async function patchAdminSignatureSound(id, body) {
  const res = await fetch(apiUrl(`/api/admin/console/signature-sounds/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

/** 관리자 DB 지표 차트 */
export async function fetchAdminProductMetrics({ from = "", to = "" } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const q = qs.toString();
  const res = await fetch(apiUrl(`/api/admin/console/metrics${q ? `?${q}` : ""}`), {
    headers: adminHeaders()
  });
  return parseJson(res);
}

/** 기업 DCC 승인 대기 */
export async function fetchAdminEnterpriseDccPending() {
  const res = await fetch(apiUrl("/api/admin/console/enterprise-dcc/pending"), {
    headers: adminHeaders()
  });
  return parseJson(res);
}

export async function reviewAdminEnterpriseDcc(id, action, adminNote = "") {
  const res = await fetch(apiUrl(`/api/admin/console/enterprise-dcc/${encodeURIComponent(id)}/review`), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ action, adminNote })
  });
  return parseJson(res);
}

/** Diagnostics Framework — session list */
export async function fetchAdminDiagnosticSessions({
  feature = "BIG_PUSH",
  status = "",
  limit = 40,
  cursor = ""
} = {}) {
  const qs = new URLSearchParams();
  if (feature) qs.set("feature", feature);
  if (status) qs.set("status", status);
  if (limit) qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", cursor);
  const res = await fetch(apiUrl(`/api/admin/console/diagnostics/sessions?${qs}`), {
    headers: adminHeaders()
  });
  return parseJson(res);
}

/** Diagnostics Framework — session detail + timeline */
export async function fetchAdminDiagnosticSessionDetail(id) {
  const res = await fetch(
    apiUrl(`/api/admin/console/diagnostics/sessions/${encodeURIComponent(id)}`),
    { headers: adminHeaders() }
  );
  return parseJson(res);
}

export async function fetchAdminAgencies() {
  const res = await fetch(apiUrl("/api/admin/console/agencies"), { headers: adminHeaders() });
  return parseJson(res);
}

export async function createAdminAgency(body) {
  const res = await fetch(apiUrl("/api/admin/console/agencies"), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

export async function patchAdminAgency(id, body) {
  const res = await fetch(apiUrl(`/api/admin/console/agencies/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}

export async function createAdminAgencyLogoUploadUrl(id, body) {
  const res = await fetch(apiUrl(`/api/admin/console/agencies/${encodeURIComponent(id)}/logo-upload-url`), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body)
  });
  return parseJson(res);
}
