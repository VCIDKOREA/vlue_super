import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";

/**
 * 검색·팔로우 목록에서 상대 쇼케이스 열람 — 마이케이스와 동일 UI
 * 본인 [설정] 자리에 상대는 [닫기]
 */
export default function PeerShowcasePreview({
  card,
  onClose,
  onToast,
  includeDigitalCard = true,
  digitalCardOnly = false
}) {
  const style =
    (card?.showcaseStyle && typeof card.showcaseStyle === "object"
      ? card.showcaseStyle
      : null) || createDefaultShowcaseStyle();
  const previewCard = {
    ...card,
    showcaseStyle: style,
    userId: card?.userId || card?.ownerUserId || "",
    ownerUserId: card?.ownerUserId || card?.userId || "",
    authCycleEndAt: card?.authCycleEndAt || card?.cycleEndAt || null,
    authPaidAt: card?.authPaidAt || null,
    cycleEndAt: card?.authCycleEndAt || card?.cycleEndAt || null
  };

  return (
    <div className="peer-showcase-preview my-case-detail__broadcast-shell lettering-showcase-fs lettering-showcase-fs--history-embed relative flex min-h-0 flex-1 flex-col bg-[#0B101B]">
      <div className="lettering-showcase-fs__shell flex min-h-0 flex-1 flex-col">
        <LetteringIncomingNotification
          className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--mycase-feed"
          verified
          previewMode
          showOwnerSettings={false}
          showPeerClose
          onPeerClose={onClose}
          hideUnverifiedFooter
          callPhase="connected"
          platform="android"
          isRecording={false}
          callDurationSec={0}
          recordingDurationSec={0}
          incomingNumber={previewCard.phone || ""}
          savedContactName={previewCard.name || previewCard.displayName || ""}
          isKnownContact
          card={previewCard}
          includeDigitalCard={Boolean(includeDigitalCard)}
          digitalCardOnly={Boolean(digitalCardOnly)}
          expanded
          onExpandedChange={(next) => {
            if (!next) onClose?.();
          }}
          onEndCall={onClose}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
