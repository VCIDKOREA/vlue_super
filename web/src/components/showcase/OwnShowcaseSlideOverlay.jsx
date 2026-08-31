import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { readEffectiveMembershipTier } from "../../lib/effectiveMembership.js";
import { OPEN_OWN_SHOWCASE_SLIDE_EVENT } from "../../lib/showcase/openOwnShowcaseSlide.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";

/** 좋아요 알림 탭 → 본인 쇼케이스 해당 슬라이드 */
export default function OwnShowcaseSlideOverlay({ onToast }) {
  const [state, setState] = useState({ open: false, contentOrdinal: 0, slideId: "" });

  const close = useCallback(() => {
    setState({ open: false, contentOrdinal: 0, slideId: "" });
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      const d = e?.detail || {};
      setState({
        open: true,
        contentOrdinal: Math.max(0, Math.floor(Number(d.contentOrdinal) || 0)),
        slideId: String(d.slideId || "").trim()
      });
    };
    window.addEventListener(OPEN_OWN_SHOWCASE_SLIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_OWN_SHOWCASE_SLIDE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!state.open) return undefined;
    return pushAndroidBackHandler(() => {
      close();
      return true;
    });
  }, [state.open, close]);

  const tier = readEffectiveMembershipTier();
  const card = useMemo(() => resolveVlueShowcaseCard({ membershipTier: tier }), [tier, state.open]);

  if (!state.open || typeof document === "undefined") return null;

  return createPortal(
    <div className="own-showcase-slide-overlay fixed inset-0 z-[280] bg-[#0B101B]">
      <LetteringIncomingNotification
        verified
        previewMode
        showOwnerSettings={false}
        callPhase="connected"
        platform="android"
        isRecording
        callDurationSec={0}
        recordingDurationSec={0}
        incomingNumber={card?.phone || ""}
        card={card}
        includeDigitalCard
        isKnownContact
        expanded
        focusContentOrdinal={state.contentOrdinal}
        focusSlideId={state.slideId}
        suppressExpandGuide
        onExpandedChange={(isOpen) => {
          if (!isOpen) close();
        }}
        onEndCall={close}
        onToast={onToast}
        className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass"
      />
    </div>,
    document.body
  );
}
