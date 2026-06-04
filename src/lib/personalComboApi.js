import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

const OFFLINE_PERSONAL_COMBO_STATUS = {
  ok: true,
  isCorporateLine: false,
  isEnterpriseVerified: false,
  enterpriseVerifiedAt: null,
  enterpriseVerifiedEmail: null,
  enterpriseVerifyNextCheckAt: null,
  activeSubscription: null,
  pendingSubscription: null,
  comboMonthlyAmountKrw: null,
  degraded: true
};

export async function fetchPersonalComboStatus() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/personal-combo/status"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[personal-combo] status http", res.status, data);
      return { ...OFFLINE_PERSONAL_COMBO_STATUS, ...data };
    }
    return data;
  } catch (e) {
    console.warn("[personal-combo] status fetch failed", e);
    return { ...OFFLINE_PERSONAL_COMBO_STATUS };
  }
}

export async function postVerifyCorporateCredentials(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/personal-combo/verify-credentials"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "회사 인증에 실패했습니다.");
  return data;
}

export async function postSendCorporateMailOtp(email) {
  const res = await vlueAuthFetch(apiUrl("/api/personal-combo/mail/send-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "인증 메일 발송에 실패했습니다.");
  return data;
}

export async function postVerifyCorporateMailOtp(email, otp) {
  const res = await vlueAuthFetch(apiUrl("/api/personal-combo/mail/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "이메일 인증에 실패했습니다.");
  return data;
}

export async function postPersonalComboSubscribe(billingCycle = "monthly") {
  const res = await vlueAuthFetch(apiUrl("/api/personal-combo/subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billingCycle })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "구독 준비에 실패했습니다.");
  return data;
}
