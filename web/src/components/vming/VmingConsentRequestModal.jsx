import { useState } from "react";
import { VMING_CONSENT_LEGAL } from "../../lib/vmingConsentApi.js";

const MODES = [
  { id: "all", label: "전원 동의 (권장/안전)" },
  { id: "majority", label: "과반수 동의" },
  { id: "partial", label: "동의한 멤버만 분석" }
];

const VALIDITY = [
  { id: 30, label: "30일" },
  { id: 90, label: "90일", default: true },
  { id: 0, label: "이번 방만", sessionOnly: true }
];

export default function VmingConsentRequestModal({ open, onClose, onSubmit, isDarkMode = false }) {
  const [mode, setMode] = useState("all");
  const [validity, setValidity] = useState(90);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [step, setStep] = useState(1);

  if (!open) return null;

  const panel = isDarkMode
    ? "border-white/10 bg-[#151821] text-white"
    : "border-slate-200 bg-white text-slate-900";

  const pickValidity = (v) => {
    setValidity(v.id);
    setSessionOnly(Boolean(v.sessionOnly));
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${panel}`}>
        {step === 1 ? (
          <>
            <p className="text-[16px] font-black">브이밍 AI 동의 조건 설정</p>
            <p className="mt-2 text-[13px] opacity-80">AI가 대화 내용을 분석합니다. 멤버 동의 방식을 선택하세요.</p>
            <div className="mt-4 space-y-2">
              {MODES.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 text-[14px]">
                  <input type="radio" name="vming-mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="mt-4 text-[13px] font-bold">동의 유효기간</p>
            <div className="mt-2 flex gap-3">
              {VALIDITY.map((v) => (
                <label key={v.label} className="flex cursor-pointer items-center gap-1 text-[13px]">
                  <input
                    type="radio"
                    name="vming-validity"
                    checked={sessionOnly ? v.sessionOnly : validity === v.id && !v.sessionOnly}
                    onChange={() => pickValidity(v)}
                  />
                  {v.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white"
              onClick={() => setStep(2)}
            >
              다음
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] font-black">멤버에게 동의 요청을 보낼까요?</p>
            <ul className="mt-3 space-y-1 text-[13px] opacity-90">
              <li>채팅 내용 읽기 및 분석</li>
              <li>회의록/요약본 생성</li>
              <li>일정 자동 감지</li>
              <li className="text-red-500">외부 서버 전송 없음 · 개인정보 저장 없음</li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed opacity-60">{VMING_CONSENT_LEGAL}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[13px] font-bold dark:bg-white/10" onClick={() => setStep(1)}>
                이전
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white"
                onClick={() =>
                  onSubmit?.({
                    consentMode: mode,
                    validityDays: sessionOnly ? 0 : validity,
                    sessionOnly
                  })
                }
              >
                동의 요청 보내기
              </button>
            </div>
          </>
        )}
        <button type="button" className="mt-2 w-full py-2 text-[12px] opacity-50" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}
