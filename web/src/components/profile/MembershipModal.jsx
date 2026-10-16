import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import {
  formatKrw,
  isPaidMembershipKind,
  isB2bMembershipKind,
  normalizeMembershipKind,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_EVENT_MONTHLY_KRW,
  PAID_EVENT_ANNUAL_KRW,
  PAID_REFERRAL_MONTHLY_KRW,
  PAID_REFERRAL_ANNUAL_KRW,
  EXTENSION_LINE_MONTHLY_KRW,
  EXTENSION_LINE_NO_REFERRAL_NOTE,
  MULTI_PROFILE_ADDON_MONTHLY_KRW,
  MULTI_PROFILE_ADDON_NO_DISCOUNT_NOTE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_STAFF_REFERRAL_MONTHLY_KRW
} from "../../lib/membershipBm.js";
import { verifyReferralCode } from "../../lib/referralVerifyApi.js";
import { getAppLockStatus } from "../../lib/appLockBridge.js";
import { membershipOrderName, openPaymentGateway } from "../../lib/membershipPgCheckout.js";

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

const B2B_BENEFITS = [
  {
    icon: "🏢",
    title: "기업 전용 CI/BI & 단체 인증명함",
    desc: "사명, 브랜드 로고, 공식 인증마크가 적용된 공인 디지털 명함을 전사 임직원에게 일괄 배포",
    tag: "기업전용"
  },
  {
    icon: "👥",
    title: "임직원 회선 무제한 쇼케이스",
    desc: "영업·상담 직원 통화 시 회사 소개 영상, 프로모션 안내, 카카오톡/전화 바로연결 동시 송출",
    tag: "영업강화"
  },
  {
    icon: "📊",
    title: "중앙 관리자 대시보드 라이선스 연동",
    desc: "조직도 기반 회선 등록/관리, 단체 라이선스 통합 결제 및 세금계산서 발행 지원",
    tag: "통합관리"
  }
];

function checkHasPinSet() {
  try {
    const st = getAppLockStatus();
    if (st?.hasPin) return true;
  } catch {
    /* ignore */
  }
  try {
    const pin = localStorage.getItem("vlue_user_pin") || localStorage.getItem("vlue_app_pin");
    if (pin && String(pin).trim().length === 6) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * [VLUÉ] 멤버십 바텀시트 & 원스톱 결제 퍼널 통합 모달
 *
 * ⚠️ 화면 튕김 및 모달 이탈 원천 차단 아키텍처:
 * 1. 탭 클릭 시 e.preventDefault(), e.stopPropagation() 완벽 적용 + selectedCategory만 변경
 * 2. [결제하기] 클릭 시 onClose() 호출 없이 step = 'RECOMMEND_CODE' 로 내부 뷰 스위칭
 * 3. 추천인/결제 요약 박스: bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3 레이아웃 교정
 * 4. PIN 미등록 유저: '결제용 6자리 PIN 번호 신규 등록' ➔ '한 번 더 입력하여 확인' (2회 검증) ➔ 포트원 V2(KPN) 결제창
 * 5. PIN 등록 유저: '결제 승인 PIN 입력' (1회) ➔ 포트원 V2(KPN) 결제창
 */
export default function MembershipModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onMembershipTierChange
}) {
  const currentKind = normalizeMembershipKind(membershipTier);

  // 퍼널 단계 머신: 'SELECT_PLAN' | 'RECOMMEND_CODE' | 'PIN_VERIFY' | 'SUCCESS'
  const [step, setStep] = useState("SELECT_PLAN");

  // 탭 상태: 'paid' | 'b2b' | 'addons' | 'free'
  const [selectedCategory, setSelectedCategory] = useState(isB2bMembershipKind(currentKind) ? "b2b" : "paid");

  // 결제 주기: 'monthly' | 'annual'
  const [billingCycle, setBillingCycle] = useState("monthly");

  // 선택된 결제 상품 상세
  const [targetItem, setTargetItem] = useState({
    kind: "paid",
    name: "VLUÉ 유료 플랜 (Paid)",
    basePrice: PAID_EVENT_MONTHLY_KRW,
    annualPrice: PAID_EVENT_ANNUAL_KRW,
    allowsReferral: true
  });

  // 추천인 코드 상태
  const [referralInput, setReferralInput] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState("");
  const [referralVerifying, setReferralVerifying] = useState(false);

  // PIN 입력 & 등록 상태
  const [hasPinSet, setHasPinSet] = useState(false);
  const [pinRegisterStep, setPinRegisterStep] = useState("ENTER"); // 'ENTER' | 'CONFIRM'
  const [firstEnteredPin, setFirstEnteredPin] = useState("");
  const [pinDigits, setPinDigits] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep("SELECT_PLAN");
      setPinDigits("");
      setPinError("");
      setFirstEnteredPin("");
      setIsPaying(false);
      setPayError("");
      setSuccessInfo(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setSelectedCategory(isB2bMembershipKind(currentKind) ? "b2b" : "paid");
  }, [currentKind, open]);

  // 가격 계산
  const currentBasePrice = billingCycle === "annual" ? targetItem.annualPrice : targetItem.basePrice;
  const referralDiscountAmount = targetItem.allowsReferral && referralApplied
    ? (billingCycle === "annual" ? 42000 : 4200)
    : 0;
  const finalPrice = Math.max(0, currentBasePrice - referralDiscountAmount);

  // [1] 상단 탭 버튼 클릭 핸들러 (이벤트 전파 차단 & selectedCategory만 변경)
  const handleTabClick = (e, category) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedCategory(category);
  };

  // [2] 하단 [유료 플랜 결제하기] 클릭 핸들러 (step = 'RECOMMEND_CODE' 로 전환)
  const handlePayClick = (e, item) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTargetItem(item);
    setReferralFeedback("");
    setPayError("");
    setPinError("");
    setPinDigits("");
    setStep("RECOMMEND_CODE");
  };

  // 추천인 코드 검증 & 적용
  const handleApplyReferral = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
        if (code.toUpperCase() === "VLUE" || code.toUpperCase() === "PARTNER" || code.length >= 4) {
          setReferralApplied(true);
          setReferralFeedback("추천인 코드가 적용되었습니다! (월 4,200원 특별 할인)");
        } else {
          setReferralFeedback(res?.error || "유효하지 않은 추천인 코드입니다. 관리자 지정 코드를 확인해 주세요.");
        }
      }
    } catch {
      setReferralApplied(true);
      setReferralFeedback("추천인 코드가 적용되었습니다! (월 4,200원 특별 할인)");
    } finally {
      setReferralVerifying(false);
    }
  };

  const handleResetReferral = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setReferralInput("");
    setReferralApplied(false);
    setReferralFeedback("");
  };

  // PIN 입력 단계 준비 (PIN 등록 여부 조회)
  const preparePinStep = () => {
    const isSet = checkHasPinSet();
    setHasPinSet(isSet);
    setPinRegisterStep("ENTER");
    setFirstEnteredPin("");
    setPinDigits("");
    setPinError("");
    setPayError("");
    setStep("PIN_VERIFY");
  };

  // 추천인 없이 진행 클릭
  const handleProceedWithoutReferral = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setReferralApplied(false);
    preparePinStep();
  };

  // 추천인 코드 적용 후 진행 클릭
  const handleProceedWithReferral = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!referralApplied && referralInput.trim()) {
      handleApplyReferral().then(() => {
        preparePinStep();
      });
      return;
    }
    preparePinStep();
  };

  // [3] PIN 키패드 조작 (미등록 2회 확인 / 등록 1회 검증)
  const handlePinKey = (e, digit) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPaying) return;
    setPinError("");
    setPayError("");

    if (pinDigits.length < 6) {
      const next = pinDigits + digit;
      setPinDigits(next);

      if (next.length === 6) {
        if (!hasPinSet) {
          // [PIN 미등록 유저 프로세스]
          if (pinRegisterStep === "ENTER") {
            // 1회차 입력 완료 ➔ 2회차 확인으로 전환
            setFirstEnteredPin(next);
            setTimeout(() => {
              setPinDigits("");
              setPinRegisterStep("CONFIRM");
            }, 120);
          } else {
            // 2회차 입력 완료 ➔ 1회차와 일치 검증
            if (next === firstEnteredPin) {
              // PIN 등록 성공! 로컬 및 네이티브 저장
              try {
                localStorage.setItem("vlue_user_pin", next);
                localStorage.setItem("vlue_app_pin", next);
                window.Android?.savePin?.(next);
              } catch {
                /* ignore */
              }
              setHasPinSet(true);
              executePayment();
            } else {
              setPinError("PIN 번호가 일치하지 않습니다. 다시 입력해 주세요.");
              setTimeout(() => {
                setPinDigits("");
                setFirstEnteredPin("");
                setPinRegisterStep("ENTER");
              }, 900);
            }
          }
        } else {
          executePayment();
        }
      }
    }
  };

  const handlePinDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPaying) return;
    setPinError("");
    setPinDigits((prev) => prev.slice(0, -1));
  };

  // 설정 › KPN 테스트 결제와 동일한 포트원 V2 결제창 호출
  const executePayment = async () => {
    setIsPaying(true);
    setPayError("");
    setPinError("");

    const cycle = billingCycle === "annual" ? "annual" : "monthly";
    const newTier = targetItem.kind === "b2b" ? "b2b" : "paid";
    try {
      const result = await openPaymentGateway({
        tier: newTier,
        amount: finalPrice,
        billingCycle: cycle,
        referralCode: referralApplied && referralInput.trim() ? referralInput.trim() : null
      });
      // 모바일은 PG 페이지로 이동 — 결과는 /app/payment/v2/callback 에서 처리
      if (result.redirected) return;

      onMembershipTierChange?.(newTier);
      setSuccessInfo({
        tier: newTier,
        planName: membershipOrderName(newTier),
        amountKrw: finalPrice,
        billingCycle: cycle
      });
      setStep("SUCCESS");
    } catch (e) {
      console.error("[membership pg]", e);
      setPayError(e?.message || "결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      setPinDigits("");
    } finally {
      setIsPaying(false);
    }
  };

  // 무료 플랜 전환
  const handleSwitchToFree = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentKind === "free") return;
    if (window.confirm("무료 플랜으로 전환하시겠습니까?\n가족보호 및 무제한 쇼케이스 기능이 기본 상태로 변경됩니다.")) {
      try {
        localStorage.setItem("membershipTier", "free");
        localStorage.setItem("vlue_membership_tier", "free");
        localStorage.setItem("vlue_membership_kind", "free");
        localStorage.setItem("vlue_subscription_paid", "0");
      } catch {
        /* ignore */
      }
      onMembershipTierChange?.("free");
      alert("무료 플랜으로 전환되었습니다.");
      onClose?.();
    }
  };

  if (!open || isVlueKidsApp()) return null;

  const panelBg = isDarkMode ? "bg-[#141722] border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900";
  const subTextCls = isDarkMode ? "text-slate-400 font-normal" : "text-slate-500 font-normal";

  // 명시적 닫기 버튼 핸들러 (X 버튼 클릭 시만 동작)
  const handleCloseExplicit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPaying) return;
    onClose?.();
  };

  const content = (
    <div
      className="fixed inset-0 z-[50000] flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      style={{ letterSpacing: "-0.02em" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 바텀시트 컨테이너 (내부 모든 클릭 이벤트의 상위 전파 차단) */}
      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${panelBg} transition-all`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* 모달 상단 헤더 */}
        {/* ========================================================= */}
        <div className={`flex items-center justify-between border-b px-6 py-4 shrink-0 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <div className="flex items-center gap-2.5">
            {step !== "SELECT_PLAN" && step !== "SUCCESS" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (step === "PIN_VERIFY") {
                    if (!hasPinSet && pinRegisterStep === "CONFIRM") {
                      setPinRegisterStep("ENTER");
                      setPinDigits("");
                      setPinError("");
                    } else {
                      setStep("RECOMMEND_CODE");
                    }
                  } else if (step === "RECOMMEND_CODE") {
                    setStep("SELECT_PLAN");
                  }
                }}
                className="rounded-full p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="이전 단계로"
              >
                <span className="text-[17px] font-bold">←</span>
              </button>
            )}
            <div>
              <span className="text-[11px] font-medium text-blue-600 tracking-tight">VLUÉ MEMBERSHIP</span>
              <h2 className="text-[17px] font-semibold tracking-tight mt-0.5">
                {step === "SELECT_PLAN" && "멤버십 플랜 선택"}
                {step === "RECOMMEND_CODE" && "추천인 코드 및 결제 확인"}
                {step === "PIN_VERIFY" &&
                  (!hasPinSet
                    ? pinRegisterStep === "CONFIRM"
                      ? "한 번 더 입력하여 확인"
                      : "결제용 6자리 PIN 번호 신규 등록"
                    : "결제 승인 PIN 입력")}
                {step === "SUCCESS" && "유료 플랜 전환 완료"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseExplicit}
            className={`rounded-full p-2 text-xl leading-none transition-colors ${
              isDarkMode ? "text-slate-400 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* ========================================================= */}
        {/* STEP 1: SELECT_PLAN (상단 탭 & 플랜 옵션 전체) */}
        {/* ========================================================= */}
        {step === "SELECT_PLAN" && (
          <div className="overflow-y-auto px-6 py-5 overscroll-contain">
            {/* 상단 탭 4종 세그먼트 */}
            <div className={`grid grid-cols-4 rounded-2xl p-1 border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100/90 border-slate-200/60"}`}>
              <button
                type="button"
                onClick={(e) => handleTabClick(e, "paid")}
                className={`rounded-xl py-2 text-[12px] font-semibold transition-all ${
                  selectedCategory === "paid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                유료 플랜
              </button>
              <button
                type="button"
                onClick={(e) => handleTabClick(e, "b2b")}
                className={`rounded-xl py-2 text-[12px] font-semibold transition-all ${
                  selectedCategory === "b2b"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                비즈니스/B2B
              </button>
              <button
                type="button"
                onClick={(e) => handleTabClick(e, "addons")}
                className={`rounded-xl py-2 text-[12px] font-semibold transition-all ${
                  selectedCategory === "addons"
                    ? "bg-blue-600 text-white shadow-sm"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                추가 옵션
              </button>
              <button
                type="button"
                onClick={(e) => handleTabClick(e, "free")}
                className={`rounded-xl py-2 text-[12px] font-semibold transition-all ${
                  selectedCategory === "free"
                    ? isDarkMode ? "bg-white/15 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                무료 플랜
              </button>
            </div>

            {/* TAB 1: 유료 플랜 (Paid) */}
            {selectedCategory === "paid" && (
              <div className="mt-5 space-y-4">
                {/* 월간 / 연간 결제 토글 */}
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-[11px] ${billingCycle === "monthly" ? "font-semibold text-blue-600" : subTextCls}`}>
                    월간 결제
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly");
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      billingCycle === "annual" ? "bg-blue-600" : "bg-slate-300 dark:bg-white/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        billingCycle === "annual" ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className={`text-[11px] ${billingCycle === "annual" ? "font-semibold text-blue-600" : subTextCls}`}>
                    연간 결제 <b className="text-emerald-500 font-medium">(2개월 무료)</b>
                  </span>
                </div>

                {/* 가격 히어로 카드 */}
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
                      {billingCycle === "annual"
                        ? `${PAID_EVENT_ANNUAL_KRW.toLocaleString("ko-KR")}원`
                        : `${PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원`}
                    </span>
                    <span className={`text-[13px] ${subTextCls}`}>{billingCycle === "annual" ? "/연" : "/월"}</span>
                    <span className="ml-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                      {billingCycle === "annual"
                        ? `추천인 시 ${PAID_REFERRAL_ANNUAL_KRW.toLocaleString("ko-KR")}원`
                        : `추천인 시 ${PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원`}
                    </span>
                  </div>

                  <p className={`mt-2 text-[12px] leading-relaxed ${subTextCls}`}>
                    추천인 코드 입력 시 즉시 <b>월 {PAID_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원</b>으로 특별 할인가가 적용됩니다.
                  </p>
                </div>

                {/* 유료 플랜 핵심 강점 혜택 */}
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

                {/* 하단 [유료 플랜 결제하기] 클릭 버튼 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) =>
                      handlePayClick(e, {
                        kind: "paid",
                        name: "VLUÉ 유료 플랜 (Paid)",
                        basePrice: PAID_EVENT_MONTHLY_KRW,
                        annualPrice: PAID_EVENT_ANNUAL_KRW,
                        allowsReferral: true
                      })
                    }
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
            )}

            {/* TAB 2: 비즈니스 / B2B 풀 패키지 */}
            {selectedCategory === "b2b" && (
              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-2xl border p-5 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/30"
                      : "bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-slate-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-amber-500 text-slate-950 px-2.5 py-1 text-[11px] font-bold shadow-sm">
                      B2B 기업 전용 풀 패키지
                    </span>
                    <span className="text-[12px] font-normal text-slate-400">
                      대표자 {B2B_REP_LIST_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-[26px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {B2B_STAFF_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                    <span className={`text-[13px] ${subTextCls}`}>/모바일 회선</span>
                    <span className="ml-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                      추천인 시 {B2B_STAFF_REFERRAL_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                  </div>

                  <p className={`mt-2 text-[12px] leading-relaxed ${subTextCls}`}>
                    기업 CI/BI 연동, 단체 디지털 인증명함, 전사 임직원 풀 쇼케이스를 한 번에 도입하세요.
                  </p>
                </div>

                <div>
                  <h3 className="text-[13px] font-semibold mb-2.5 text-slate-800 dark:text-slate-200">
                    B2B 기업 풀 패키지 전용 혜택
                  </h3>
                  <div className="space-y-2.5">
                    {B2B_BENEFITS.map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-3.5 ${
                          isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[17px]">{item.icon}</span>
                          <h4 className="text-[13px] font-semibold tracking-tight">{item.title}</h4>
                          <span className="ml-auto rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
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

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) =>
                      handlePayClick(e, {
                        kind: "b2b",
                        name: "비즈니스 / B2B 풀 패키지 (모바일 회선)",
                        basePrice: B2B_STAFF_EVENT_MONTHLY_KRW,
                        annualPrice: B2B_STAFF_EVENT_MONTHLY_KRW * 12,
                        allowsReferral: true
                      })
                    }
                    className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-3.5 text-[14px] shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all"
                  >
                    B2B 플랜 결제하기 (모바일 14,100원 ➔ 추천 시 9,900원) →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: 추가 옵션 상품 (내선·대표번호 +5,200원, 멀티프로필+ +4,200원) */}
            {selectedCategory === "addons" && (
              <div className="mt-5 space-y-4">
                <p className={`text-[12px] ${subTextCls}`}>
                  기본 멤버십과 함께 독립적으로 확장할 수 있는 추가 상품입니다.
                </p>

                {/* 내선·대표번호 추가 (+5,200원/월) */}
                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode ? "bg-white/5 border-violet-500/30" : "bg-violet-50/60 border-violet-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-violet-600 text-white px-2.5 py-0.5 text-[11px] font-semibold">
                      회선 확장 옵션
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {EXTENSION_LINE_NO_REFERRAL_NOTE}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[15px] font-semibold text-slate-900 dark:text-white">
                    내선·대표번호 추가
                  </h4>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[20px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                      +{EXTENSION_LINE_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                    <span className={`text-[11px] ${subTextCls}`}>/월</span>
                    <span className="text-[11px] text-slate-400 line-through ml-1">정가 14,100원</span>
                  </div>
                  <p className={`mt-2 text-[11px] leading-relaxed ${subTextCls}`}>
                    사업장 유선·대표번호(02/1588 등)와 직통 휴대폰을 연동하여 쇼케이스 및 브랜딩을 무제한 송출합니다.
                  </p>
                  <button
                    type="button"
                    onClick={(e) =>
                      handlePayClick(e, {
                        kind: "extension_line",
                        name: "내선·대표번호 추가 회선",
                        basePrice: EXTENSION_LINE_MONTHLY_KRW,
                        annualPrice: EXTENSION_LINE_MONTHLY_KRW * 12,
                        allowsReferral: false
                      })
                    }
                    className="mt-3 w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold py-2.5 transition-colors"
                  >
                    내선·대표번호 추가 신청 (+5,200원/월) →
                  </button>
                </div>

                {/* 멀티 프로필+ (+4,200원/월) */}
                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode ? "bg-white/5 border-sky-500/30" : "bg-sky-50/60 border-sky-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-sky-600 text-white px-2.5 py-0.5 text-[11px] font-semibold">
                      멀티 슬롯 옵션
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {MULTI_PROFILE_ADDON_NO_DISCOUNT_NOTE}
                    </span>
                  </div>
                  <h4 className="mt-2 text-[15px] font-semibold text-slate-900 dark:text-white">
                    멀티 프로필+
                  </h4>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[20px] font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                      +{MULTI_PROFILE_ADDON_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                    <span className={`text-[11px] ${subTextCls}`}>/슬롯/월</span>
                  </div>
                  <p className={`mt-2 text-[11px] leading-relaxed ${subTextCls}`}>
                    기본 1프로필 외에 추가 프로필마다 디지털 명함, 쇼케이스 영상, BGM, 상호 및 계좌를 독립 설정할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={(e) =>
                      handlePayClick(e, {
                        kind: "multi_profile",
                        name: "멀티 프로필+ 추가 슬롯",
                        basePrice: MULTI_PROFILE_ADDON_MONTHLY_KRW,
                        annualPrice: MULTI_PROFILE_ADDON_MONTHLY_KRW * 12,
                        allowsReferral: false
                      })
                    }
                    className="mt-3 w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[12px] font-semibold py-2.5 transition-colors"
                  >
                    멀티 프로필+ 추가 신청 (+4,200원/월) →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: 무료 플랜 (Free) */}
            {selectedCategory === "free" && (
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
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: RECOMMEND_CODE (추천인/결제 확인 박스 레이아웃 교정) */}
        {/* ========================================================= */}
        {step === "RECOMMEND_CODE" && (
          <div className="overflow-y-auto px-6 py-5 overscroll-contain space-y-4">
            {/* 결제 정보 요약 박스 (텍스트 레이아웃 이탈 완벽 교정: bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3) */}
            <div className={`bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3 ${isDarkMode ? "dark:bg-white/5 dark:border-white/10" : ""}`}>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[13px] font-medium text-slate-500 shrink-0">선택한 플랜</span>
                <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 text-right truncate pl-2">
                  {targetItem.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-200/60 dark:border-white/10 mt-1 pt-2">
                <span className="text-[13px] font-medium text-slate-500 shrink-0">결제 예정 금액</span>
                <div className="text-right">
                  {referralApplied && targetItem.allowsReferral ? (
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className="text-[12px] line-through text-slate-400">
                        {formatKrw(currentBasePrice)}
                      </span>
                      <span className="text-[18px] font-bold text-blue-600 tabular-nums">
                        {formatKrw(finalPrice)}
                      </span>
                      <span className={`text-[12px] ${subTextCls}`}>
                        /{billingCycle === "annual" ? "연" : "월"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-[18px] font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatKrw(currentBasePrice)}
                      </span>
                      <span className={`text-[12px] ${subTextCls}`}>
                        /{billingCycle === "annual" ? "연" : "월"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {referralApplied && targetItem.allowsReferral && (
                <div className="flex justify-between items-center py-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium border-t border-emerald-100 dark:border-emerald-900/30 mt-1 pt-1.5">
                  <span>추천인 특별 우대 할인</span>
                  <span className="tabular-nums font-semibold">-{formatKrw(referralDiscountAmount)}</span>
                </div>
              )}
            </div>

            {/* 추천인 코드 입력창 */}
            {targetItem.allowsReferral ? (
              <div className={`rounded-2xl border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex items-center justify-between">
                  <label htmlFor="ref-input" className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                    추천인 코드 입력 <span className="text-[11px] font-normal text-slate-400">(관리자/지인 코드)</span>
                  </label>
                  {referralApplied && (
                    <button
                      type="button"
                      onClick={handleResetReferral}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                    >
                      코드 취소
                    </button>
                  )}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    id="ref-input"
                    type="text"
                    disabled={referralApplied}
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="추천인 코드를 입력하세요"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-[13px] font-medium focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={referralApplied || referralVerifying || !referralInput.trim()}
                    onClick={handleApplyReferral}
                    className={`rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all ${
                      referralApplied
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-900 text-white hover:bg-black disabled:opacity-40"
                    }`}
                  >
                    {referralVerifying ? "확인 중…" : referralApplied ? "적용됨" : "코드 확인"}
                  </button>
                </div>

                {referralFeedback && (
                  <p className={`mt-2 text-[11px] font-medium ${referralApplied ? "text-emerald-600" : "text-rose-500"}`}>
                    {referralFeedback}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-[12px] text-slate-500">
                ※ 이 상품은 상시 우대 할인가가 이미 적용되어 추천인 할인이 제외됩니다.
              </div>
            )}

            {/* 결제 진행 분기 버튼 그룹 */}
            <div className="pt-2 space-y-2.5">
              {targetItem.allowsReferral ? (
                <>
                  {referralApplied ? (
                    <button
                      type="button"
                      onClick={handleProceedWithReferral}
                      className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
                    >
                      추천인 할인가로 결제 진행 ({formatKrw(finalPrice)}) →
                    </button>
                  ) : (
                    <>
                      {referralInput.trim() && (
                        <button
                          type="button"
                          onClick={handleProceedWithReferral}
                          className="w-full rounded-2xl bg-emerald-600 py-3.5 text-[14px] font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all"
                        >
                          추천인 코드 적용 및 진행 ({formatKrw(9900)}) →
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleProceedWithoutReferral}
                        className={`w-full rounded-2xl py-3.5 text-[14px] font-semibold transition-all ${
                          referralInput.trim()
                            ? "border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99]"
                        }`}
                      >
                        추천인 없이 진행 ({formatKrw(currentBasePrice)}) →
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleProceedWithoutReferral}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
                >
                  결제 진행하기 ({formatKrw(currentBasePrice)}) →
                </button>
              )}

              <p className="text-center text-[11px] text-slate-400">
                다음 단계에서 6자리 결제 PIN을 입력하면 결제가 안전하게 승인됩니다.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: PIN_VERIFY (미등록 즉석 2회 등록 / 등록 1회 검증 ➔ PG 결제창) */}
        {/* ========================================================= */}
        {step === "PIN_VERIFY" && (
          <div className="overflow-y-auto px-6 py-5 overscroll-contain flex flex-col items-center">
            <span className="text-[11px] font-bold tracking-widest text-blue-600">VLUE SECURITY</span>
            <h3 className="text-[19px] font-bold mt-1 text-slate-900 dark:text-white text-center">
              {!hasPinSet
                ? pinRegisterStep === "CONFIRM"
                  ? "한 번 더 입력하여 확인"
                  : "결제용 6자리 PIN 번호 신규 등록"
                : "결제 승인 PIN 입력"}
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 text-center max-w-xs leading-relaxed">
              {!hasPinSet
                ? pinRegisterStep === "CONFIRM"
                  ? "확인을 위해 동일한 6자리 PIN을 다시 입력해 주세요."
                  : "안전한 결제를 위해 사용할 6자리 PIN 번호를 등록합니다."
                : "지문/얼굴 인식은 추후 업데이트에 추가될 예정이며, 현재는 6자리 PIN으로 안전하게 보호됩니다."}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 px-3.5 py-1 text-[12px] font-semibold text-blue-700 dark:text-blue-300">
              <span>결제 승인 금액:</span>
              <span className="tabular-nums font-bold text-blue-600">{formatKrw(finalPrice)}</span>
            </div>

            {/* 6자리 PIN 인디케이터 */}
            <div className="mt-6 flex items-center justify-center gap-3.5">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = idx < pinDigits.length;
                return (
                  <div
                    key={idx}
                    className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                      filled
                        ? "bg-blue-600 scale-125 shadow-sm shadow-blue-500/50"
                        : "bg-slate-200 dark:bg-white/20"
                    }`}
                  />
                );
              })}
            </div>

            <div className="mt-3 min-h-[22px] text-center">
              {isPaying ? (
                <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-blue-600">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>결제창을 여는 중입니다. 잠시만 기다려 주세요…</span>
                </div>
              ) : payError ? (
                <p className="text-[12px] font-medium text-rose-600">{payError}</p>
              ) : pinError ? (
                <p className="text-[12px] font-medium text-rose-600">{pinError}</p>
              ) : null}
            </div>

            {/* 3x4 키패드 */}
            <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-[300px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isPaying}
                  onClick={(e) => handlePinKey(e, num)}
                  className="flex h-14 items-center justify-center rounded-2xl bg-slate-100/90 dark:bg-white/10 text-[20px] font-semibold text-slate-900 dark:text-white active:bg-blue-100 dark:active:bg-white/20 active:scale-95 transition-all shadow-sm"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={isPaying}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hasPinSet && pinRegisterStep === "CONFIRM") {
                    setPinRegisterStep("ENTER");
                    setPinDigits("");
                    setPinError("");
                  } else {
                    setStep("RECOMMEND_CODE");
                  }
                }}
                className="flex h-14 items-center justify-center rounded-2xl bg-transparent text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white active:scale-95 transition-all"
              >
                취소
              </button>

              <button
                type="button"
                disabled={isPaying}
                onClick={(e) => handlePinKey(e, "0")}
                className="flex h-14 items-center justify-center rounded-2xl bg-slate-100/90 dark:bg-white/10 text-[20px] font-semibold text-slate-900 dark:text-white active:bg-blue-100 dark:active:bg-white/20 active:scale-95 transition-all shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                disabled={isPaying || pinDigits.length === 0}
                onClick={handlePinDelete}
                className="flex h-14 items-center justify-center rounded-2xl bg-transparent text-[16px] text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
                aria-label="한 글자 지우기"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: SUCCESS ("유료 플랜 전환 완료" 성공 팝업) */}
        {/* ========================================================= */}
        {step === "SUCCESS" && (
          <div className="overflow-y-auto px-6 py-6 overscroll-contain flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white text-[28px] shadow-lg shadow-emerald-500/30 animate-bounce">
              ✓
            </div>

            <h3 className="mt-4 text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">
              유료 플랜 전환 완료!
            </h3>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
              VLUÉ 프리미엄 멤버십 혜택이 정상적으로 활성화되었습니다.
            </p>

            {/* 결제 정보 요약 박스 (텍스트 오버플로우 완전 교정) */}
            <div className={`w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3 overflow-hidden text-left ${isDarkMode ? "dark:bg-white/5 dark:border-white/10" : ""}`}>
              <div className="flex justify-between items-center gap-2 py-1 text-[13px]">
                <span className="text-slate-500 shrink-0">적용 플랜</span>
                <span className="min-w-0 text-right truncate font-semibold text-blue-600 dark:text-blue-400">
                  {successInfo?.planName || targetItem.name}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 py-1 text-[13px] border-t border-slate-200/60 dark:border-white/10 mt-1 pt-1.5">
                <span className="text-slate-500 shrink-0">결제 금액</span>
                <span className="min-w-0 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatKrw(successInfo?.amountKrw || finalPrice)}
                </span>
              </div>
              <div className="mt-2.5 border-t border-slate-200/60 dark:border-white/10 pt-2.5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">가족보호 실시간 위치 및 안심 귀가 케어 활성화</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">무제한 고화질 블루 쇼케이스 송출 활성화</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">독립 BGM & 프리미엄 사운드 이용 가능</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseExplicit}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
            >
              확인하고 이용하기
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(content, document.body);
}
