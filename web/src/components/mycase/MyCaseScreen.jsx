import { useEffect, useMemo, useState } from "react";
import MyCaseGrid from "./MyCaseGrid.jsx";
import MyCaseDetailModal from "./MyCaseDetailModal.jsx";
import MyCaseShowcasePickTray from "./MyCaseShowcasePickTray.jsx";
import AppFullScreenView from "../AppFullScreenView.jsx";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { readDigitalCardActive, readMembershipTier } from "../../lib/bizcardAccountSync.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import {
  LETTERING_BIZCARD_CHANGED_EVENT
} from "../../lib/letteringBizcardStorage.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import "./my-case-detail.css";

/**
 * 하단바 마이케이스
 * - 피드 탭 → 쇼케이스만
 * - 디지털인증명함 버튼 → 홈/쇼케이스 「미리보기」와 동일한 수신 UI (명함 페이지만)
 */
export default function MyCaseScreen({
  onGoMain,
  onToast,
  isDarkMode = false,
  layout = "mobile",
  showSearch = false,
  showLineSwitcher = false,
  showcasePickEnabled = false
}) {
  const isDesktop = layout === "desktop";
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailPayload, setDetailPayload] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [previewTick, setPreviewTick] = useState(0);

  const caseBgmEnabled = !cardOpen && !detailOpen;

  useEffect(() => {
    const bump = () => setPreviewTick((n) => n + 1);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    window.addEventListener("vlue-digital-card-changed", bump);
    return () => {
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
      window.removeEventListener("vlue-digital-card-changed", bump);
    };
  }, []);

  useEffect(() => {
    if (cardOpen) setCardExpanded(true);
  }, [cardOpen]);

  useEffect(() => {
    const onCloseOverlays = () => {
      setDetailOpen(false);
      setDetailItem(null);
      setDetailPayload(null);
      setFeedItems([]);
      setFeedStartIndex(0);
      setCardOpen(false);
    };
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
  }, []);

  const membershipTier = useMemo(() => readMembershipTier(), [cardOpen, previewTick]);

  /** 홈·블루쇼케이스 미리보기와 동일 파이프라인 */
  const cardPreview = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    return applyShowcaseStyleToCard(base, membershipTier, { digitalCardActive: true });
  }, [membershipTier, previewTick]);

  const closeCard = () => {
    setCardOpen(false);
    setCardExpanded(true);
  };

  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(52px+env(safe-area-inset-bottom,0px))]">
        <MyCaseGrid
          mode="mine"
          onBack={onGoMain}
          onToast={onToast}
          bgmEnabled={caseBgmEnabled}
          isDarkMode={isDarkMode}
          showSearch={showSearch}
          showLineSwitcher={showLineSwitcher}
          onOpenDigitalCard={() => {
            if (!readDigitalCardActive()) {
              onToast?.("디지털인증명함이 없습니다.");
              return;
            }
            if (!isPaidLetteringTier(membershipTier)) {
              onToast?.("유료 디지털인증명함이 없습니다.");
              return;
            }
            setCardOpen(true);
            if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
              window.__vlueUnlockShowcaseBgm();
              window.setTimeout(() => window.__vlueUnlockShowcaseBgm?.(), 50);
            }
          }}
          onOpenDetail={(item, detail, meta) => {
            setDetailItem(item);
            setDetailPayload(detail);
            setFeedItems(Array.isArray(meta?.feedItems) ? meta.feedItems : item ? [item] : []);
            setFeedStartIndex(Number.isFinite(meta?.startIndex) ? meta.startIndex : 0);
            setDetailOpen(true);
          }}
        />
      </div>

      {showcasePickEnabled && !isDesktop ? (
        <MyCaseShowcasePickTray enabled variant="sheet" onToast={onToast} />
      ) : null}

      <MyCaseDetailModal
        open={detailOpen}
        item={detailItem}
        detail={detailPayload}
        feedItems={feedItems}
        startIndex={feedStartIndex}
        isOwner
        layout={isDesktop ? "desktop" : "mobile"}
        showcasePickEnabled={showcasePickEnabled}
        suppressBgm
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailPayload(null);
          setFeedItems([]);
          setFeedStartIndex(0);
        }}
        onToast={onToast}
      />

      <AppFullScreenView
        open={cardOpen}
        onClose={closeCard}
        title=""
        hideHeader
        showFloatingClose
        coverBottomNav
        className="my-case-detail my-case-detail--broadcast bg-[#0B101B]"
      >
        <div className="my-case-detail__broadcast-shell lettering-showcase-fs lettering-showcase-fs--history-embed">
          <div className="lettering-showcase-fs__shell">
            <LetteringIncomingNotification
              className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--mycase-feed"
              verified
              previewMode
              showOwnerSettings
              hideUnverifiedFooter
              callPhase="connected"
              platform="android"
              isRecording={false}
              callDurationSec={0}
              recordingDurationSec={0}
              incomingNumber={cardPreview.phone || ""}
              savedContactName={cardPreview.name || ""}
              isKnownContact
              card={cardPreview}
              includeDigitalCard
              digitalCardOnly
              expanded={cardExpanded}
              onExpandedChange={(next) => {
                setCardExpanded(next);
                if (!next) closeCard();
              }}
              onEndCall={closeCard}
              onToast={onToast}
            />
          </div>
        </div>
      </AppFullScreenView>
    </section>
  );
}
