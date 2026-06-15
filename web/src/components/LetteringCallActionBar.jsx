import { Phone, PhoneOff } from "lucide-react";

/** 수신 화면 하단 — 통화·종료 (네이티브 통화 UI 마감) */
export default function LetteringCallActionBar({
  phone = "",
  onAnswer,
  onEnd,
  answerLabel = "통화",
  endLabel = "종료",
  className = ""
}) {
  const tel = String(phone || "").replace(/[^\d+]/g, "");

  const handleAnswer = () => {
    if (onAnswer) {
      onAnswer();
      return;
    }
    if (tel && typeof window !== "undefined") {
      window.location.href = `tel:${tel}`;
    }
  };

  const handleEnd = () => {
    onEnd?.();
  };

  return (
    <div className={`ldr-call-bar ${className}`.trim()}>
      <button type="button" className="ldr-call-bar__btn ldr-call-bar__btn--answer" onClick={handleAnswer}>
        <Phone className="h-5 w-5" aria-hidden />
        <span>{answerLabel}</span>
      </button>
      <button type="button" className="ldr-call-bar__btn ldr-call-bar__btn--end" onClick={handleEnd}>
        <PhoneOff className="h-5 w-5" aria-hidden />
        <span>{endLabel}</span>
      </button>
    </div>
  );
}
