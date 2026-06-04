import { apiUrl } from "./apiBase.js";

/**
 * 추천인 코드 확인 (가입 전)
 * @returns {Promise<{ valid: boolean, referralCode?: string, sponsorDisplayName?: string, sponsorHandle?: string, error?: string }>}
 */
export async function verifyReferralCode(code) {
  const c = String(code || "").trim();
  if (!c) {
    return { valid: false, error: "추천인 코드를 입력해 주세요." };
  }
  const res = await fetch(apiUrl(`/api/auth/referral/verify?code=${encodeURIComponent(c)}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.valid) {
    return { valid: false, error: data?.error || "유효하지 않은 추천인 코드입니다." };
  }
  return {
    valid: true,
    referralCode: data.referralCode,
    sponsorDisplayName: data.sponsorDisplayName,
    sponsorHandle: data.sponsorHandle
  };
}
