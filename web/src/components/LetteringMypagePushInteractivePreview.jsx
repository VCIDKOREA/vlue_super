import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { VLUE_SHOWCASE_DEMO_RECORDING_SEC } from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";

/**
 * 마이페이지 — 실제 빅푸시와 동일하게 ▼/▲ 로 접힘·펼침
 * 펼침 시 하단 내비까지 덮는 전체화면으로 전환
 */
export default function LetteringMypagePushInteractivePreview({
  card,
  platform = "android",
  isRecording = true,
  dimmed = false,
  className = "",
  onToast
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

  const notificationProps = {
    verified: true,
    card: styledCard,
    platform,
    callPhase: "active",
    isRecording,
    callDurationSec: VLUE_SHOWCASE_DEMO_RECORDING_SEC,
    recordingDurationSec: VLUE_SHOWCASE_DEMO_RECORDING_SEC,
    incomingNumber: styledCard?.phone || "",
    expanded,
    onExpandedChange: setExpanded,
    hideUnverifiedFooter: true,
    previewMode: true,
    onEndCall: () => setExpanded(false),
    onToast
  };

  return (
    <div
      ref={rootRef}
      className={`lettering-mypage-push-interactive${dimmed ? " lettering-mypage-push-interactive--dimmed" : ""} ${className}`.trim()}
      data-expanded={expanded ? "true" : "false"}
    >
      {!expanded ? (
        <div className="lettering-mypage-push-interactive__frame">
          <div className="lettering-mypage-push-interactive__call-bg" aria-hidden />
          <LetteringIncomingNotification
            {...notificationProps}
            className="lettering-ongoing--on-call lettering-ongoing--case-preview w-full"
          />
        </div>
      ) : (
        <div className="lettering-mypage-push-interactive__frame lettering-mypage-push-interactive__frame--placeholder">
          <p className="px-3 py-8 text-center text-[11px] font-semibold text-slate-400">전체화면 쇼케이스 미리보기 중</p>
        </div>
      )}

      {expanded && typeof document !== "undefined"
        ? createPortal(
            <div className="lettering-showcase-fs" role="dialog" aria-modal="true" aria-label="쇼케이스 미리보기">
              <div className="lettering-showcase-fs__shell">
                <LetteringIncomingNotification
                  {...notificationProps}
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
