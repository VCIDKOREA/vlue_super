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
  digitalCardOnly = false,
  /** 카톡 공개 링크 — 접기/종료로 풀뷰를 죽이지 않음 */
  publicLinkMode = false,
  /** 명함 다음 콘텐츠 슬라이드부터 시작 (공개 링크) */
  preferContentSlide = false
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

  const handleCollapse = () => {
    if (publicLinkMode) {
      onToast?.("위로 스와이프하면 쇼케이스·음악을 볼 수 있습니다.");
      return;
    }
    onClose?.();
  };

  return (
    <div className="peer-showcase-preview my-case-detail__broadcast-shell lettering-showcase-fs lettering-showcase-fs--history-embed relative flex min-h-0 flex-1 flex-col bg-[#0B101B]">
      <div className="lettering-showcase-fs__shell flex min-h-0 flex-1 flex-col">
        <LetteringIncomingNotification
          className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--mycase-feed"
          verified
          previewMode
          showOwnerSettings={false}
          showPeerClose={!publicLinkMode}
          onPeerClose={publicLinkMode ? undefined : onClose}
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
          preferContentSlide={Boolean(preferContentSlide)}
          expanded
          onExpandedChange={(next) => {
            if (!next) handleCollapse();
          }}
          onEndCall={publicLinkMode ? undefined : onClose}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
