import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import {
  isPaidMembershipKind,
  normalizeMembershipKind,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_EVENT_MONTHLY_KRW,
  PAID_REFERRAL_MONTHLY_KRW
} from "../../lib/membershipBm.js";
import PaymentModal from "../payment/PaymentModal.jsx";

const PLAN_BENEFITS = [
  {
    icon: "🛡️",
    title: "가족보호 시스템 (핵심 혜택)",
    desc: "본인 및 가족 최대 3명(2계정 최대 8명) 실시간 위치 확인, 이동 경로 및 안심 귀가 케어, 원터치 SOS 긴급 알림 제공",
    tag: "인기"
  },
  {
    icon: "📱",
    title: "무제한 블루 쇼케이스",
    desc: "통화 수신/발신 화면에 고화질 영상, 포트폴리오, 디지털 명함을 송출 횟수 및 트래픽 제한 없이 무제한 송출",
    tag: "대표기능"
  },
  {
    icon: "🎵",
    title: "BGM 독립 & 프리미엄 사운드",
    desc: "상대방과 통화 연결 시 통신사 컬러링과 독립된 나만의 맞춤 배경음악 및 보이스 레터링 재생",
    tag: "프리미엄"
  },
  {
    icon: "🔒",
    title: "보이스피싱 안심 차단 & 공식 인증 마크",
    desc: "피싱 의심 번호 실시간 탐지 차단, VLUÉ 공인 안심 인증 마크로 수신자에게 100% 신뢰 제공",
    tag: "보안"
  }
];

/**
 * [VLUÉ] 멤버십 플랜 선택 & 세일즈 퍼널 모달
 * Apple · Toss 프리미엄 스타일
 * - 수동 접수/승인 대기 완전 폐지
 * - 유료 플랜 선택 ➔ 강점 베네핏 카드 안내 ➔ 결제 모달 직행
 */
export default function MembershipModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onMembershipTierChange
}) {
  const currentKind = normalizeMembershipKind(membershipTier);
  const [selectedPlan, setSelectedPlan] = useState(isPaidMembershipKind(currentKind) ? "paid" : "paid");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setSelectedPlan(isPaidMembershipKind(currentKind) ? "paid" : "paid");
  }, [currentKind, open]);

  if (!open || isVlueKidsApp()) return null;

  const handleStartPayment = () => {
    // 수동 접수/대기 없이 즉시 결제창 직행
    setPaymentOpen(true);
  };

  const handleSwitchToFree = () => {
    if (currentKind === "free") return;
    if (window.confirm("무료 플랜으로 전환하시겠습니까?\n가족보호 및 무제한 쇼케이스 기능이 기본 상태로 변경됩니다.")) {
      try {
        localStorage.setItem("membershipTier", "free");
        localStorage.setItem("vlue_subscription_paid", "0");
      } catch {
        /* ignore */
      }
      onMembershipTierChange?.("free");
      setToastMessage("무료 플랜으로 전환되었습니다.");
      setTimeout(() => {
        onClose?.();
      }, 1000);
    }
  };

  const handlePaymentComplete = (result) => {
    setPaymentOpen(false);
    onMembershipTierChange?.(result?.membershipTier || "paid");
    setToastMessage("유료 플랜 결제가 완료되었습니다. 프리미엄 기능이 활성화되었습니다!");
    setTimeout(() => {
      onClose?.();
    }, 1500);
  };

  const panelBg = isDarkMode ? "bg-[#141722] border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900";
  const subTextCls = isDarkMode ? "text-slate-400 font-normal" : "text-slate-500 font-normal";

  const content = (
    <div
      className="fixed inset-0 z-[50000] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{ letterSpacing: "-0.02em" }}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default bg-transparent"
        aria-label="배경 눌러 닫기"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${panelBg}`}
      >
        {/* 모달 상단 헤더 */}
        <div className={`flex items-center justify-between border-b px-6 py-4.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <div>
            <span className="text-[11px] font-medium text-blue-600 tracking-tight">VLUÉ MEMBERSHIP</span>
            <h2 className="text-[18px] font-semibold tracking-tight mt-0.5">멤버십 플랜 선택</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 text-xl leading-none transition-colors ${
              isDarkMode ? "text-slate-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 바디 스크롤 영역 */}
        <div className="overflow-y-auto px-6 py-5 overscroll-contain">
          {/* 플랜 탭 선택기 (Apple 미니멀 세그먼트) */}
          <div className={`flex rounded-2xl p-1 border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100/90 border-slate-200/60"}`}>
            <button
              type="button"
              onClick={() => setSelectedPlan("paid")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all ${
                selectedPlan === "paid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDarkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              유료 플랜 (추천)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("free")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all ${
                selectedPlan === "free"
                  ? isDarkMode ? "bg-white/15 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                  : isDarkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              무료 플랜 (Free)
            </button>
          </div>

          {selectedPlan === "paid" ? (
            <div className="mt-5 space-y-4">
              {/* 유료 플랜 가격 히어로 카드 */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-slate-900/40 border-blue-500/30 ring-1 ring-blue-500/20"
                    : "bg-gradient-to-br from-blue-50 via-sky-50/50 to-indigo-50/30 border-blue-200 ring-1 ring-blue-200/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                    BEST · 프리미엄 올인원
                  </span>
                  <span className="text-[12px] font-normal text-slate-400 line-through">
                    정가 {PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[28px] font-semibold text-blue-600 tabular-nums">
                    {PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원
                  </span>
                  <span className={`text-[13px] ${subTextCls}`}>/월</span>
                  <span className="ml-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                    추천인 시 {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원
                  </span>
                </div>

                <p className={`mt-2 text-[12px] leading-relaxed ${subTextCls}`}>
                  추천인 코드 입력 시 즉시 <b>월 {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원</b>으로 특별 할인가가 적용됩니다.
                </p>
              </div>

              {/* 매력적인 베네핏 카드 그리드 */}
              <div>
                <h3 className="text-[13px] font-semibold mb-2.5 text-slate-800 dark:text-slate-200">
                  유료 플랜 핵심 강점 혜택
                </h3>
                <div className="space-y-2.5">
                  {PLAN_BENEFITS.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border p-3.5 transition-all ${
                        isDarkMode
                          ? "bg-white/5 border-white/10 hover:border-blue-400/30"
                          : "bg-white border-slate-200/90 shadow-sm hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[17px]">{item.icon}</span>
                        <h4 className="text-[13px] font-semibold tracking-tight">{item.title}</h4>
                        <span className="ml-auto rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {item.tag}
                        </span>
                      </div>
                      <p className={`mt-1.5 text-[11px] leading-relaxed ${subTextCls}`}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA 세일즈 직행 버튼 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartPayment}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
                >
                  {isPaidMembershipKind(currentKind)
                    ? "유료 플랜 결제 관리 (추천인 코드 적용)"
                    : `유료 플랜 결제하기 (${PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원 ➔ 추천인 시 9,900원) →`}
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-400 font-normal">
                  승인 대기 없이 카드 등록 후 즉시 프리미엄 혜택이 적용됩니다.
                </p>
              </div>
            </div>
          ) : (
            /* 무료 플랜 뷰 */
            <div className="mt-5 space-y-4">
              <div className={`rounded-2xl border p-5 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                <h3 className="text-[15px] font-semibold">일반 회원 (Free 플랜)</h3>
                <p className={`mt-1 text-[12px] leading-relaxed ${subTextCls}`}>
                  기본 발신자 신원 확인 및 기본 블루 쇼케이스를 무료로 이용할 수 있습니다.
                </p>

                <div className="mt-4 space-y-2 text-[12px]">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span>✓</span> <span>기본 안심 통화 및 발신자 확인</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span>✓</span> <span>기본 블루 쇼케이스 송출</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 line-through">
                    <span>✕</span> <span>가족보호 실시간 위치 및 SOS 연동 (유료 전용)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 line-through">
                    <span>✕</span> <span>BGM 독립 설정 및 프리미엄 사운드 (유료 전용)</span>
                  </div>
                </div>
              </div>

              {isPaidMembershipKind(currentKind) ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSwitchToFree}
                    className="w-full rounded-2xl border border-slate-300 dark:border-white/20 py-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    무료 플랜으로 다운그레이드
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-center text-[12px] font-medium text-slate-600 dark:text-slate-400">
                  현재 이용 중인 플랜입니다.
                </div>
              )}
            </div>
          )}

          {toastMessage && (
            <p className="mt-4 text-center text-[12px] font-medium text-blue-600 dark:text-blue-400 animate-fade-in">
              {toastMessage}
            </p>
          )}
        </div>
      </div>

      {/* 결제 직행 PaymentModal */}
      {paymentOpen && (
        <PaymentModal
          open={paymentOpen}
          pending={{
            membershipKind: "paid",
            billingCycle: "monthly",
            amountKrw: PAID_EVENT_MONTHLY_KRW,
            label: "VLUÉ 유료 플랜 (가족보호·무제한 쇼케이스·BGM 독립)"
          }}
          onClose={() => setPaymentOpen(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(content, document.body);
}
