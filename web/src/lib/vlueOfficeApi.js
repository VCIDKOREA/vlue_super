import { apiUrl } from "./apiBase.js";
import { getAccessToken, vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { clientKindHeaders } from "./deviceAuth.js";

/**
 * CS 스캐너 PDF → 개인 자료실 업로드
 * @param {Blob} pdfBlob
 * @param {string} [fileName]
 */
/** POS 빌지 OCR 텍스트 → 서버 장부 적재 */
export async function postPosLedgerIngest(ocrText, assetFileId = "") {
  const res = await vlueAuthFetch(apiUrl("/api/office/pos-ledger/ingest"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ ocrText, assetFileId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "POS 장부 저장에 실패했습니다.");
  return data;
}

export async function fetchPosLedgerDashboard() {
  const res = await vlueAuthFetch(apiUrl("/api/office/pos-ledger/dashboard"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "POS 장부를 불러오지 못했습니다.");
  return data;
}

export async function fetchPosLedgerRole() {
  const res = await vlueAuthFetch(apiUrl("/api/office/pos-ledger/role"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "POS 권한을 불러오지 못했습니다.");
  return data;
}

export async function invitePosStaff(staffHandle) {
  const res = await vlueAuthFetch(apiUrl("/api/office/pos-ledger/staff"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ staffHandle })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "직원 등록에 실패했습니다.");
  return data;
}

export async function fetchPosStaffList() {
  const res = await vlueAuthFetch(apiUrl("/api/office/pos-ledger/staff"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "직원 목록을 불러오지 못했습니다.");
  return data;
}

export async function patchPosStaffTransmit(staffUserId, transmitEnabled) {
  const res = await vlueAuthFetch(apiUrl(`/api/office/pos-ledger/staff/${staffUserId}`), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ transmitEnabled })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "직원 권한 변경에 실패했습니다.");
  return data;
}

export async function patchPosLedgerEntry(entryId, patch) {
  const res = await vlueAuthFetch(apiUrl(`/api/office/pos-ledger/entries/${entryId}`), {
    method: "PATCH",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(patch || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "장부 수정에 실패했습니다.");
  return data;
}

export async function postOfficeScanUpload(pdfBlob, fileName = "") {
  const name = fileName || `cs-scan-${Date.now()}.pdf`;
  const form = new FormData();
  form.append("file", pdfBlob, name);
  form.append("fileName", name);

  const headers = {
    ...clientKindHeaders(),
    ...vlueAuthHeaders()
  };
  delete headers["Content-Type"];

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl("/api/office/scan-upload"), {
    method: "POST",
    headers,
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "스캔 파일 업로드에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ files }>} */
export async function fetchOfficeFiles() {
  const res = await vlueAuthFetch(apiUrl("/api/office/files"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "개인 자료실 목록을 불러오지 못했습니다.");
  return data;
}

/**
 * @param {{ assetFileId: string, deviceId: string, senderLineNumber: string, action?: "print"|"fax" }} input
 */
export async function postOfficeRemoteControl(input) {
  const res = await vlueAuthFetch(apiUrl("/api/office/remote-control"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "원격 제어 요청에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ queue }>} */
export async function fetchRemoteControlQueue() {
  const res = await vlueAuthFetch(apiUrl("/api/office/remote-control/queue"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "제어 큐를 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ agents }>} */
export async function fetchOfficeAgents() {
  const res = await vlueAuthFetch(apiUrl("/api/office/remote-control/agents"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "에이전트 목록을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ inbox }>} */
export async function fetchOfficeEmailInbox() {
  const res = await vlueAuthFetch(apiUrl("/api/office/email-inbox"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "이메일 수신함을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ sent }>} */
export async function fetchOfficeEmailSent() {
  const res = await vlueAuthFetch(apiUrl("/api/office/email-sent"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "발신 메일함을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ popup }>} */
export async function fetchActiveMarketingPopup() {
  const res = await vlueAuthFetch(apiUrl("/api/office/marketing/active-popup"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "마케팅 팝업을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ notice }>} */
export async function fetchLatestNotice() {
  const res = await vlueAuthFetch(apiUrl("/api/office/notices/latest"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "공지사항을 불러오지 못했습니다.");
  return data;
}
