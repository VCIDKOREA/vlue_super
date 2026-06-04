import { useEffect, useState } from "react";
import ModalCloseButton from "../common/ModalCloseButton";
import { VMING_CONSENT_LEGAL } from "../../lib/vmingConsentApi.js";
import { fetchVmingUserStatus, confirmVmingUnlimitedPayment, purchaseVmingUnlimited } from "../../lib/vmingApi.js";
import { requestIamportBillingPay } from "../../lib/iamportClient.js";
import { getPortoneUserCode } from "../../lib/portoneEnv.js";

function VmingRobotIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="8" width="14" height="11" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9.5" cy="13" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="13" r="1.2" fill="currentColor" />
      <path d="M12 5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.2" fill="currentColor" />
      <path d="M3 12H5M19 12H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function VmingHeaderIconButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="브이밍 AI"
      aria-label="브이밍 AI 안내"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 ring-1 ring-violet-200 active:scale-95 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-500/30 ${className}`}
    >
      <VmingRobotIcon className="h-[18px] w-[18px]" />
    </button>
  );
}

export default function VmingInfoSheet({
  open,
  onClose,
  isDarkMode = false,
  status,
  isHost = false,
  onReRequest,
  onEvict,
  onWithdraw,
  canWithdraw = false
}) {
  const [usage, setUsage] = useState(null);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchVmingUserStatus()
      .then((data) => setUsage(data))
      .catch(() => setUsage(null));
  }, [open]);

  if (!open) return null;

  const panel = isDarkMode
    ? "border-white/10 bg-[#151821] text-white"
    : "border-slate-200 bg-white text-slate-900";
  const tokenLimit = Number(usage?.dailyTokenLimit || 15000);
  const tokenUsedRaw = Number(usage?.dailyTokenUsed ?? usage?.usedTokens ?? 0);
  const tokenUsed = Number.isFinite(tokenUsedRaw) ? Math.max(0, tokenUsedRaw) : 0;
  const tokenConsumedPct = tokenLimit > 0 ? Math.min(100, Math.round((tokenUsed / tokenLimit) * 100)) : 0;
  const tokenRemaining = Math.max(0, tokenLimit - tokenUsed);
  const isTokenWarn = tokenConsumedPct >= 80;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className={`relative w-full max-w-md rounded-t-3xl border p-5 shadow-2xl sm:rounded-2xl ${panel}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ModalCloseButton variant={isDarkMode ? "dark" : "default"} onClick={onClose} />
        <div className="flex items-center gap-3 pr-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">
            <VmingRobotIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[16px] font-black">브이밍 AI</p>
            <p className="text-[12px] opacity-70">이 채팅방에서 활성 중</p>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed opacity-90">
          대화 요약·일정 감지·회의록 등 AI 보조 기능이 켜져 있습니다. 분석 데이터는 외부에 저장되지 않으며,
          동의한 멤버 범위에서만 처리됩니다.
        </p>
        {status?.roomExpiresAt ? (
          <p className="mt-2 text-[12px] opacity-60">
            동의 유효기간: {new Date(status.roomExpiresAt).toLocaleDateString("ko-KR")}까지
          </p>
        ) : null}
        <p className="mt-3 text-[11px] leading-snug opacity-55">{VMING_CONSENT_LEGAL}</p>
        <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 py-2 text-[12px] leading-snug text-violet-900 dark:border-violet-400/30 dark:bg-violet-900/20 dark:text-violet-100">
          <p className="font-bold">내 호출 상태</p>
          <p className="mt-1">{usage?.statusLabel || "오늘 남은 브이밍 호출 횟수: 조회 중..."}</p>
          {usage?.tier === "FREE" ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span>일일 토큰 잔여량</span>
                <span className="font-bold">
                  {tokenRemaining.toLocaleString("ko-KR")} / {tokenLimit.toLocaleString("ko-KR")}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-900/50">
                <div
                  className={`h-full rounded-full transition-all ${
                    isTokenWarn ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-violet-500 to-blue-500"
                  }`}
                  style={{ width: `${tokenConsumedPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          커피 한 잔 값으로 한 달 내내 제한 없이 사용하기
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-[14px] font-black text-white disabled:opacity-60"
          disabled={buying || usage?.tier === "UNLIMITED"}
          onClick={async () => {
            try {
              setBuying(true);
              let userId = "";
              try {
                userId = localStorage.getItem("vlue_server_user_id") || "";
              } catch {
                /* ignore */
              }
              if (!userId) throw new Error("로그인 정보가 없습니다.");

              const userCode = getPortoneUserCode();
              if (userCode) {
                const merchantUid = `vming_unlimited_${userId}_${Date.now()}`;
                const rsp = await requestIamportBillingPay({
                  userCode,
                  userId,
                  amount: 4900,
                  billingCycle: "monthly",
                  merchantUidOverride: merchantUid,
                  nameOverride: "브이밍 무제한 패키지(월)"
                });
                await confirmVmingUnlimitedPayment({
                  merchantUid: rsp?.merchant_uid || merchantUid,
                  impUid: rsp?.imp_uid || "",
                  provider: "portone"
                });
              } else {
                await purchaseVmingUnlimited();
              }
              const latest = await fetchVmingUserStatus();
              setUsage(latest);
              setNotice("⚡ 월 4,900원 무제한 패키지 적용 완료");
            } catch {
              setNotice("결제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            } finally {
              setBuying(false);
            }
          }}
        >
          {usage?.tier === "UNLIMITED" ? "⚡ 무제한 이용 중" : "월 4,900원 무제한 패키지 결제하기"}
        </button>
        {notice ? <p className="mt-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">{notice}</p> : null}
        {isHost ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[13px] font-bold dark:bg-white/10"
              onClick={() => {
                onClose();
                onReRequest?.();
              }}
            >
              재요청
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-red-50 py-2.5 text-[13px] font-bold text-red-700 dark:bg-red-950/40"
              onClick={() => {
                onClose();
                onEvict?.();
              }}
            >
              브이밍 보내기
            </button>
          </div>
        ) : null}
        {canWithdraw ? (
          <button type="button" className="mt-3 w-full text-[12px] font-bold text-red-600" onClick={onWithdraw}>
            동의 철회
          </button>
        ) : null}
        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white"
          onClick={onClose}
        >
          확인
        </button>
      </div>
    </div>
  );
}
