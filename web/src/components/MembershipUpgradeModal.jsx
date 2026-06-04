import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isPaidMembershipKind, normalizeMembershipKind, PAID_MEMBERSHIP_SUBLINE } from "../lib/membershipBm.js";
import ReferralCodeVerifyBlock from "./ReferralCodeVerifyBlock.jsx";
import { fetchVluerUpgradeStatus, postVluerUpgrade } from "../lib/vluerUpgradeApi.js";

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

const GRADE_COPY = {
  general: { title: "일반 VLUER", desc: "구독 5% 포인트 · 쇼핑 쉐어 없음" },
  certified: { title: "인증 VLUER", desc: "구독 10% 캐시 · 쇼핑 0.3% 쉐어" },
  partner: { title: "파트너 VLUER", desc: "구독 15% 캐시 · 쇼핑 0.8% 쉐어" },
  official: { title: "공식 VLUER", desc: "B2B 제휴 전용" }
};

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
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const currentKind = normalizeMembershipKind(membershipTier);

  const loadUpgradeStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await fetchVluerUpgradeStatus();
      setUpgradeStatus(s);
    } catch {
      setUpgradeStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    loadUpgradeStatus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, loadUpgradeStatus]);

  useEffect(() => {
    if (!planToast) return;
    const t = setTimeout(() => setPlanToast(""), 3200);
    return () => clearTimeout(t);
  }, [planToast]);

  const runVluerUpgrade = async (targetGrade) => {
    const notice =
      targetGrade === "partner"
        ? upgradeStatus?.partnerRewardNotice
        : upgradeStatus?.certifiedRewardNotice;
    const ok = window.confirm(
      `${notice || "정가 28,300원으로 전환되고 리워드 요율이 상승합니다."}\n\nVLUER 업그레이드를 진행할까요?`
    );
    if (!ok) return;

    setUpgradeBusy(true);
    try {
      await postVluerUpgrade(targetGrade, true);
      setPlanToast("VLUER 업그레이드가 완료되었습니다.");
      await loadUpgradeStatus();
      onVluerUpgraded?.();
    } catch (e) {
      setPlanToast(e instanceof Error ? e.message : "업그레이드에 실패했습니다.");
    } finally {
      setUpgradeBusy(false);
    }
  };

  if (!open) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";

  const currentGrade = upgradeStatus?.currentGrade || "general";
  const gradeInfo = GRADE_COPY[currentGrade] || GRADE_COPY.general;

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
              멤버십 · VLUER 업그레이드
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
            VLUER(블러) 활동은 <b>일반 → 인증 → 파트너</b> 순으로 선택 업그레이드할 수 있습니다. 활동 규모에
            따라 안내되며, 업그레이드 시 유료 멤버십이 정가로 전환될 수 있습니다.
          </p>

          <div
            className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "border-violet-500/30 bg-violet-500/10" : "border-violet-100 bg-violet-50/80"}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wide text-violet-700`}>현재 VLUER</p>
            <p className={`mt-0.5 text-[14px] font-black ${textStrong}`}>{gradeInfo.title}</p>
            <p className={`mt-0.5 text-[11px] ${textSub}`}>{gradeInfo.desc}</p>
            {statusLoading ? (
              <p className={`mt-2 text-[10px] ${textSub}`}>업그레이드 조건 확인 중…</p>
            ) : null}
          </div>

          <p className={`mt-5 mb-2 text-[11px] font-black ${textStrong}`}>VLUER 업그레이드</p>
          <div className="space-y-2">
            <div
              className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-white"}`}
            >
              <p className={`text-[12px] font-black ${textStrong}`}>인증 VLUER</p>
              <p className={`mt-0.5 text-[10px] leading-relaxed ${textSub}`}>
                활동이 충분히 성장한 경우 신청할 수 있습니다. 구독 10% 캐시·쇼핑 0.3% 쉐어로 상향됩니다.
              </p>
              <button
                type="button"
                disabled={upgradeBusy || !upgradeStatus?.certified?.available || currentGrade !== "general"}
                onClick={() => runVluerUpgrade("certified")}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {upgradeStatus?.certified?.available ? "인증 VLUER 업그레이드" : "아직 이용할 수 없음"}
              </button>
              {upgradeStatus?.certified?.reason && !upgradeStatus?.certified?.available ? (
                <p className={`mt-1.5 text-[10px] ${textSub}`}>{upgradeStatus.certified.reason}</p>
              ) : null}
            </div>

            <div
              className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-white"}`}
            >
              <p className={`text-[12px] font-black ${textStrong}`}>파트너 VLUER</p>
              <p className={`mt-0.5 text-[10px] leading-relaxed ${textSub}`}>
                장기적으로 활동을 이어온 VLUER에게 제공됩니다. 구독 15% 캐시·쇼핑 0.8% 쉐어로 상향됩니다.
              </p>
              <button
                type="button"
                disabled={
                  upgradeBusy ||
                  !upgradeStatus?.partner?.available ||
                  currentGrade === "partner" ||
                  currentGrade === "official"
                }
                onClick={() => runVluerUpgrade("partner")}
                className="mt-2 w-full rounded-lg bg-violet-700 py-2 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {upgradeStatus?.partner?.available ? "파트너 VLUER 업그레이드" : "아직 이용할 수 없음"}
              </button>
              {upgradeStatus?.partner?.reason && !upgradeStatus?.partner?.available ? (
                <p className={`mt-1.5 text-[10px] ${textSub}`}>{upgradeStatus.partner.reason}</p>
              ) : null}
            </div>
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
