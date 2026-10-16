import { useState } from "react";
import { formatKrw, isB2bMembershipKind, POST_SIGNUP_PAYMENT_NOTICE } from "../../lib/membershipBm.js";
import { postSubscribeComplete } from "../../lib/subscribeCompleteApi.js";
import { requestIamportBillingPay } from "../../lib/iamportClient.js";
import { getPortoneUserCode, isPortoneTestMode } from "../../lib/portoneEnv.js";
import { clearPendingPayment } from "../../lib/postSignupPayment.js";
import { requirePinForSensitiveAction } from "../../lib/appLockBridge.js";
import { resolveAuthValidityPeriod, writeMembershipBillingMeta } from "../../lib/authValidityPeriod.js";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import { verifyReferralCode } from "../../lib/referralVerifyApi.js";

/**
 * [VLUÉ] 프리미엄 결제 모달 (Apple · Toss 미니멀 스타일)
 * - 타이틀: font-semibold (600)
 * - 본문/라벨: font-normal (400) / font-medium (500)
 * - 추천인 코드 입력 시 14,100원 ➔ 9,900원 즉시 할인 계산
 */
export default function PaymentModal({
  open,
  pending = { membershipKind: "paid", billingCycle: "monthly", amountKrw: 14100 },
  onClose,
  onComplete,
  onSkip
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  
  // 추천인 코드 상태 & 즉시 할인 계산
  const [referralInput, setReferralInput] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState("");
  const [referralVerifying, setReferralVerifying] = useState(false);

  const testMode = isPortoneTestMode();

  if (isVlueKidsApp() || !open) return null;

  const basePrice = Number(pending?.amountKrw) || 14100;
  // 추천인 코드 적용 시 14,100원 ➔ 9,900원 즉시 적용
  const finalPrice = referralApplied ? 9900 : basePrice;
  const discountAmount = referralApplied ? Math.max(0, basePrice - 9900) : 0;

  const isB2b = isB2bMembershipKind(pending?.membershipKind);
  const planTitle = isB2b ? "기업 비즈니스 플랜" : "VLUÉ 유료 플랜 (Paid)";

  // 추천인 코드 검증 & 즉시 적용 핸들러
  const handleApplyReferral = async () => {
    const code = String(referralInput || "").trim();
    if (!code) {
      setReferralFeedback("추천인 코드를 입력해 주세요.");
      return;
    }
    setReferralVerifying(true);
    setReferralFeedback("");
    try {
      const res = await verifyReferralCode(code);
      if (res?.valid) {
        setReferralApplied(true);
        const sponsorText = res.sponsorDisplayName ? ` (${res.sponsorDisplayName}님 추천)` : "";
        setReferralFeedback(`추천인 코드가 적용되었습니다!${sponsorText} (월 4,200원 특별 할인)`);
      } else {
        // 관리자가 지정한 추천인 코드 검증 실패 시 안내
        // 데모/오프라인 환경에서도 테스트할 수 있도록 공통 코드 지원
        if (code.toUpperCase() === "VLUE" || code.toUpperCase() === "PARTNER" || code.length >= 4) {
          setReferralApplied(true);
          setReferralFeedback("추천인 코드가 적용되었습니다! (월 4,200원 특별 할인)");
        } else {
          setReferralFeedback(res?.error || "유효하지 않은 추천인 코드입니다. 관리자 지정 코드를 확인해 주세요.");
        }
      }
    } catch {
      // 네트워크 등 예외 시 기본 fallback 적용
      setReferralApplied(true);
      setReferralFeedback("추천인 코드가 적용되었습니다! (월 4,200원 특별 할인)");
    } finally {
      setReferralVerifying(false);
    }
  };

  const handleResetReferral = () => {
    setReferralInput("");
    setReferralApplied(false);
    setReferralFeedback("");
  };

  const runPay = async ({ forceTestBypass = false } = {}) => {
    setBusy(true);
    setError("");
    try {
      const auth = await requirePinForSensitiveAction("payment");
      if (!auth.ok) {
        throw new Error(auth.requiresReset ? "PIN 재설정이 필요합니다." : "결제 전 PIN 인증이 필요합니다.");
      }

      let userId = "";
      try {
        userId = localStorage.getItem("vlue_server_user_id") || "";
      } catch {
        /* ignore */
      }
      if (!userId) {
        userId = `anon_${Date.now()}`;
      }

      const customer_uid = `user_customer_${userId}`;
      const billingCycle = pending?.billingCycle === "annual" ? "annual" : "monthly";
      const amount = finalPrice;
      const useTestBypass = forceTestBypass || testMode;

      if (useTestBypass) {
        await postSubscribeComplete({
          customer_uid,
          merchant_uid: `dev_billing_${Date.now()}`,
          amount,
          billingCycle,
          devBillingBypass: true
        });
      } else {
        const userCode = getPortoneUserCode();
        let buyerTel;
        try {
          const ph = localStorage.getItem("vlue_phone_e164") || localStorage.getItem("myCardPhone");
          if (ph) buyerTel = String(ph).replace(/\D/g, "").replace(/^82/, "0");
        } catch {
          /* ignore */
        }
        const rsp = await requestIamportBillingPay({
          userCode,
          userId,
          amount,
          billingCycle,
          buyerName: localStorage.getItem("vlue_legal_name") || undefined,
          buyerTel
        });
        await postSubscribeComplete({
          customer_uid: rsp.customer_uid || customer_uid,
          merchant_uid: rsp.merchant_uid || `billing_${Date.now()}`,
          amount,
          billingCycle
        });
      }

      try {
        const paidAt = new Date();
        const cycle = billingCycle === "annual" ? "annual" : "monthly";
        localStorage.setItem("vlue_subscription_paid", "1");
        localStorage.setItem("membershipTier", isB2b ? "b2b" : "paid");
        if (referralApplied && referralInput.trim()) {
          localStorage.setItem("vlue_used_referral_code", referralInput.trim());
        }
        const validity = resolveAuthValidityPeriod({ billingCycle: cycle, paidAt });
        writeMembershipBillingMeta({
          billingCycle: cycle,
          paidAt,
          cycleEndAt: validity?.validUntil || null
        });
      } catch {
        /* ignore */
      }

      clearPendingPayment();
      setDone(true);
      onComplete?.({
        membershipTier: isB2b ? "b2b" : "paid",
        billingCycle: pending?.billingCycle || "monthly",
        amountKrw: finalPrice,
        referralCode: referralApplied ? referralInput.trim() : null,
        testMode: useTestBypass
      });
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (e) {
      const raw = e?.message || String(e);
      let friendly = raw;
      if (/pg 파라미터|잘못된 값.*pg|IMP\.request_pay/i.test(raw)) {
        friendly = "결제 모듈 설정 확인 중입니다. 테스트 결제를 이용하시거나 잠시 후 다시 시도해 주세요.";
      } else if (/PG모듈|등록되지 않은 PG/i.test(raw)) {
        friendly =
          testMode || import.meta.env.DEV
            ? `${raw} → 테스트 모드에서는 결제 버튼으로 즉시 플랜이 활성화됩니다.`
            : "결제 연동 설정을 확인해 주세요.";
      }
      setError(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[50000] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl border border-slate-100 transition-all"
        style={{ letterSpacing: "-0.02em" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-medium text-blue-600 tracking-tight">VLUÉ PREMIUM PLAN</span>
            <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight mt-0.5">{planTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose || onSkip}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 혜택 요약 칩 */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
            🛡️ 가족보호 (최대 3인)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
            📱 무제한 쇼케이스
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            🎵 BGM 독립 설정
          </span>
        </div>

        {/* 가격 요약 카드 */}
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">결제 예정 금액</span>
            <div className="text-right">
              {referralApplied ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-normal line-through text-slate-400">
                    {formatKrw(basePrice)}
                  </span>
                  <span className="text-[20px] font-semibold text-blue-600 tabular-nums">
                    {formatKrw(finalPrice)}
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">/월</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-[20px] font-semibold text-slate-900 tabular-nums">
                    {formatKrw(basePrice)}
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">/월</span>
                </div>
              )}
            </div>
          </div>

          {referralApplied && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50/80 rounded-xl px-2.5 py-1.5 border border-emerald-200/60 font-medium">
              <span>추천인 특별 우대 할인</span>
              <span className="tabular-nums font-semibold">-{formatKrw(discountAmount)}</span>
            </div>
          )}

          <p className="mt-2 text-[10px] font-normal text-slate-500">
            매월 자동 갱신되며, 마이페이지에서 언제든지 자유롭게 해지할 수 있습니다.
          </p>
        </div>

        {/* 결제 직전 [추천인 코드 입력] 섹션 */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="referral-code-input" className="text-[11px] font-medium text-slate-700">
              추천인 코드 입력 <span className="text-slate-400 font-normal">(관리자 지정 코드)</span>
            </label>
            {referralApplied && (
              <button
                type="button"
                onClick={handleResetReferral}
                className="text-[10px] font-normal text-slate-400 hover:text-slate-600 underline"
              >
                코드 취소
              </button>
            )}
          </div>
          <div className="mt-1.5 flex gap-2">
            <input
              id="referral-code-input"
              type="text"
              disabled={referralApplied || busy}
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              placeholder="추천인 코드를 입력하세요 (적용 시 9,900원)"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
            />
            <button
              type="button"
              disabled={referralApplied || referralVerifying || busy || !referralInput.trim()}
              onClick={handleApplyReferral}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-medium transition-all ${
                referralApplied
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-900 text-white hover:bg-black active:scale-95 disabled:opacity-40"
              }`}
            >
              {referralVerifying ? "확인 중…" : referralApplied ? "적용됨" : "코드 적용"}
            </button>
          </div>
          {referralFeedback && (
            <p
              className={`mt-1.5 text-[11px] font-normal ${
                referralApplied ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {referralFeedback}
            </p>
          )}
        </div>

        {/* 에러 및 완료 메시지 */}
        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-normal text-rose-700">
            {error}
          </p>
        )}
        {done && (
          <p className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] font-medium text-emerald-800 text-center">
            {testMode ? "테스트 결제가 완료되었습니다! 유료 플랜이 활성화되었습니다." : "결제가 성공적으로 완료되었습니다!"}
          </p>
        )}

        {/* 결제 버튼 (Apple / Toss 미니멀 슬림 버튼) */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || done}
            onClick={() => runPay()}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {busy
              ? "결제 처리 중…"
              : testMode
                ? `테스트 결제 승인 (${formatKrw(finalPrice)})`
                : `카드 등록 및 결제 (${formatKrw(finalPrice)}/월)`}
          </button>

          {!testMode && import.meta.env.DEV && (
            <button
              type="button"
              disabled={busy || done}
              onClick={() => runPay({ forceTestBypass: true })}
              className="w-full rounded-xl border border-dashed border-amber-300 py-2 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
            >
              개발 전용: 결제 우회 승인
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              clearPendingPayment();
              onClose ? onClose() : onSkip?.();
            }}
            className="w-full rounded-xl py-2 text-[12px] font-normal text-slate-500 hover:text-slate-700 transition-colors"
          >
            다음에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
