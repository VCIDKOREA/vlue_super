import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildPersonalComboPaymentPreview,
  formatKrw,
  PERSONAL_COMBO_PRICING_NOTE,
  ENTERPRISE_REFERRAL_POLICY_NOTE
} from "../lib/membershipBm.js";
import {
  fetchPersonalComboStatus,
  postPersonalComboSubscribe,
  postSendCorporateMailOtp,
  postVerifyCorporateCredentials,
  postVerifyCorporateMailOtp
} from "../lib/personalComboApi.js";
import { requestIamportBillingPay } from "../lib/iamportClient.js";
import { postSubscribeComplete } from "../lib/subscribeCompleteApi.js";
import { getPortoneUserCode } from "../lib/portoneEnv.js";

const STEPS = ["credentials", "email", "pay"];

export default function PersonalComboPanel({ membershipTier = "free", onToast }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("credentials");
  const [companyName, setCompanyName] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [companyLoginId, setCompanyLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [corpEmail, setCorpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchPersonalComboStatus();
      setStatus(s);
      if (s.isCorporateLine) {
        setStep("credentials");
      } else if (s.isEnterpriseVerified && s.enterpriseVerifiedEmail) {
        setStep("pay");
      } else if (s.isEnterpriseVerified) {
        setStep("email");
      } else {
        setStep("credentials");
      }
    } catch {
      setStatus({
        isCorporateLine: false,
        isEnterpriseVerified: false,
        activeSubscription: null,
        pendingSubscription: null
      });
      setStep("credentials");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const preview = useMemo(() => buildPersonalComboPaymentPreview(billingCycle), [billingCycle]);

  const hasActiveCombo =
    status?.activeSubscription?.isPersonalCombo || status?.pendingSubscription?.isPersonalCombo;

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-[12px] text-slate-500">
        복수 계정 콤보 정보를 불러오는 중…
      </div>
    );
  }

  if (status?.isCorporateLine) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
        <p className="text-[13px] font-black text-amber-950">회사 회선 계정</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">
          이 계정은 기업 회선에 연결되어 있습니다. 가족보호·사생활용 개인 휴대폰으로 <b>별도 무료 가입</b> 후, 아래
          콤보 요금제를 이용해 주세요. 회사는 개인 계정 활동을 조회할 수 없습니다.
        </p>
      </div>
    );
  }

  if (membershipTier !== "free" && !hasActiveCombo) {
    return null;
  }

  if (hasActiveCombo && status?.activeSubscription) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <p className="text-[13px] font-black text-emerald-950">복수 계정 콤보 이용 중</p>
        <p className="mt-1 text-[11px] text-emerald-900/90">
          월 {formatKrw(status.activeSubscription.amountKrw)} · 유료 회원과 동일한 VLUER 혜택
        </p>
      </div>
    );
  }

  async function handleVerifyCredentials() {
    setBusy(true);
    try {
      await postVerifyCorporateCredentials({
        companyName,
        assigneeName,
        companyLoginId,
        password
      });
      onToast?.("회사 계정 인증이 완료되었습니다. 회사 이메일 OTP를 진행해 주세요.");
      await refresh();
      setStep("email");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "인증 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp() {
    setBusy(true);
    try {
      const res = await postSendCorporateMailOtp(corpEmail);
      if (res.devOtp) {
        onToast?.(`[개발] OTP: ${res.devOtp}`);
      } else {
        onToast?.("회사 메일로 인증번호를 발송했습니다.");
      }
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setBusy(true);
    try {
      await postVerifyCorporateMailOtp(corpEmail, otp);
      onToast?.("회사 이메일 인증이 완료되었습니다.");
      await refresh();
      setStep("pay");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "인증 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handlePay() {
    const userCode = getPortoneUserCode();
    let userId = "";
    try {
      userId = localStorage.getItem("vlue_server_user_id") || "";
    } catch {
      /* ignore */
    }
    if (!userId) {
      onToast?.("로그인 후 결제할 수 있습니다.");
      return;
    }

    setBusy(true);
    try {
      const sub = await postPersonalComboSubscribe(billingCycle);
      const amount = sub.amountKrw;
      const merchantUid = `billing_combo_${userId.slice(0, 8)}_${Date.now()}`;

      const rsp = await requestIamportBillingPay({
        userCode,
        userId,
        amount,
        billingCycle,
        merchantUid,
        name: `VLUE 임직원 콤보 (${billingCycle === "annual" ? "1년" : "1월"})`
      });

      await postSubscribeComplete({
        customer_uid: rsp.customer_uid || `user_customer_${userId}`,
        merchant_uid: rsp.merchant_uid || merchantUid,
        amount,
        billingCycle
      });

      onToast?.("콤보 유료 멤버십 결제가 완료되었습니다.");
      await refresh();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "결제 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white p-4 shadow-sm">
      <p className="text-[14px] font-black text-indigo-950">복수 계정 콤보 요금제</p>
      <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/85">{PERSONAL_COMBO_PRICING_NOTE}</p>
      <p className="mt-2 rounded-lg border border-indigo-100 bg-white/80 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-indigo-950/90">
        {ENTERPRISE_REFERRAL_POLICY_NOTE}
        {status?.enterpriseReferralSponsor?.displayName ? (
          <>
            {" "}
            <span className="text-indigo-700">
              (기업 추천인: {status.enterpriseReferralSponsor.displayName}
              {status.enterpriseReferralSponsor.referralCodeUsed
                ? ` · ${status.enterpriseReferralSponsor.referralCodeUsed}`
                : ""}
              )
            </span>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-[10px] text-slate-500">
        개인 계정과 회사 계정은 시스템에서 연결하지 않습니다. 회사는 개인 검색·결제·대화 내역을 볼 수 없습니다.
      </p>

      <div className="mt-3 flex gap-1">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              step === s ? "bg-indigo-600 text-white" : "bg-white text-slate-500"
            }`}
          >
            {i + 1}. {s === "credentials" ? "회사 인증" : s === "email" ? "이메일 OTP" : "결제"}
          </span>
        ))}
      </div>

      {step === "credentials" && (
        <div className="mt-3 space-y-2">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="회사명"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
          <input
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            placeholder="담당자 이름 (회사 등록명)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
          <input
            value={companyLoginId}
            onChange={(e) => setCompanyLoginId(e.target.value)}
            placeholder="회사 아이디 (로그인 ID)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="회사 계정 비밀번호"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleVerifyCredentials}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
          >
            회사 계정 인증
          </button>
        </div>
      )}

      {step === "email" && (
        <div className="mt-3 space-y-2">
          <input
            type="email"
            value={corpEmail}
            onChange={(e) => setCorpEmail(e.target.value)}
            placeholder="회사 이메일"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSendOtp}
              className="rounded-xl border border-indigo-300 bg-white py-2 text-[12px] font-black text-indigo-700"
            >
              OTP 발송
            </button>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6자리"
              maxLength={6}
              className="rounded-lg border border-slate-200 px-2 py-2 text-center text-[13px] tracking-widest"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleVerifyOtp}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-[13px] font-black text-white"
          >
            이메일 인증 완료
          </button>
        </div>
      )}

      {step === "pay" && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 rounded-lg py-2 text-[12px] font-black ${
                billingCycle === "monthly" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              월 5,100원
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`flex-1 rounded-lg py-2 text-[12px] font-black ${
                billingCycle === "annual" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              연 51,000원
            </button>
          </div>
          <p className="text-center text-[20px] font-black text-indigo-950">{preview.amountLabel}</p>
          <p className="text-center text-[10px] text-slate-500">{preview.detailLine}</p>
          <button
            type="button"
            disabled={busy || !status?.isEnterpriseVerified}
            onClick={handlePay}
            className="w-full rounded-xl bg-indigo-600 py-3 text-[14px] font-black text-white disabled:opacity-50"
          >
            {preview.amountLabel} 결제 · 유료 VLUER 시작
          </button>
        </div>
      )}
    </div>
  );
}
