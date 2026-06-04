import { apiUrl } from "./apiBase.js";
import { getAccessToken, vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { clientKindHeaders } from "./deviceAuth.js";
import { checkVmingFeature } from "./vmingApi.js";

/**
 * CS 스캐너 PDF → 개인 자료실 업로드
 * @param {Blob} pdfBlob
 * @param {string} [fileName]
 */
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

/** @returns {Promise<{ tasks }>} */
export async function fetchOfficePptTasks() {
  const res = await vlueAuthFetch(apiUrl("/api/office/ppt-tasks"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "PPT 작업 목록을 불러오지 못했습니다.");
  return data;
}

/**
 * PC 웹 AI PPT 빌더 진척 업데이트 (시뮬레이션/연동)
 * @param {{ taskId?: string, projectTitle?: string, progress?: number, status?: string, resultFileUrl?: string, resultFileName?: string, resultFileBase64?: string, errorMessage?: string }} input
 */
export async function postOfficePptMockProgress(input) {
  await checkVmingFeature({
    featureType: "web_ppt",
    message: String(input?.projectTitle || "웹 PPT 기획 및 제작 요청")
  });

  const res = await vlueAuthFetch(apiUrl("/api/office/ppt-tasks/mock-progress"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.openUnlimitedPurchase) {
      try {
        window.dispatchEvent(
          new CustomEvent("vlue-open-vming-upgrade", {
            detail: {
              reasonCode: data?.code || "LIMIT",
              message: data?.message || "",
              blockedReasonType: data?.blocked_reason_type || "PROJECT_LIMIT_EXCEEDED"
            }
          })
        );
      } catch {
        /* ignore */
      }
    }
    throw new Error(data?.message || data?.error || "PPT 진척 업데이트에 실패했습니다.");
  }
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
