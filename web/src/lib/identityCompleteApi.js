import { apiUrl } from "./apiBase.js";

/** 로컬 E2E — API `dev_local_*` imp_uid (포트원·이니시스 팝업 생략) */
export function makeDevLocalImpUid(handleSlug = "e2e") {
  const slug = String(handleSlug || "e2e").replace(/[^a-z0-9_]/gi, "").slice(0, 20) || "e2e";
  return `dev_local_${slug}_${Date.now()}`;
}

/**
 * 본인인증(IMP.certification) 성공 후 imp_uid 로 가입·로그인 완료
 * @returns {Promise<object>} userId, accessToken, refreshToken, legalName, phoneE164, …
 */
export async function postPortoneIdentityComplete(payload) {
  const res = await fetch(apiUrl("/api/identity/portone/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `서버 오류 (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

/**
 * 온보딩 국세청 사업자등록 상태조회 (가입 전)
 * @returns {Promise<{ ok: true, message: string, statusCode: string, statusLabel: string, source: string }>}
 */
export async function postNtsBusinessStatusVerify(payload) {
  const res = await fetch(apiUrl("/api/identity/nts-business-status"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `국세청 조회 실패 (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    err.statusCode = data?.statusCode;
    err.statusLabel = data?.statusLabel;
    throw err;
  }
  return data;
}
