import { apiUrl } from "./apiBase.js";
import { adminDeviceHeaders } from "./adminDeviceKey.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function fetchAdminDeviceMe() {
  const res = await fetch(apiUrl("/api/admin/device/me"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function fetchPendingCorporateAttributions() {
  const res = await fetch(apiUrl("/api/v1/admin/corporate-attribution/pending"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function approveCorporateAttribution(requestId, adminNote) {
  const res = await fetch(apiUrl("/api/v1/admin/corporate-attribution/approve"), {
    method: "POST",
    headers: adminDeviceHeaders(),
    body: JSON.stringify({ requestId, adminNote: adminNote || undefined })
  });
  return parseJson(res);
}

export async function fetchOnboardingStats() {
  const res = await fetch(apiUrl("/api/v1/admin/onboarding/stats"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function fetchOnboardingManualReview() {
  const res = await fetch(apiUrl("/api/v1/admin/onboarding/manual-review"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function resolveOnboardingReview(reviewId, action, adminNote = "") {
  const res = await fetch(apiUrl("/api/v1/admin/onboarding/resolve"), {
    method: "POST",
    headers: adminDeviceHeaders(),
    body: JSON.stringify({ reviewId, action, adminNote: adminNote || undefined })
  });
  return parseJson(res);
}

export async function fetchTitleDeptPendingReviews() {
  const res = await fetch(apiUrl("/api/v1/admin/title-dept/pending"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function resolveTitleDeptReview(reviewId, action, adminNote = "") {
  const res = await fetch(apiUrl("/api/v1/admin/title-dept/resolve"), {
    method: "POST",
    headers: adminDeviceHeaders(),
    body: JSON.stringify({ reviewId, action, adminNote: adminNote || undefined })
  });
  return parseJson(res);
}

export async function createMarketingPopup(payload) {
  const res = await fetch(apiUrl("/api/admin/marketing/popups"), {
    method: "POST",
    headers: adminDeviceHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function fetchMarketingPopups() {
  const res = await fetch(apiUrl("/api/admin/marketing/popups"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}

export async function releaseNotice(payload) {
  const res = await fetch(apiUrl("/api/admin/notices/release"), {
    method: "POST",
    headers: adminDeviceHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJson(res);
}

export async function fetchAdminNotices() {
  const res = await fetch(apiUrl("/api/admin/notices"), {
    headers: adminDeviceHeaders()
  });
  return parseJson(res);
}
