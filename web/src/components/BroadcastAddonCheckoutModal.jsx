import { useEffect, useState } from "react";
import { formatKrw } from "../lib/membershipBm.js";
import { completeBroadcastCheckout } from "../lib/broadcastLineApi.js";
import { requestIamportBillingPay } from "../lib/iamportClient.js";
import { getPortoneUserCode } from "../lib/portoneEnv.js";
import { clearMembershipAccessCache } from "../lib/membershipAccessGuard.js";

const DEFAULT_REFUND_SUMMARY = "월 15일 이상 사용 시 환불 없음. 15일 미만 사용 시 결제 금액의 50% 환불.";

/**
 * 영업 송출 옵션(+4,200원) 추가 결제
 * @param {{ phoneE164: string, amountKrw: number, billingCycle?: string, refundPolicySummary?: string, policyDetails?: string[] }} checkout
 */
export default function BroadcastAddonCheckoutModal({
  open,
  checkout,
  onClose,
  onComplete,
  onOpenPolicy
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    if (!open) {
      setAgreeRefund(false);
      setError("");
      setShowPolicy(false);
    }
  }, [open]);

  if (!open || !checkout) return null;

  const amount = Number(checkout.amountKrw) || 0;
  const billingCycle = checkout.billingCycle === "annual" ? "annual" : "monthly";
  const refundSummary = checkout.refundPolicySummary || DEFAULT_REFUND_SUMMARY;
  const policyDetails = checkout.policyDetails || [
    "결제 즉시 발신번호 송출 기능이 활성화됩니다.",
    "사용 정지 요청 시 송출은 즉시 중단됩니다.",
    "당월 15일 이상 이용 시 환불 없음, 15일 미만 시 50% 환불 검토."
  ];

  const runPay = async ({ devBypass = false } = {}) => {
    if (!agreeRefund) {
      setError("환불 정책에 동의해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let userId = "";
      try {
        userId = localStorage.getItem("vlue_server_user_id") || "";
      } catch {
        /* ignore */
      }
      if (!userId) throw new Error("로그인 정보가 없습니다.");

      const customer_uid = `user_customer_${userId}`;
      let merchant_uid = `broadcast_${Date.now()}`;

      if (devBypass) {
        if (!import.meta.env.DEV) throw new Error("개발 전용 결제 우회는 로컬에서만 가능합니다.");
        merchant_uid = `dev_broadcast_${Date.now()}`;
        await completeBroadcastCheckout({
          phoneE164: checkout.phoneE164,
          amount,
          billingCycle,
          merchant_uid,
          customer_uid,
          agreeRefundPolicy: true,
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
          merchantUid: merchant_uid,
          name: `VLUE 영업 송출 옵션 (${billingCycle === "annual" ? "1년" : "1월"})`,
          buyerName: localStorage.getItem("vlue_legal_name") || undefined,
          buyerTel
        });
        await completeBroadcastCheckout({
          phoneE164: checkout.phoneE164,
          amount,
          billingCycle,
          merchant_uid: rsp.merchant_uid || merchant_uid,
          customer_uid: rsp.customer_uid || customer_uid,
          agreeRefundPolicy: true
        });
      }

      clearMembershipAccessCache?.();
      onComplete?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[17px] font-black text-slate-900">영업 송출 옵션 결제</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
          >
            닫기
          </button>
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
          등록 번호: <b className="text-slate-900">{checkout.phoneE164}</b>
        </p>

        <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3">
          <p className="text-[11px] font-bold text-slate-500">결제 예정 금액</p>
          <p className="text-[22px] font-black tabular-nums text-teal-900">{formatKrw(amount)}</p>
          <p className="text-[10px] text-slate-600">
            {billingCycle === "annual" ? "1년 옵션" : "월 옵션"} · 부가세 포함
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-3">
          <p className="text-[11px] font-black text-amber-950">환불·정지 정책</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-900">{refundSummary}</p>
          <button
            type="button"
            onClick={() => {
              if (onOpenPolicy) onOpenPolicy();
              else setShowPolicy((v) => !v);
            }}
            className="mt-2 text-[10px] font-bold text-amber-800 underline underline-offset-2"
          >
            정책 상세 안내
          </button>
          {showPolicy ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-amber-900">
              {policyDetails.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={agreeRefund}
            onChange={(e) => setAgreeRefund(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-[11px] font-semibold leading-snug text-slate-700">
            환불·정지 정책(15일 이상 환불 없음 / 15일 미만 50% 환불)을 확인했으며 동의합니다.
          </span>
        </label>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy || !agreeRefund}
            onClick={() => runPay()}
            className="w-full rounded-2xl bg-teal-700 py-3.5 text-[14px] font-black text-white disabled:opacity-50"
          >
            {busy ? "결제 처리 중…" : `결제 및 번호 확정 (${formatKrw(amount)})`}
          </button>
          {import.meta.env.DEV ? (
            <button
              type="button"
              disabled={busy || !agreeRefund}
              onClick={() => runPay({ devBypass: true })}
              className="w-full rounded-xl border border-dashed border-amber-400 py-2.5 text-[12px] font-bold text-amber-950"
            >
              개발 전용: 결제 우회
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
