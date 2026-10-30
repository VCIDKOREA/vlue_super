import { useCallback, useMemo, useState } from "react";
import { Check, Lock, Shield } from "lucide-react";
import { VlueBrandMark } from "../../../components/VlueBrandLogo.jsx";
import {
  PAID_EVENT_MONTHLY_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_REFERRAL_MONTHLY_KRW
} from "../../../lib/membershipBm.js";
import { openPaymentGateway } from "../../../lib/membershipPgCheckout.js";
import { canShowInAppPaymentUi } from "../../../lib/playStorePolicy.js";
import { verifyReferralCode } from "../../../lib/referralVerifyApi.js";

type Props = {
  user?: { email?: string; loginId?: string } | null;
  onLoginClick?: () => void;
  onNavigate?: (view: string) => void;
};

const BENEFITS = [
  "케이스함 @아이디 + 인증배지",
  "블루 쇼케이스 · 디지털인증명함",
  "골든타임 가족보호 기본 포함",
  "쇼케이스·레터링 유료 권한"
];

/**
 * KCP 심사 기준: 월간 정기결제 단일 상품 + 추천인 할인
 * (연간·고액 일시불·독립 골든타임 상품 카드 없음)
 */
export default function MembershipCheckoutPage({ user, onLoginClick, onNavigate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState("");
  const [referralVerifying, setReferralVerifying] = useState(false);
  const playGuard = !canShowInAppPaymentUi();

  const payAmount = useMemo(
    () => (referralApplied ? PAID_REFERRAL_MONTHLY_KRW : PAID_EVENT_MONTHLY_KRW),
    [referralApplied]
  );

  const applyReferral = useCallback(async () => {
    setReferralFeedback("");
    setError("");
    const code = String(referralInput || "").trim();
    if (!code) {
      setReferralFeedback("추천인 코드를 입력해 주세요.");
      setReferralApplied(false);
      return;
    }
    setReferralVerifying(true);
    try {
      const res = await verifyReferralCode(code);
      if (res?.valid) {
        setReferralApplied(true);
        const sponsor = res.sponsorDisplayName ? ` (${res.sponsorDisplayName}님)` : "";
        setReferralFeedback(`추천인 코드가 적용되었습니다${sponsor}. 월 ${PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원으로 결제됩니다.`);
        return;
      }
      setReferralApplied(false);
      setReferralFeedback(res?.error || "유효하지 않은 추천인 코드입니다.");
    } catch {
      setReferralApplied(false);
      setReferralFeedback("추천인 코드 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setReferralVerifying(false);
    }
  }, [referralInput]);

  const clearReferral = useCallback(() => {
    setReferralInput("");
    setReferralApplied(false);
    setReferralFeedback("");
  }, []);

  const startPay = useCallback(async () => {
    setError("");
    if (playGuard) {
      setError("이 환경에서는 결제를 진행할 수 없습니다.");
      return;
    }
    if (!user) {
      onLoginClick?.();
      return;
    }
    setBusy(true);
    try {
      await openPaymentGateway({
        tier: "paid",
        kind: "paid",
        amount: payAmount,
        billingCycle: "monthly",
        referralCode: referralApplied && referralInput.trim() ? referralInput.trim() : null
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 시작에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [playGuard, user, onLoginClick, payAmount, referralApplied, referralInput]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 text-slate-900">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% -20%, rgba(37,99,235,0.12), transparent 55%), radial-gradient(600px 280px at 85% 10%, rgba(14,165,233,0.08), transparent 50%)"
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-24 text-center sm:px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-bold tracking-wide text-primary-700">
            <VlueBrandMark size={14} />
            VLUE MEMBERSHIP
          </div>
          <h1
            className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            프리미엄 월간 구독
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
            월간 정기결제만 제공합니다. 결제 완료 즉시 앱 권한·인증배지가 동기화됩니다.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-primary-400 bg-white p-6 shadow-sm ring-2 ring-primary-500/15 sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-bold text-white">
              월간 정기결제
            </span>
            <span className="text-[12px] text-slate-400 line-through">
              정가 {PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원
            </span>
          </div>

          <p className="mt-4 text-[15px] font-bold text-slate-800">프리미엄 멤버십</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <span className="text-4xl font-black text-slate-900 tabular-nums">
              {payAmount.toLocaleString("ko-KR")}
            </span>
            <span className="pb-1 text-sm text-slate-500">원/월</span>
            {referralApplied ? (
              <span className="mb-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                추천인 할인가
              </span>
            ) : (
              <span className="mb-1 text-[12px] text-slate-400 line-through">
                {PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원
              </span>
            )}
          </div>
          {!referralApplied ? (
            <p className="mt-2 text-[12px] text-slate-600">
              기본가 {PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원/월 · 추천인 코드 적용 시{" "}
              <strong className="text-primary-700">
                {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원/월
              </strong>
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-emerald-700 font-semibold">
              {PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원 →{" "}
              {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원 (추천인 할인 적용)
            </p>
          )}

          <ul className="mt-5 space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-2 text-[13px] text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="block text-[12px] font-bold text-slate-600" htmlFor="checkout-referral">
            추천인 코드 (선택)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="checkout-referral"
              type="text"
              value={referralInput}
              onChange={(e) => {
                setReferralInput(e.target.value);
                if (referralApplied) {
                  setReferralApplied(false);
                  setReferralFeedback("");
                }
              }}
              placeholder="추천인 코드 입력"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] font-semibold text-slate-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
              autoComplete="off"
            />
            {referralApplied ? (
              <button
                type="button"
                onClick={clearReferral}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
              >
                해제
              </button>
            ) : (
              <button
                type="button"
                disabled={referralVerifying || !referralInput.trim()}
                onClick={() => void applyReferral()}
                className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-45 hover:bg-slate-800"
              >
                {referralVerifying ? "확인 중…" : "적용"}
              </button>
            )}
          </div>
          {referralFeedback ? (
            <p
              className={`mt-2 text-[12px] font-semibold ${
                referralApplied ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {referralFeedback}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              유효한 코드를 적용하면 결제 예정 금액이 즉시{" "}
              {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원/월로 바뀝니다.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div>
              <p className="text-[12px] font-bold text-slate-500">결제 예정 금액</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">
                {payAmount.toLocaleString("ko-KR")}원
                <span className="ml-1 text-sm font-semibold text-slate-500">/월</span>
              </p>
            </div>
            <button
              type="button"
              disabled={busy || playGuard}
              onClick={() => void startPay()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-[14px] font-extrabold text-white shadow-md shadow-primary-500/20 disabled:opacity-45 hover:bg-primary-700"
            >
              <Lock className="h-4 w-4" />
              {busy ? "결제창 여는 중…" : user ? "월간 정기결제 계속하기" : "로그인 후 결제"}
            </button>
          </div>

          {error ? <p className="mt-3 text-[12px] font-bold text-rose-600">{error}</p> : null}
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
            포트원(KCP) 월간 정기결제만 지원합니다. 결제 완료 웹훅 수신 시 유료 권한·인증배지가 앱에 실시간
            반영됩니다.
          </p>
          {onNavigate ? (
            <button
              type="button"
              className="mt-4 text-[12px] font-semibold text-primary-600 underline"
              onClick={() => onNavigate("pricing")}
            >
              요금제 안내로 돌아가기
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
