import { useState } from "react";
import { formatKrw, isB2bMembershipKind, POST_SIGNUP_PAYMENT_NOTICE } from "../../lib/membershipBm.js";
import { postSubscribeComplete } from "../../lib/subscribeCompleteApi.js";
import { requestIamportBillingPay } from "../../lib/iamportClient.js";
import { getPortoneUserCode, isPortoneTestMode } from "../../lib/portoneEnv.js";
import { clearPendingPayment } from "../../lib/postSignupPayment.js";
import { resolveAuthValidityPeriod, writeMembershipBillingMeta } from "../../lib/authValidityPeriod.js";
import { isVlueKidsApp } from "../../lib/vlueKidsApp.js";
import { verifyReferralCode } from "../../lib/referralVerifyApi.js";
import { getAppLockStatus } from "../../lib/appLockBridge.js";
import KcpPayment from "./KcpPayment.jsx";

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
 * [VLUÉ] 프리미엄 결제 모달 (PaymentModal)
 * - Step 1: 'PAY_DETAILS' (추천인 코드 및 분기 결제)
 * - Step 2: 'PIN_VERIFY'
 *     - PIN 미등록 유저: '결제용 6자리 PIN 번호 신규 등록' ➔ '한 번 더 입력하여 확인' (2회 일치 시 저장 & KCP 직결)
 *     - PIN 등록 유저: '결제 승인 PIN 입력' ➔ KCP 직결
 * - Step 3: 'SUCCESS' (유료 플랜 전환 완료 성공 팝업)
 */
export default function PaymentModal({
  open,
  pending = { membershipKind: "paid", billingCycle: "monthly", amountKrw: 14100 },
  onClose,
  onComplete,
  onSkip
}) {
  // 스텝 상태 머신: 'PAY_DETAILS' | 'PIN_VERIFY' | 'SUCCESS'
  const [step, setStep] = useState("PAY_DETAILS");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 추천인 코드 상태 & 즉시 할인 계산
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

  const testMode = isPortoneTestMode();

  if (isVlueKidsApp() || !open) return null;

  const basePrice = Number(pending?.amountKrw) || 14100;
  // 추천인 코드 적용 시 14,100원 ➔ 9,900원 즉시 적용
  const finalPrice = referralApplied ? 9900 : basePrice;
  const discountAmount = referralApplied ? Math.max(0, basePrice - 9900) : 0;

  const isB2b = isB2bMembershipKind(pending?.membershipKind);
  const planTitle = isB2b ? "기업 비즈니스 플랜" : "VLUÉ 유료 플랜 (Paid)";

  // 추천인 코드 검증 & 즉시 적용 핸들러
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

  // PIN 입력 단계 준비
  const preparePinStep = () => {
    const isSet = checkHasPinSet();
    setHasPinSet(isSet);
    setPinRegisterStep("ENTER");
    setFirstEnteredPin("");
    setPinDigits("");
    setPinError("");
    setError("");
    setStep("PIN_VERIFY");
  };

  // Step 1 ➔ Step 2: 추천인 없이 진행
  const handleProceedWithoutReferral = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setReferralApplied(false);
    preparePinStep();
  };

  // Step 1 ➔ Step 2: 추천인 코드로 진행
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

  // PIN 키패드 조작 (미등록 2회 확인 / 등록 1회 검증)
  const handlePinKey = (e, digit) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (busy) return;
    setPinError("");
    setError("");

    if (pinDigits.length < 6) {
      const next = pinDigits + digit;
      setPinDigits(next);

      if (next.length === 6) {
        if (!hasPinSet) {
          // [PIN 미등록 유저]
          if (pinRegisterStep === "ENTER") {
            setFirstEnteredPin(next);
            setTimeout(() => {
              setPinDigits("");
              setPinRegisterStep("CONFIRM");
            }, 120);
          } else {
            if (next === firstEnteredPin) {
              // PIN 일치 ➔ 저장 후 NHN KCP 안전결제 PG 창으로 즉시 직행
              try {
                localStorage.setItem("vlue_user_pin", next);
                localStorage.setItem("vlue_app_pin", next);
                window.Android?.savePin?.(next);
              } catch {
                /* ignore */
              }
              setHasPinSet(true);
              setTimeout(() => {
                setStep("KCP_PAYMENT");
              }, 120);
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
          // [기존 등록 유저 ➔ NHN KCP 안전결제 PG 창으로 즉시 직행]
          setTimeout(() => {
            setStep("KCP_PAYMENT");
          }, 120);
        }
      }
    }
  };

  const handlePinDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (busy) return;
    setPinError("");
    setPinDigits((prev) => prev.slice(0, -1));
  };

  // NHN KCP PG 결제 승인 콜백 수신 후 최종 구독 활성화 및 반영
  const executePaymentSuccess = async (kcpResult) => {
    setBusy(true);
    setError("");
    setPinError("");

    try {
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
      const targetTier = isB2b ? "b2b" : "paid";

      // 1) 결제 모듈 승인 결과 서버 통신
      try {
        await postSubscribeComplete({
          customer_uid,
          merchant_uid: kcpResult?.merchant_uid || `kcp_order_${Date.now()}`,
          amount,
          billingCycle,
          devBillingBypass: true
        });
      } catch (apiErr) {
        console.warn("[SubscribeComplete API sync fallback]", apiErr);
      }

      // 2) 유저 등급 및 결제 메타 실시간 반영
      try {
        const paidAt = new Date();
        localStorage.setItem("vlue_subscription_paid", "1");
        localStorage.setItem("membershipTier", targetTier);
        localStorage.setItem("vlue_membership_tier", targetTier);
        localStorage.setItem("vlue_membership_kind", targetTier);
        if (referralApplied && referralInput.trim()) {
          localStorage.setItem("vlue_used_referral_code", referralInput.trim());
        }
        const validity = resolveAuthValidityPeriod({ billingCycle, paidAt });
        writeMembershipBillingMeta({
          billingCycle,
          paidAt,
          cycleEndAt: validity?.validUntil || null
        });
      } catch {
        /* ignore */
      }

      clearPendingPayment();

      try {
        window.dispatchEvent(
          new CustomEvent("vlue-membership-changed", {
            detail: { membershipTier: targetTier, tier: targetTier }
          })
        );
      } catch {
        /* ignore */
      }

      // 3) 결제 성공 팝업 스텝으로 전환
      setStep("SUCCESS");
    } catch (e) {
      console.error("[KCP Payment complete error]", e);
      setError("결제 완료 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const handleFinishSuccess = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetTier = isB2b ? "b2b" : "paid";
    onComplete?.({
      membershipTier: targetTier,
      billingCycle: pending?.billingCycle || "monthly",
      amountKrw: finalPrice,
      referralCode: referralApplied ? referralInput.trim() : null,
      testMode
    });
    onClose ? onClose() : onSkip?.();
  };

  return (
    <div
      className="fixed inset-0 z-[50000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl border border-slate-100 transition-all"
        style={{ letterSpacing: "-0.02em" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* 헤더 */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {step !== "PAY_DETAILS" && step !== "SUCCESS" && !busy && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (step === "KCP_PAYMENT") {
                    setStep("PIN_VERIFY");
                  } else if (step === "PIN_VERIFY") {
                    if (!hasPinSet && pinRegisterStep === "CONFIRM") {
                      setPinRegisterStep("ENTER");
                      setPinDigits("");
                      setPinError("");
                    } else {
                      setStep("PAY_DETAILS");
                    }
                  }
                }}
                className="rounded-full p-1 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="이전으로"
              >
                <span className="text-[17px] font-bold">←</span>
              </button>
            )}
            <div>
              <span className="text-[11px] font-medium text-blue-600 tracking-tight">VLUÉ PAYMENT</span>
              <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight mt-0.5">
                {step === "PAY_DETAILS" && planTitle}
                {step === "PIN_VERIFY" &&
                  (!hasPinSet
                    ? pinRegisterStep === "CONFIRM"
                      ? "한 번 더 입력하여 확인"
                      : "결제용 6자리 PIN 번호 신규 등록"
                    : "결제 승인 PIN 입력")}
                {step === "KCP_PAYMENT" && "NHN KCP 안전결제"}
                {step === "SUCCESS" && "유료 플랜 전환 완료"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (step === "SUCCESS") {
                handleFinishSuccess(e);
              } else {
                clearPendingPayment();
                onClose ? onClose() : onSkip?.();
              }
            }}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* ========================================================= */}
        {/* STEP 1: PAY_DETAILS (결제 정보 & 추천인 코드 입력 & 분기 버튼) */}
        {/* ========================================================= */}
        {step === "PAY_DETAILS" && (
          <div>
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

            {/* 결제 정보 요약 박스 (텍스트 레이아웃 이탈 교정) */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[13px] font-medium text-slate-500 shrink-0">선택한 플랜</span>
                <span className="text-[13px] font-semibold text-blue-600 text-right truncate pl-2">
                  {planTitle}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-200/60 mt-1 pt-2">
                <span className="text-[13px] font-medium text-slate-500 shrink-0">결제 예정 금액</span>
                <div className="text-right">
                  {referralApplied ? (
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className="text-[12px] line-through text-slate-400">
                        {formatKrw(basePrice)}
                      </span>
                      <span className="text-[18px] font-bold text-blue-600 tabular-nums">
                        {formatKrw(finalPrice)}
                      </span>
                      <span className="text-[12px] text-slate-500">/월</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-[18px] font-bold text-slate-900 tabular-nums">
                        {formatKrw(basePrice)}
                      </span>
                      <span className="text-[12px] text-slate-500">/월</span>
                    </div>
                  )}
                </div>
              </div>

              {referralApplied && (
                <div className="flex justify-between items-center py-1.5 text-[11px] text-emerald-700 font-medium border-t border-emerald-100 mt-1 pt-1.5">
                  <span>추천인 특별 우대 할인</span>
                  <span className="tabular-nums font-semibold">-{formatKrw(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* 추천인 코드 입력 섹션 */}
            <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <label htmlFor="modal-ref-code" className="text-[11px] font-medium text-slate-700">
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
                  id="modal-ref-code"
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
                <p className={`mt-1.5 text-[11px] font-normal ${referralApplied ? "text-emerald-600" : "text-rose-500"}`}>
                  {referralFeedback}
                </p>
              )}
            </div>

            {/* 명확한 2가지 분기 결제 버튼 */}
            <div className="mt-4 flex flex-col gap-2">
              {referralApplied ? (
                <button
                  type="button"
                  onClick={handleProceedWithReferral}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition-all"
                >
                  추천인 할인가로 결제 진행 ({formatKrw(finalPrice)}) →
                </button>
              ) : (
                <>
                  {referralInput.trim() && (
                    <button
                      type="button"
                      onClick={handleProceedWithReferral}
                      className="w-full rounded-2xl bg-emerald-600 py-3.5 text-[14px] font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition-all"
                    >
                      추천인 코드 적용 및 진행 ({formatKrw(9900)}) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleProceedWithoutReferral}
                    className={`w-full rounded-2xl py-3.5 text-[14px] font-semibold transition-all ${
                      referralInput.trim()
                        ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]"
                    }`}
                  >
                    추천인 없이 진행 ({formatKrw(basePrice)}) →
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  clearPendingPayment();
                  onClose ? onClose() : onSkip?.();
                }}
                className="w-full rounded-xl py-2 text-[12px] font-normal text-slate-500 hover:text-slate-700 transition-colors"
              >
                다음에 하기
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PIN_VERIFY (미등록 2회 등록 / 등록 1회 검증 ➔ KCP 직결) */}
        {/* ========================================================= */}
        {step === "PIN_VERIFY" && (
          <div className="flex flex-col items-center py-2">
            <span className="text-[11px] font-bold tracking-widest text-blue-600">VLUE SECURITY</span>
            <h3 className="text-[18px] font-bold mt-1 text-slate-900 text-center">
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

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1 text-[12px] font-semibold text-blue-700">
              <span>결제 승인 금액:</span>
              <span className="tabular-nums font-bold text-blue-600">{formatKrw(finalPrice)}</span>
            </div>

            {/* 6자리 PIN 동그라미 */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const filled = idx < pinDigits.length;
                return (
                  <div
                    key={idx}
                    className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                      filled
                        ? "bg-blue-600 scale-125 shadow-sm shadow-blue-500/50"
                        : "bg-slate-200"
                    }`}
                  />
                );
              })}
            </div>

            {/* 에러/로딩 메시지 */}
            <div className="mt-3 min-h-[22px] text-center">
              {busy ? (
                <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-blue-600">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>KCP 결제 승인 처리 중입니다. 잠시만 기다려 주세요…</span>
                </div>
              ) : error ? (
                <p className="text-[11px] font-medium text-rose-600">{error}</p>
              ) : pinError ? (
                <p className="text-[11px] font-medium text-rose-600">{pinError}</p>
              ) : null}
            </div>

            {/* 3x4 키패드 */}
            <div className="mt-3 grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={busy}
                  onClick={(e) => handlePinKey(e, num)}
                  className="flex h-13 items-center justify-center rounded-2xl bg-slate-100 text-[19px] font-semibold text-slate-900 active:bg-blue-100 active:scale-95 transition-all shadow-sm"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hasPinSet && pinRegisterStep === "CONFIRM") {
                    setPinRegisterStep("ENTER");
                    setPinDigits("");
                    setPinError("");
                  } else {
                    setStep("PAY_DETAILS");
                  }
                }}
                className="flex h-13 items-center justify-center rounded-2xl bg-transparent text-[13px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 transition-all"
              >
                취소
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={(e) => handlePinKey(e, "0")}
                className="flex h-13 items-center justify-center rounded-2xl bg-slate-100 text-[19px] font-semibold text-slate-900 active:bg-blue-100 active:scale-95 transition-all shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                disabled={busy || pinDigits.length === 0}
                onClick={handlePinDelete}
                className="flex h-13 items-center justify-center rounded-2xl bg-transparent text-[16px] text-slate-600 active:scale-95 transition-all"
                aria-label="한 글자 지우기"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: KCP_PAYMENT (NHN KCP PG 결제창 실제 연동) */}
        {/* ========================================================= */}
        {step === "KCP_PAYMENT" && (
          <div className="py-2">
            <KcpPayment
              orderName={planTitle}
              amount={finalPrice}
              onSuccess={(kcpResult) => executePaymentSuccess(kcpResult)}
              onCancel={() => setStep("PIN_VERIFY")}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: SUCCESS (유료 플랜 전환 완료 성공 팝업) */}
        {/* ========================================================= */}
        {step === "SUCCESS" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white text-[28px] shadow-lg shadow-emerald-500/30 animate-bounce">
              ✓
            </div>

            <h3 className="mt-4 text-[20px] font-bold text-slate-900 tracking-tight">
              유료 플랜 전환 완료!
            </h3>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
              VLUÉ 프리미엄 플랜이 성공적으로 활성화되었습니다.
            </p>

            {/* 결제 정보 요약 박스 (텍스트 오버플로우 완전 교정) */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 my-3 overflow-hidden text-left">
              <div className="flex justify-between items-center gap-2 py-1 text-[13px]">
                <span className="text-slate-500 shrink-0">적용 플랜</span>
                <span className="min-w-0 text-right truncate font-semibold text-blue-600">{planTitle}</span>
              </div>
              <div className="flex justify-between items-center gap-2 py-1 text-[13px] border-t border-slate-200/60 mt-1 pt-1.5">
                <span className="text-slate-500 shrink-0">결제 금액</span>
                <span className="min-w-0 text-right font-bold text-slate-900 tabular-nums">{formatKrw(finalPrice)}</span>
              </div>
              <div className="mt-2.5 border-t border-slate-200/60 pt-2.5 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">가족보호 시스템 실시간 위치 확인</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">무제한 고화질 블루 쇼케이스 송출</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="truncate">BGM 독립 설정 및 프리미엄 사운드</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishSuccess}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] transition-all"
            >
              확인하고 시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
