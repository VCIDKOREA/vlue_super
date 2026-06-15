import { useState } from "react";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";

const DEMO_DURATION_SEC = 4 * 60 + 31;

/**
 * 마이페이지 — 실제 빅푸시와 동일하게 ▼/▲ 로 접힘·펼침
 */
export default function LetteringMypagePushInteractivePreview({
  card,
  platform = "android",
  isRecording = true,
  dimmed = false,
  className = ""
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`lettering-mypage-push-interactive${dimmed ? " lettering-mypage-push-interactive--dimmed" : ""} ${className}`.trim()}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="lettering-mypage-push-interactive__frame">
        <div className="lettering-mypage-push-interactive__call-bg" aria-hidden />
        <LetteringIncomingNotification
          className="lettering-ongoing--on-call w-full"
          verified
          card={card}
          platform={platform}
          callPhase="active"
          isRecording={isRecording}
          callDurationSec={DEMO_DURATION_SEC}
          recordingDurationSec={DEMO_DURATION_SEC}
          incomingNumber={card?.phone || ""}
          expanded={expanded}
          onExpandedChange={setExpanded}
          hideUnverifiedFooter
        />
      </div>
    </div>
  );
}
