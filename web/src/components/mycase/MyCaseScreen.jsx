import { useCallback, useEffect, useMemo, useState } from "react";
import MyCaseGrid from "./MyCaseGrid.jsx";
import MyCaseDetailModal from "./MyCaseDetailModal.jsx";
import MyCaseShowcasePickTray from "./MyCaseShowcasePickTray.jsx";
import AppFullScreenView from "../AppFullScreenView.jsx";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { readDigitalCardActive, readMembershipTier } from "../../lib/bizcardAccountSync.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import { deleteMycase } from "../../lib/mycaseApi.js";
import { notifyMycaseFeedMutated } from "../../lib/mycase/mycaseFeedEvents.js";
import {
  LETTERING_BIZCARD_CHANGED_EVENT
} from "../../lib/letteringBizcardStorage.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import {
  clearLiveBroadcastMeta,
  hydrateLiveBroadcastFromServer,
  readLiveBroadcastMeta
} from "../../lib/showcase/syncMycaseLiveBroadcast.js";
import {
  readLiveShowcaseStyle,
  readShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { hasPlayableShowcaseBgm } from "../../lib/showcase/showcaseBgmPresets.js";
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
  const [detailBgmConfig, setDetailBgmConfig] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [previewTick, setPreviewTick] = useState(0);
  const [composerEditTarget, setComposerEditTarget] = useState(null);

  const caseBgmEnabled = !cardOpen;

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
      setDetailBgmConfig(null);
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

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailItem(null);
    setDetailPayload(null);
    setDetailBgmConfig(null);
    setFeedItems([]);
    setFeedStartIndex(0);
  }, []);

  const preserveCaseboxBgmBeforeClearLive = useCallback(() => {
    try {
      const editor = readShowcaseStyle();
      if (hasPlayableShowcaseBgm(editor)) return;
      const live = readLiveShowcaseStyle();
      if (live && hasPlayableShowcaseBgm(live)) {
        writeShowcaseStyle({ ...editor, bgm: live.bgm }, { skipSync: true, silent: true });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleEditPost = useCallback(
    (item, activeDetail) => {
      const caseId = String(item?.id || "").trim();
      if (!caseId) return;
      const payloadJson =
        activeDetail?.item?.payloadJson ?? item?.payloadJson ?? activeDetail?.payloadJson ?? null;
      closeDetail();
      setComposerEditTarget({ caseId, item, payloadJson });
    },
    [closeDetail]
  );

  const handleDeletePost = useCallback(
    async (item) => {
      const caseId = String(item?.id || "").trim();
      if (!caseId) {
        onToast?.("게시물 정보가 올바르지 않습니다.");
        return;
      }
      if (!window.confirm("게시물을 삭제할까요? 모든 기록이 삭제됩니다.")) return;
      const liveMeta = readLiveBroadcastMeta();
      const touchingLive =
        Boolean(item.isMainBroadcast) || String(liveMeta?.caseId || "") === caseId;
      try {
        const res = await deleteMycase(caseId);
        if (!res.ok) {
          onToast?.(res.message || "삭제에 실패했습니다.");
          if (res.error === "not_found") notifyMycaseFeedMutated();
          return;
        }
        if (touchingLive) {
          preserveCaseboxBgmBeforeClearLive();
          clearLiveBroadcastMeta();
          await hydrateLiveBroadcastFromServer();
        }
        notifyMycaseFeedMutated();
        closeDetail();
        onToast?.("게시물을 삭제했습니다.");
      } catch {
        onToast?.("삭제에 실패했습니다.");
      }
    },
    [closeDetail, onToast, preserveCaseboxBgmBeforeClearLive]
  );

  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden bg-white">
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${
          showcasePickEnabled && !isDesktop
            ? "my-case-scroll-pad-bottom--pick-tray"
            : "my-case-scroll-pad-bottom"
        }`}
      >
        <MyCaseGrid
          mode="mine"
          onBack={onGoMain}
          onToast={onToast}
          bgmEnabled={caseBgmEnabled}
          isDarkMode={isDarkMode}
          showSearch={showSearch}
          showLineSwitcher={showLineSwitcher}
          layout={layout}
          composerEditTarget={composerEditTarget}
          onComposerEditTargetClear={() => setComposerEditTarget(null)}
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
            setDetailBgmConfig(meta?.bgmStyleConfig || null);
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
        isDarkMode={isDarkMode}
        bgmStyleConfig={detailBgmConfig}
        onClose={closeDetail}
        onToast={onToast}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
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
