import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isPaidMembershipKind, normalizeMembershipKind, PAID_MEMBERSHIP_SUBLINE } from "../lib/membershipBm.js";
import ReferralCodeVerifyBlock from "./ReferralCodeVerifyBlock.jsx";

const MEMBERSHIP_OPTIONS = [
  {
    id: "free",
    title: "일반 회원 (Free)",
    sub: "기본 기능 및 PASS 실명인증 기반 안전 거래 이용"
  },
  {
    id: "paid",
    title: "유료 회원 (Paid)",
    sub: PAID_MEMBERSHIP_SUBLINE
  }
];

const REFERRAL_CHANNELS = [
  {
    title: "지인 추천",
    desc: "추천인 전화번호 · 피추천인 30% 할인 · 2번째 유료 추천부터 10% 포인트(1~12개월)"
  },
  {
    title: "홍보 추천 (VLUER)",
    desc: "SNS·유튜브·틱톡 인증·승인 후 고유 코드 · 15% 캐시(1~12개월) · 5% 캐시 영구(13개월~)"
  }
];

/**
 * 마이페이지 — 멤버십 변경 + VLUER 업그레이드(선택형)
 */
export default function MembershipUpgradeModal({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onMembershipTierChange,
  onRequestTierChange,
  onVluerUpgraded
}) {
  const [planToast, setPlanToast] = useState("");
  const [paidBillingCycle, setPaidBillingCycle] = useState("monthly");
  const [referralCode, setReferralCode] = useState("");
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
        `「${label}」로 변경 신청합니다. 유료 전환 시 결제·인증 절차가 이어질 수 있습니다. 계속할까요?`
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
              멤버십 · 추천 안내
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
            추천·리워드는 <b>지인 추천</b>과 <b>홍보 추천(VLUER)</b> 두 가지로만 운영됩니다. 언제든 VLUER 홍보 신청이 가능합니다.
          </p>

          <p className={`mb-2 text-[11px] font-black ${textStrong}`}>추천 채널</p>
          <div className="space-y-2">
            {REFERRAL_CHANNELS.map((ch) => (
              <div
                key={ch.title}
                className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-white"}`}
              >
                <p className={`text-[12px] font-black ${textStrong}`}>{ch.title}</p>
                <p className={`mt-0.5 text-[10px] leading-relaxed ${textSub}`}>{ch.desc}</p>
              </div>
            ))}
          </div>

          <p className={`mt-5 mb-2 text-[11px] font-black ${textStrong}`}>멤버십 유형</p>
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
                </button>
              );
            })}
          </div>

          {isPaidMembershipKind(currentKind) && (
            <div
              className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/90"}`}
            >
              <p className={`text-[12px] font-black ${textStrong}`}>유료 결제 옵션</p>
              <div className="mt-2 flex gap-2">
                {[
                  { id: "monthly", label: "월결제" },
                  { id: "annual", label: "1년 구독" }
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
              <ReferralCodeVerifyBlock
                billingCycle={paidBillingCycle}
                referralCode={referralCode}
                onReferralCodeChange={setReferralCode}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

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
