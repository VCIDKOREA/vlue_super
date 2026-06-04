import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function generateFraudEvidence({ roomId, fraudType, from, to, passwordHint }) {
  const res = await vlueAuthFetch(apiUrl("/api/fraud/generate-evidence"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, fraudType, from, to, passwordHint })
  });
  return parseJson(res);
}

export async function submitFraudReport({ reportId, agency, meta }) {
  const res = await vlueAuthFetch(apiUrl("/api/fraud/report"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, agency, meta })
  });
  return parseJson(res);
}

export async function fetchFraudEvidenceList() {
  const res = await vlueAuthFetch(apiUrl("/api/fraud/evidence/list"), {
    headers: vlueAuthHeaders()
  });
  return parseJson(res);
}

export async function verifyFraudHash({ certificationId, blockchainHash, reportId }) {
  const res = await vlueAuthFetch(apiUrl("/api/fraud/hash-verify"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ certificationId, blockchainHash, reportId })
  });
  return parseJson(res);
}

/** 해시 검증 통과 후에만 증거 HTML 다운로드 */
export async function downloadFraudEvidenceSecure(item) {
  const verify = await verifyFraudHash({
    reportId: item.reportId,
    certificationId: item.certificationId,
    blockchainHash: item.blockchainHash
  });
  if (!verify?.valid) {
    throw new Error(verify?.message || "해시 검증에 실패했습니다.");
  }
  const res = await vlueAuthFetch(apiUrl("/api/fraud/evidence/download"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId: item.reportId,
      certificationId: item.certificationId,
      blockchainHash: item.blockchainHash
    })
  });
  return parseJson(res);
}

export const FRAUD_REPORT_PORTALS = {
  police: { label: "경찰청 사이버수사대", url: "https://ecrm.police.go.kr" },
  fss: { label: "금융감독원", url: "https://www.fss.or.kr" },
  kisa: { label: "KISA", url: "https://www.kisa.or.kr" },
  carrier: { label: "통신사 고객센터", url: "tel:114" }
};
