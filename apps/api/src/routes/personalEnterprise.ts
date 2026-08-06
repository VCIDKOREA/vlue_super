import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  sendCorporateMailOtp,
  verifyCorporateCredentials,
  verifyCorporateMailOtp
} from "../services/enterprise/corporateMailService.js";
import {
  createPersonalComboSubscription,
  getPersonalComboStatus
} from "../services/membership/personalComboMembershipService.js";
import type { PaidBillingCycle } from "../services/membership/membershipBmConstants.js";

export const personalEnterpriseRoutes = new Hono();

function defaultPersonalComboStatus() {
  return {
    isCorporateLine: false,
    isEnterpriseVerified: false,
    enterpriseVerifiedAt: null,
    enterpriseVerifiedEmail: null,
    enterpriseVerifyNextCheckAt: null,
    activeSubscription: null,
    pendingSubscription: null,
    comboMonthlyAmountKrw: null,
    comboPricingNote:
      "회사 부담 14,700원 + 개인 부담 5,100원 = 유료 회원 19,800원과 동일한 VLUER 혜택",
    enterpriseReferralLocked: false,
    enterpriseReferralSponsor: null,
    referralPolicyNote:
      "회사 인증 후 개인 유료 가입 시 개인 추천인 지정 불가 · 기업 인수 VLUE(기업 추천인)으로 자동 귀속",
    degraded: true
  };
}

personalEnterpriseRoutes.get("/personal-combo/status", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const status = await getPersonalComboStatus(uid);
    return c.json({ ok: true, ...status });
  } catch (e) {
    console.warn("[personal-combo/status]", e);
    return c.json({ ok: true, ...defaultPersonalComboStatus() });
  }
});

personalEnterpriseRoutes.post("/personal-combo/verify-credentials", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      companyName?: string;
      assigneeName?: string;
      companyLoginId?: string;
      password?: string;
    }>();
    const result = await verifyCorporateCredentials({
      userId: uid,
      companyName: String(body?.companyName || ""),
      assigneeName: String(body?.assigneeName || ""),
      companyLoginId: String(body?.companyLoginId || ""),
      password: String(body?.password || "")
    });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "CORP_CREDENTIAL_VERIFY_FAILED" }, 400);
  }
});

personalEnterpriseRoutes.post("/personal-combo/mail/send-otp", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ email?: string }>();
    const result = await sendCorporateMailOtp(uid, String(body?.email || ""));
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "CORP_MAIL_OTP_SEND_FAILED" }, 400);
  }
});

personalEnterpriseRoutes.post("/personal-combo/mail/verify-otp", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ email?: string; otp?: string }>();
    const result = await verifyCorporateMailOtp(uid, String(body?.email || ""), String(body?.otp || ""));
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "CORP_MAIL_OTP_VERIFY_FAILED" }, 400);
  }
});

personalEnterpriseRoutes.post("/personal-combo/subscribe", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = await c.req.json<{ billingCycle?: string }>();
    const cycle: PaidBillingCycle =
      String(body?.billingCycle || "monthly").toLowerCase() === "annual" ? "annual" : "monthly";
    const sub = await createPersonalComboSubscription(uid, cycle);
    const convertedWithoutPayment = Boolean(
      (sub as { convertedWithoutPayment?: boolean }).convertedWithoutPayment
    );
    return c.json({
      ok: true,
      subscriptionId: sub.id,
      amountKrw: sub.amountKrw,
      isPersonalCombo: sub.isPersonalCombo,
      billingCycle: cycle,
      status: sub.status,
      convertedWithoutPayment
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg, code: "PERSONAL_COMBO_SUBSCRIBE_FAILED" }, 400);
  }
});
