import { useState } from "react";
import { formatKrw, isB2bMembershipKind, POST_SIGNUP_PAYMENT_NOTICE } from "../lib/membershipBm.js";
import { postSubscribeComplete } from "../lib/subscribeCompleteApi.js";
import { requestIamportBillingPay } from "../lib/iamportClient.js";
import { getPortoneUserCode, isPortoneTestMode } from "../lib/portoneEnv.js";
import { clearPendingPayment } from "../lib/postSignupPayment.js";
import { requirePinForSensitiveAction } from "../lib/appLockBridge.js";
import { resolveAuthValidityPeriod, writeMembershipBillingMeta } from "../lib/authValidityPeriod.js";

/**
 * 가입·본인인증 완료 후 첫 구독 결제
 * @param {{ membershipKind: string, billingCycle: string, amountKrw: number, label?: string }} pending
 */
export default function PostSignupPaymentModal({ open, pending, onComplete, onSkip }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const testMode = isPortoneTestMode();

  if (!open || !pending) return null;

  const isB2b = isB2bMembershipKind(pending.membershipKind);
  const title = isB2b ? "기업 단체 멤버십 결제" : "유료 멤버십 결제";

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
      if (!userId) throw new Error("로그인 정보가 없습니다. 다시 로그인해 주세요.");

      const customer_uid = `user_customer_${userId}`;
      const billingCycle = pending.billingCycle === "annual" ? "annual" : "monthly";
      const amount = Number(pending.amountKrw) || 0;
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
        /* 만료일 = 결제 앵커 기준 고정 (오늘 날짜로 매일 갱신하지 않음) */
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
      onComplete?.({ membershipTier: isB2b ? "b2b" : "paid", billingCycle, testMode: useTestBypass });
    } catch (e) {
      const raw = e?.message || String(e);
      const pgHint =
        /PG모듈|등록되지 않은 PG/i.test(raw) && (testMode || import.meta.env.DEV)
          ? " → 포트원 PG 채널 미등록. 테스트 모드(`VITE_PORTONE_TEST_MODE=true`)에서는 결제 버튼으로 Premium이 바로 부여됩니다."
          : /PG모듈|등록되지 않은 PG/i.test(raw)
            ? " → 결제 연동(포트원 정기결제 PG) 설정을 확인해 주세요."
            : "";
      setError(raw + pgHint);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <h2 className="text-[17px] font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{POST_SIGNUP_PAYMENT_NOTICE}</p>
        {testMode ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">
            포트원 테스트 모드 — 실결제 없이 Premium이 부여됩니다. 네이버페이/실MID 승인 후 `VITE_PORTONE_TEST_MODE`를
            끄세요.
          </p>
        ) : null}
        {pending.label ? (
          <p className="mt-2 text-[11px] font-bold text-indigo-800">{pending.label}</p>
        ) : null}

        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3">
          <p className="mt-0 text-[11px] font-bold text-slate-500">결제 예정 금액</p>
          <p className="text-[22px] font-black tabular-nums text-indigo-900">{formatKrw(pending.amountKrw)}</p>
          <p className="text-[10px] text-slate-600">
            {pending.billingCycle === "annual" ? "1년 구독" : "월 구독"}
            {testMode ? " · 테스트 모드(실청구 없음)" : " · 카드 등록 후 첫 회차 청구"}
          </p>
        </div>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">{error}</p> : null}
        {done ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-800">
            {testMode ? "테스트 결제가 완료되었습니다. Premium이 활성화되었습니다." : "결제가 완료되었습니다."}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || done}
            onClick={() => runPay()}
            className="w-full rounded-2xl bg-indigo-600 py-3.5 text-[14px] font-black text-white disabled:opacity-50"
          >
            {busy
              ? "처리 중…"
              : testMode
                ? `테스트 결제 완료 · Premium 부여 (${formatKrw(pending.amountKrw)})`
                : `카드 등록 및 결제 (${formatKrw(pending.amountKrw)})`}
          </button>
          {!testMode && import.meta.env.DEV ? (
            <button
              type="button"
              disabled={busy || done}
              onClick={() => runPay({ forceTestBypass: true })}
              className="w-full rounded-xl border border-dashed border-amber-400 py-2.5 text-[12px] font-bold text-amber-950"
            >
              개발 전용: 결제 우회
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              clearPendingPayment();
              onSkip?.();
            }}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600"
          >
            나중에 결제 (마이페이지)
          </button>
        </div>
      </div>
    </div>
  );
}
