import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  isPaidMembershipKind,
  normalizeMembershipKind,
  PAID_MEMBERSHIP_SUBLINE,
  PAID_LIST_PRICE_MONTHLY_KRW,
  PAID_EVENT_MONTHLY_KRW,
  PAID_EVENT_ANNUAL_KRW,
  PAID_LAUNCH_DISCOUNT_NOTE,
  PAID_ANNUAL_BENEFIT_NOTE,
  B2B_MEMBERSHIP_SUBLINE,
  B2B_REP_LIST_MONTHLY_KRW,
  B2B_STAFF_LIST_MONTHLY_KRW,
  B2B_STAFF_EVENT_MONTHLY_KRW,
  B2B_EVENT_NOTE,
  SOHO_BROADCAST_MEMBERSHIP_SUBLINE,
  SOHO_BROADCAST_MONTHLY_KRW,
  SOHO_BROADCAST_NO_DISCOUNT_NOTE
} from "../lib/membershipBm.js";
import { FAMILY_PROTECTION_SUMMARY_SHORT } from "../lib/membershipBenefits.js";

const MEMBERSHIP_OPTIONS = [
  {
    id: "free",
    title: "일반 회원 (Free)",
    sub: "통화 신원 확인 · 기본 블루 쇼케이스 · PASS 본인확인"
  },
  {
    id: "paid",
    title: "유료 회원 (Paid)",
    sub: PAID_MEMBERSHIP_SUBLINE
  },
  {
    id: "b2b",
    title: "비즈니스 / B2B 풀 패키지",
    sub: B2B_MEMBERSHIP_SUBLINE
  }
];

/**
 * 마이페이지 — V1 멤버십 안내·변경
 */
export default function MembershipUpgradeModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onMembershipTierChange,
  onRequestTierChange
}) {
  const [planToast, setPlanToast] = useState("");
  const [paidBillingCycle, setPaidBillingCycle] = useState("monthly");
  const currentKind = normalizeMembershipKind(membershipTier);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!planToast) return;
    const t = setTimeout(() => setPlanToast(""), 3200);
    return () => clearTimeout(t);
  }, [planToast]);

  if (!open) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";

  const handleMembershipSelect = async (kind) => {
    const next = normalizeMembershipKind(kind);
    if (next === currentKind) return;
    const label = MEMBERSHIP_OPTIONS.find((p) => p.id === next)?.title || next;
    if (
      !window.confirm(
        `「${label}」로 변경 신청합니다. 유료·기업 전환 시 결제·인증 절차가 이어질 수 있습니다. 계속할까요?`
      )
    ) {
      return;
    }
    const ok = await onRequestTierChange?.(next);
    if (ok === false) return;
    onMembershipTierChange?.(next);
    setPlanToast(`「${label}」 변경 신청이 접수되었습니다.`);
  };

  const content = (
    <div
      className="fixed inset-0 z-[50000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-upgrade-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default bg-black/45 touch-manipulation"
        aria-label="배경 눌러 닫기"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl ${panel}`}
      >
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2
              id="membership-upgrade-title"
              className={`min-w-0 flex-1 text-[clamp(15px,4vw,17px)] font-black leading-snug ${textStrong}`}
            >
              V1 멤버십 안내
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg px-3 py-2 text-[18px] leading-none touch-manipulation ${textSub} hover:opacity-80`}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <p className={`mb-4 text-[clamp(11px,3.2vw,12px)] leading-relaxed ${textSub}`}>
            V1은 블루 쇼케이스·디지털 인증명함·가족보호를 중심으로 운영합니다. 추천인 리워드는 제공하지 않습니다.
          </p>

          <p className={`mb-2 text-[11px] font-black ${textStrong}`}>멤버십 유형</p>
          <div className="space-y-2">
            {MEMBERSHIP_OPTIONS.map((opt) => {
              const active = currentKind === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={active}
                  onClick={() => handleMembershipSelect(opt.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? isDarkMode
                        ? "border-blue-400/50 bg-blue-500/15 ring-2 ring-blue-400/30"
                        : "border-blue-200 bg-blue-50/90 ring-2 ring-blue-200"
                      : isDarkMode
                        ? "border-white/10 bg-white/5"
                        : "border-gray-100 bg-gray-50/80"
                  }`}
                >
                  <p className={`text-[13px] font-black ${textStrong}`}>{opt.title}</p>
                  <p className={`mt-1 text-[11px] leading-snug ${textSub}`}>{opt.sub}</p>
                  {opt.id === "paid" ? (
                    <div className="mt-2 space-y-1">
                      <p className={`text-[12px] font-black ${isDarkMode ? "text-blue-200" : "text-blue-700"}`}>
                        <span className={`mr-1.5 text-[11px] font-semibold line-through opacity-60 ${textSub}`}>
                          {PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원
                        </span>
                        {PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원/월
                      </p>
                      <p className={`text-[10px] leading-snug ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                        → {PAID_LAUNCH_DISCOUNT_NOTE}
                      </p>
                      <p className={`text-[10px] leading-snug ${textSub}`}>{PAID_ANNUAL_BENEFIT_NOTE}</p>
                      <p className={`text-[10px] leading-snug ${textSub}`}>
                        가족보호 {FAMILY_PROTECTION_SUMMARY_SHORT}
                      </p>
                    </div>
                  ) : null}
                  {opt.id === "b2b" ? (
                    <div className="mt-2 space-y-1">
                      <p className={`text-[11px] leading-snug ${textSub}`}>
                        대표자{" "}
                        <span className="line-through opacity-60">
                          {B2B_REP_LIST_MONTHLY_KRW.toLocaleString("ko-KR")}원
                        </span>
                        {" + "}
                        직원{" "}
                        <span className="line-through opacity-60">
                          {B2B_STAFF_LIST_MONTHLY_KRW.toLocaleString("ko-KR")}원
                        </span>
                      </p>
                      <p className={`text-[12px] font-black ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
                        → 직원 회선 {B2B_STAFF_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원 ({B2B_EVENT_NOTE})
                      </p>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-violet-100 bg-violet-50/80"}`}
          >
            <p className={`text-[12px] font-black ${textStrong}`}>SOHO 영업 송출 옵션</p>
            <p className={`mt-1 text-[11px] leading-snug ${textSub}`}>{SOHO_BROADCAST_MEMBERSHIP_SUBLINE}</p>
            <p className={`mt-1 text-[12px] font-black ${isDarkMode ? "text-violet-200" : "text-violet-800"}`}>
              +{SOHO_BROADCAST_MONTHLY_KRW.toLocaleString("ko-KR")}원/월 ({SOHO_BROADCAST_NO_DISCOUNT_NOTE})
            </p>
          </div>

          {isPaidMembershipKind(currentKind) ? (
            <div
              className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/90"}`}
            >
              <p className={`text-[12px] font-black ${textStrong}`}>유료 결제 주기</p>
              <div className="mt-2 flex gap-2">
                {[
                  {
                    id: "monthly",
                    label: `월 ${PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원`
                  },
                  {
                    id: "annual",
                    label: `연 ${PAID_EVENT_ANNUAL_KRW.toLocaleString("ko-KR")}원`
                  }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPaidBillingCycle(b.id)}
                    className={`flex-1 rounded-lg py-2 text-[11px] font-black ${
                      paidBillingCycle === b.id
                        ? "bg-blue-600 text-white"
                        : isDarkMode
                          ? "bg-white/10 text-gray-200"
                          : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className={`mt-2 text-[10px] leading-relaxed ${textSub}`}>
                {paidBillingCycle === "annual" ? PAID_ANNUAL_BENEFIT_NOTE : PAID_LAUNCH_DISCOUNT_NOTE}
              </p>
            </div>
          ) : null}

          {planToast ? (
            <p
              className={`mt-3 text-center text-[clamp(11px,3.2vw,12px)] font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-700"}`}
            >
              {planToast}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(content, document.body);
}
