import { VMING_CONSENT_LEGAL } from "../../lib/vmingConsentApi.js";

export default function VmingConsentRespondModal({
  open,
  requesterName = "방장",
  validityLabel = "90일",
  onAccept,
  onDecline,
  onClose,
  isDarkMode = false
}) {
  if (!open) return null;
  const panel = isDarkMode
    ? "border-white/10 bg-[#151821] text-white"
    : "border-slate-200 bg-white text-slate-900";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${panel}`}>
        <p className="text-[16px] font-black">브이밍 AI 초대 동의 요청</p>
        <p className="mt-2 text-[13px] opacity-85">
          <strong>{requesterName}</strong>님이 이 채팅방에 브이밍 AI를 초대하려 해요.
        </p>
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[12px] dark:border-blue-900 dark:bg-blue-950/30">
          <p className="font-bold text-blue-800 dark:text-blue-200">브이밍 AI 권한</p>
          <ul className="mt-2 space-y-1">
            <li>채팅 내용 읽기 및 분석</li>
            <li>회의록/요약본 생성</li>
            <li>일정 자동 감지</li>
            <li className="text-red-600 dark:text-red-400">외부 서버 전송 없음 · 개인정보 저장 없음</li>
          </ul>
          <p className="mt-2 opacity-70">동의 유효기간: {validityLabel}</p>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed opacity-55">{VMING_CONSENT_LEGAL}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold dark:border-white/15"
            onClick={onDecline}
          >
            거절
          </button>
          <button type="button" className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white" onClick={onAccept}>
            동의하기
          </button>
        </div>
        <button type="button" className="mt-2 w-full py-2 text-[12px] opacity-50" onClick={onClose}>
          나중에
        </button>
      </div>
    </div>
  );
}
