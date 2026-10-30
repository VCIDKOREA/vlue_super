import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Lock, Shield } from "lucide-react";
import { VlueBrandMark } from "../../../components/VlueBrandLogo.jsx";
import {
  EXTENSION_LINE_LIST_MONTHLY_KRW,
  EXTENSION_LINE_MONTHLY_KRW,
  EXTENSION_LINE_NO_REFERRAL_NOTE,
  PAID_EVENT_MONTHLY_KRW,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_REFERRAL_MONTHLY_KRW,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_STAFF_REFERRAL_MONTHLY_KRW
} from "../../../lib/membershipBm.js";
import { openPaymentGateway } from "../../../lib/membershipPgCheckout.js";
import { canShowInAppPaymentUi } from "../../../lib/playStorePolicy.js";
import { verifyReferralCode } from "../../../lib/referralVerifyApi.js";

export type CheckoutPlanId = "paid" | "extension_line" | "b2b" | "b2b_admin";

type Props = {
  user?: { email?: string; loginId?: string } | null;
  onLoginClick?: () => void;
  onNavigate?: (view: string) => void;
  /** hash `#checkout/paid` 등에서 전달 */
  initialPlanId?: string | null;
};

const PLAN_CATALOG: {
  id: CheckoutPlanId;
  tab: string;
  name: string;
  price: number;
  listPrice?: number;
  referralPrice?: number | null;
  period: string;
  blurb: string;
  bullets: string[];
  allowsReferral: boolean;
  tier: "paid" | "b2b";
  kind: string;
  accent: "blue" | "violet" | "amber";
}[] = [
  {
    id: "paid",
    tab: "유료 회원",
    name: "프리미엄 월간",
    price: PAID_EVENT_MONTHLY_KRW,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW,
    referralPrice: PAID_REFERRAL_MONTHLY_KRW,
    period: "월",
    blurb: "디지털 인증명함 · 5페이지 쇼케이스 · 가족보호",
    bullets: [
      "케이스함 @아이디 + 인증배지",
      "블루 쇼케이스 · 디지털인증명함",
      "골든타임 가족보호 기본 포함"
    ],
    allowsReferral: true,
    tier: "paid",
    kind: "paid",
    accent: "blue"
  },
  {
    id: "extension_line",
    tab: "내선·대표번호",
    name: "내선·대표번호 추가",
    price: EXTENSION_LINE_MONTHLY_KRW,
    listPrice: EXTENSION_LINE_LIST_MONTHLY_KRW,
    referralPrice: null,
    period: "회선/월",
    blurb: "사업장 유선·대표번호 쇼케이스 연동",
    bullets: [
      "02/1588 등 대표·내선 번호 연동",
      "직통 휴대폰과 브랜딩 실시간 일치",
      EXTENSION_LINE_NO_REFERRAL_NOTE
    ],
    allowsReferral: false,
    tier: "paid",
    kind: "extension_line",
    accent: "violet"
  },
  {
    id: "b2b",
    tab: "B2B 모바일",
    name: "B2B 모바일 회선",
    price: B2B_STAFF_EVENT_MONTHLY_KRW,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW,
    referralPrice: B2B_STAFF_REFERRAL_MONTHLY_KRW,
    period: "모바일 회선/월",
    blurb: "기업 CI/BI · 임직원 풀 쇼케이스",
    bullets: [
      "기업 인증명함·워터마크",
      "임직원 모바일 회선 쇼케이스",
      "추천인 적용 시 할인가"
    ],
    allowsReferral: true,
    tier: "b2b",
    kind: "b2b",
    accent: "amber"
  },
  {
    id: "b2b_admin",
    tab: "B2B 대표자",
    name: "B2B 대표자 계정",
    price: B2B_REP_LIST_MONTHLY_KRW,
    listPrice: undefined,
    referralPrice: null,
    period: "월",
    blurb: "조직·라이선스 일괄 관리 대표 계정",
    bullets: [
      "관리자 대시보드·조직도 연동",
      "단체 라이선스·명함 배포",
      "월 28,300원 (추천인 할인 미적용)"
    ],
    allowsReferral: false,
    tier: "b2b",
    kind: "b2b_admin",
    accent: "amber"
  }
];

const CHECKOUT_PLAN_KEY = "vlue_checkout_plan";

function normalizePlanId(raw?: string | null): CheckoutPlanId {
  const id = String(raw || "").trim().toLowerCase();
  if (id === "extension_line" || id === "extension" || id === "line") return "extension_line";
  if (id === "b2b_admin" || id === "b2b-rep" || id === "b2b_rep" || id === "admin") return "b2b_admin";
  if (id === "b2b" || id === "business") return "b2b";
  return "paid";
}

function readStoredPlan(): CheckoutPlanId {
  try {
    return normalizePlanId(sessionStorage.getItem(CHECKOUT_PLAN_KEY));
  } catch {
    return "paid";
  }
}

export function persistCheckoutPlan(planId: string) {
  const id = normalizePlanId(planId);
  try {
    sessionStorage.setItem(CHECKOUT_PLAN_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

/**
 * KCP: 월간 정기결제만 — 요금제 카드별(유료 / 내선 / B2B) 결제
 */
export default function MembershipCheckoutPage({
  user,
  onLoginClick,
  onNavigate,
  initialPlanId
}: Props) {
  const [planId, setPlanId] = useState<CheckoutPlanId>(() =>
    normalizePlanId(initialPlanId) !== "paid" || initialPlanId
      ? normalizePlanId(initialPlanId || readStoredPlan())
      : readStoredPlan()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState("");
  const [referralVerifying, setReferralVerifying] = useState(false);
  const playGuard = !canShowInAppPaymentUi();

  useEffect(() => {
    if (!initialPlanId) return;
    const next = normalizePlanId(initialPlanId);
    setPlanId(next);
    persistCheckoutPlan(next);
  }, [initialPlanId]);

  const plan = useMemo(
    () => PLAN_CATALOG.find((p) => p.id === planId) || PLAN_CATALOG[0],
    [planId]
  );

  const payAmount = useMemo(() => {
    if (plan.allowsReferral && referralApplied && plan.referralPrice != null) {
      return plan.referralPrice;
    }
    return plan.price;
  }, [plan, referralApplied]);

  const selectPlan = (id: CheckoutPlanId) => {
    setPlanId(id);
    persistCheckoutPlan(id);
    setReferralApplied(false);
    setReferralFeedback("");
    setError("");
  };

  const applyReferral = useCallback(async () => {
    if (!plan.allowsReferral) return;
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
        const price = plan.referralPrice ?? plan.price;
        const sponsor = res.sponsorDisplayName ? ` (${res.sponsorDisplayName}님)` : "";
        setReferralFeedback(
          `추천인 코드가 적용되었습니다${sponsor}. 월 ${price.toLocaleString("ko-KR")}원으로 결제됩니다.`
        );
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
  }, [plan, referralInput]);

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
        tier: plan.tier,
        kind: plan.kind,
        amount: payAmount,
        billingCycle: "monthly",
        referralCode:
          plan.allowsReferral && referralApplied && referralInput.trim()
            ? referralInput.trim()
            : null
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 시작에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [playGuard, user, onLoginClick, plan, payAmount, referralApplied, referralInput]);

  const accentBorder =
    plan.accent === "violet"
      ? "border-violet-400 ring-violet-500/15"
      : plan.accent === "amber"
        ? "border-amber-400 ring-amber-500/15"
        : "border-primary-400 ring-primary-500/15";
  const accentBtn =
    plan.accent === "violet"
      ? "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20"
      : plan.accent === "amber"
        ? "bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-400/20"
        : "bg-primary-600 hover:bg-primary-700 shadow-primary-500/20";

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
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-24 text-center sm:px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-bold tracking-wide text-primary-700">
            <VlueBrandMark size={14} />
            VLUE MEMBERSHIP
          </div>
          <h1
            className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            요금제 선택 · 월간 결제
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
            유료·내선·B2B 각 상품을 월간 정기결제로 진행합니다. 완료 즉시 앱 권한이 동기화됩니다.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLAN_CATALOG.map((p) => {
            const active = p.id === planId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPlan(p.id)}
                className={`rounded-xl border px-2 py-2.5 text-[12px] font-bold transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {p.tab}
              </button>
            );
          })}
        </div>

        <div className={`mt-5 rounded-2xl border bg-white p-6 shadow-sm ring-2 ${accentBorder}`}>
          <p className="text-[15px] font-bold text-slate-800">{plan.name}</p>
          <p className="mt-1 text-[12px] text-slate-500">{plan.blurb}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <span className="text-4xl font-black text-slate-900 tabular-nums">
              {payAmount.toLocaleString("ko-KR")}
            </span>
            <span className="pb-1 text-sm text-slate-500">원/{plan.period}</span>
            {plan.listPrice ? (
              <span className="mb-1 text-[12px] text-slate-400 line-through">
                {plan.listPrice.toLocaleString("ko-KR")}원
              </span>
            ) : null}
            {plan.allowsReferral && referralApplied ? (
              <span className="mb-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                추천인 할인가
              </span>
            ) : null}
          </div>
          {plan.allowsReferral && !referralApplied && plan.referralPrice != null ? (
            <p className="mt-2 text-[12px] text-slate-600">
              기본가 {plan.price.toLocaleString("ko-KR")}원 · 추천인 적용 시{" "}
              <strong>{plan.referralPrice.toLocaleString("ko-KR")}원</strong>
            </p>
          ) : null}
          <ul className="mt-4 space-y-2">
            {plan.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-[13px] text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {plan.allowsReferral ? (
            <>
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
                  유효 코드 적용 시 결제 예정 금액이 즉시 할인됩니다.
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] font-semibold text-slate-500">
              이 상품은 추천인 할인이 적용되지 않습니다.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div>
              <p className="text-[12px] font-bold text-slate-500">결제 예정 금액</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">
                {payAmount.toLocaleString("ko-KR")}원
                <span className="ml-1 text-sm font-semibold text-slate-500">/{plan.period}</span>
              </p>
            </div>
            <button
              type="button"
              disabled={busy || playGuard}
              onClick={() => void startPay()}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-extrabold text-white shadow-md disabled:opacity-45 ${accentBtn}`}
            >
              <Lock className="h-4 w-4" />
              {busy ? "결제창 여는 중…" : user ? "월간 정기결제 계속하기" : "로그인 후 결제"}
            </button>
          </div>

          {error ? <p className="mt-3 text-[12px] font-bold text-rose-600">{error}</p> : null}
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
            포트원(KCP) 월간 정기결제만 지원합니다. 결제 완료 시 계정 권한·인증배지가 앱에 실시간
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
