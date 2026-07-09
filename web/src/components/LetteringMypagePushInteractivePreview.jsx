import { useEffect, useRef, useState } from "react";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { VLUE_SHOWCASE_DEMO_RECORDING_SEC } from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";

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
  const rootRef = useRef(null);
  const { setPlaybackPhase, bindStyleConfig } = useShowcaseBgm();
  const styledCard = applyShowcaseStyleToCard(card, card?.membershipTier || "free");

  useEffect(() => {
    bindStyleConfig(styledCard?.showcaseStyle);
    setPlaybackPhase(expanded ? "replay" : "call_active");
    return () => setPlaybackPhase("idle");
  }, [expanded, styledCard?.showcaseStyle, bindStyleConfig, setPlaybackPhase]);

  useEffect(() => {
    if (!expanded || !rootRef.current) return;
    const id = requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  return (
    <div
      ref={rootRef}
      className={`lettering-mypage-push-interactive${dimmed ? " lettering-mypage-push-interactive--dimmed" : ""} ${className}`.trim()}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="lettering-mypage-push-interactive__frame">
        <div className="lettering-mypage-push-interactive__call-bg" aria-hidden />
        <LetteringIncomingNotification
          className="lettering-ongoing--on-call lettering-ongoing--case-preview w-full"
          verified
          card={styledCard}
          platform={platform}
          callPhase="active"
          isRecording={isRecording}
          callDurationSec={VLUE_SHOWCASE_DEMO_RECORDING_SEC}
          recordingDurationSec={VLUE_SHOWCASE_DEMO_RECORDING_SEC}
          incomingNumber={styledCard?.phone || ""}
          expanded={expanded}
          onExpandedChange={setExpanded}
          hideUnverifiedFooter
        />
      </div>
    </div>
  );
}
