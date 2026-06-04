import { useEffect, useState } from "react";
import { fetchVmingUserStatus, purchaseVmingUnlimited } from "../../lib/vmingApi.js";

const DAILY_CHAT_EXCEEDED_MESSAGE = `오늘 저와 나눌 수 있는 무료 대화 용량을 모두 소모하셨어요! 💬 오늘의 이야기는 아쉽게 공식 종료되지만, 내일 오전 0시(자정)가 되면 새로운 대화 용량이 가득 충전되니 내일 다시 시도해 주세요!

만약 내일까지 기다리지 않고 지금 바로 멈춤 없는 대화를 이어가거나, 대화방 요약·PPT 제작 등 심도 깊은 프로젝트 전용 기능을 제한 없이 담당하게 하고 싶으시다면 아래 링크를 확인해 보세요!`;

const PROJECT_LIMIT_EXCEEDED_MESSAGE =
  "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 환율 상승에도 부담 없는 가격! 월 4,900원 무제한 패키지로 VLUE의 모든 AI 기능을 제한 없이 고용해 보세요!";

export default function VmingUpgradePromptModal({
  open,
  message = "",
  blockedReasonType = "GENERAL_LIMIT_EXCEEDED",
  onClose
}) {
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchVmingUserStatus()
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [open]);

  if (!open) return null;

  const isDailyChatExceeded = blockedReasonType === "DAILY_CHAT_EXCEEDED";
  const isProjectExceeded = blockedReasonType === "PROJECT_LIMIT_EXCEEDED";
  const displayMessage = isDailyChatExceeded
    ? DAILY_CHAT_EXCEEDED_MESSAGE
    : isProjectExceeded
      ? PROJECT_LIMIT_EXCEEDED_MESSAGE
      : message || PROJECT_LIMIT_EXCEEDED_MESSAGE;
  const primaryCtaLabel = isProjectExceeded ? "⚡ 무제한 패키지 결제하기" : "⚡ 월 4,900원 무제한 패키지 업그레이드";

  return (
    <div className="fixed inset-0 z-[420] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-md rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl">
        <p className="text-[16px] font-black text-slate-900">⚡ 브이밍 무제한 패키지 안내</p>
        <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
          {displayMessage}
        </p>
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] text-violet-900">
          {usage?.statusLabel || "상태 조회 중..."}
        </div>
        {notice ? <p className="mt-2 text-[11px] font-semibold text-violet-700">{notice}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy || usage?.tier === "UNLIMITED"}
            onClick={async () => {
              try {
                setBusy(true);
                await purchaseVmingUnlimited();
                const latest = await fetchVmingUserStatus();
                setUsage(latest);
                setNotice("⚡ 월 4,900원 무제한 패키지가 적용되었습니다.");
              } catch {
                setNotice("결제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
              } finally {
                setBusy(false);
              }
            }}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[13px] font-black text-white disabled:opacity-60"
          >
            {usage?.tier === "UNLIMITED" ? "무제한 이용 중" : primaryCtaLabel}
          </button>
          {isProjectExceeded ? null : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-600"
            >
              확인 (내일 올래요)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
