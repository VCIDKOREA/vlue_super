import { Phone, PhoneOff } from "lucide-react";

/**
 * 링잉: 통화 / 거절 · 연결 후: 64×64 원형 통화 종료 → nativeEndCall
 */
export default function TentCallActionBar({
  callState = "ringing",
  onAnswer,
  onReject,
  onEnd,
  answerLabel = "통화",
  rejectLabel = "거절",
  endLabel = "통화 종료"
}) {
  const connected = callState === "connected";

  if (connected) {
    return (
      <div className="tent-call-bar tent-call-bar--connected">
        <button
          type="button"
          className="tent-call-bar__btn tent-call-bar__btn--end tent-call-bar__btn--end-circle"
          onClick={onEnd}
          aria-label={endLabel}
        >
          <PhoneOff size={24} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="tent-call-bar tent-call-bar--ringing">
      <button type="button" className="tent-call-bar__btn tent-call-bar__btn--reject" onClick={onReject}>
        <PhoneOff size={20} aria-hidden />
        <span>{rejectLabel}</span>
      </button>
      <button type="button" className="tent-call-bar__btn tent-call-bar__btn--answer" onClick={onAnswer}>
        <Phone size={20} aria-hidden />
        <span>{answerLabel}</span>
      </button>
    </div>
  );
}
