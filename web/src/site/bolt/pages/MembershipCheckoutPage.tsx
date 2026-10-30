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

type PlanId = "monthly" | "annual" | "family";

type Props = {
  user?: { email?: string; loginId?: string } | null;
  onLoginClick?: () => void;
  onNavigate?: (view: string) => void;
};

const PLANS: {
  id: PlanId;
  name: string;
  price: number;
  listPrice?: number;
  period: string;
  blurb: string;
  bullets: string[];
  badge?: string;
}[] = [
  {
    id: "monthly",
    name: "프리미엄 월간",
    price: PAID_EVENT_MONTHLY_KRW,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW,
    period: "월",
    blurb: "블루 쇼케이스 · 디지털인증명함 · 인증배지",
    bullets: ["케이스함 @아이디 + 인증배지", "쇼케이스·레터링 유료 권한", "가족 보호 기본 슬롯"],
    badge: "인기"
  },
  {
    id: "annual",
    name: "프리미엄 연간",
    price: PAID_EVENT_MONTHLY_KRW * 10,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW * 12,
    period: "년",
    blurb: "월간 대비 약 2개월 혜택 (이벤트가)",
    bullets: ["월간과 동일 유료 권한", "연간 결제 1회", "추천인 코드 시 추가 할인 가능"]
  },
  {
    id: "family",
    name: "골든타임 가족보호",
    price: PAID_REFERRAL_MONTHLY_KRW,
    listPrice: PAID_LIST_PRICE_MONTHLY_KRW,
    period: "월",
    blurb: "유료 멤버십 + 가족 골든타임 패키지 경로",
    bullets: ["기기 미작동 / 앱 미접속 골든타임", "부재중·모르는 번호 장통화 알림", "원격보안·유해사이트 연동"]
  }
];

/**
 * 넷플릭스 감성 다크 요금제·결제 — www 마케팅 전용 (Play WebView 비노출 권장)
 */
export default function MembershipCheckoutPage({ user, onLoginClick, onNavigate }: Props) {
  const [planId, setPlanId] = useState<PlanId>("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plan = useMemo(() => PLANS.find((p) => p.id === planId) || PLANS[0], [planId]);
  const playGuard = !canShowInAppPaymentUi();

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
        amount: plan.price,
        billingCycle: planId === "annual" ? "annual" : "monthly"
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 시작에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [playGuard, user, onLoginClick, plan, planId]);

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <div
        className="relative overflow-hidden border-b border-white/10"
        style={{
          background:
            "radial-gradient(1200px 480px at 50% -10%, rgba(229,9,20,0.35), transparent 60%), linear-gradient(180deg, #141414 0%, #0b0b0f 70%)"
        }}
      >
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-24 text-center sm:px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold tracking-wide text-white/80">
            <VlueBrandMark size={14} />
            VLUE MEMBERSHIP
          </div>
          <h1
            className="text-4xl font-black tracking-tight sm:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            원하는 플랜을 고르고
            <br />
            바로 구독하세요
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            웹에서 가입·결제가 완료되면 앱 계정 권한과 인증배지가 즉시 동기화됩니다. 앱 재설치나 재부팅은
            필요 없습니다.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const active = p.id === planId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={`relative rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-[#e50914] bg-[#1a1a1f] shadow-[0_0_0_1px_rgba(229,9,20,0.4)]"
                    : "border-white/10 bg-[#141416] hover:border-white/25"
                }`}
              >
                {p.badge ? (
                  <span className="absolute right-3 top-3 rounded bg-[#e50914] px-2 py-0.5 text-[10px] font-black">
                    {p.badge}
                  </span>
                ) : null}
                <p className="text-[13px] font-bold text-white/70">{p.name}</p>
                <p className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-black">{p.price.toLocaleString("ko-KR")}</span>
                  <span className="pb-1 text-sm text-white/50">원/{p.period}</span>
                </p>
                {p.listPrice ? (
                  <p className="text-[11px] text-white/40 line-through">
                    {p.listPrice.toLocaleString("ko-KR")}원
                  </p>
                ) : null}
                <p className="mt-2 text-[12px] leading-snug text-white/55">{p.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-[11px] text-white/75">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e50914]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#141416] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold text-white/50">선택 플랜</p>
              <p className="text-lg font-black">
                {plan.name} · {plan.price.toLocaleString("ko-KR")}원/{plan.period}
              </p>
            </div>
            <button
              type="button"
              disabled={busy || playGuard}
              onClick={() => void startPay()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e50914] px-6 py-3 text-[14px] font-extrabold text-white disabled:opacity-45"
            >
              <Lock className="h-4 w-4" />
              {busy ? "결제창 여는 중…" : user ? "결제 계속하기" : "로그인 후 결제"}
            </button>
          </div>
          {error ? <p className="mt-3 text-[12px] font-bold text-rose-400">{error}</p> : null}
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            카드·간편결제(카카오페이/네이버페이 등 PG 지원 수단)는 포트원 보안 결제창에서 처리됩니다.
            결제 완료 웹훅이 수신되면 유료 권한·인증배지가 앱에 실시간 반영됩니다.
          </p>
          {onNavigate ? (
            <button
              type="button"
              className="mt-4 text-[12px] font-semibold text-white/50 underline"
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
