import { useEffect, useState } from "react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import MyCaseGrid from "./MyCaseGrid.jsx";
import MyCaseDetailModal from "./MyCaseDetailModal.jsx";
import PeerShowcasePreview from "../showcase/PeerShowcasePreview.jsx";
import { resolveVlueShowcasePeer } from "../../lib/resolveVlueShowcasePeer.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { trackShowcaseView } from "../../lib/productMetrics.js";

/**
 * 타 유저 퍼블릭 프로필 + 케이스함 (인스타 형식 · 본인 마이케이스와 동일 셸)
 */
export default function UserCaseArchiveView({
  open,
  userId,
  displayName = "",
  peerHandle = "",
  onClose,
  onToast,
  isDarkMode = false
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailPayload, setDetailPayload] = useState(null);
  const [detailBgmConfig, setDetailBgmConfig] = useState(null);
  const [peerIdentity, setPeerIdentity] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const [peerCard, setPeerCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    trackShowcaseView("peer_case_archive", String(userId));
  }, [open, userId]);

  if (!open || !userId) return null;

  const openPeerDigitalCard = async () => {
    if (cardLoading) return;
    setCardLoading(true);
    try {
      const resolved = await resolveVlueShowcasePeer({
        userId,
        displayName,
        forceStyle: true,
        viewContext: "search"
      });
      if (!resolved?.card) {
        onToast?.("디지털인증명함을 불러오지 못했습니다.");
        return;
      }
      if (!resolved.verified || !isPaidLetteringTier(resolved.card.membershipTier)) {
        onToast?.("디지털인증명함이 없습니다.");
        return;
      }
      setPeerCard(resolved.card);
      setCardOpen(true);
    } catch {
      onToast?.("디지털인증명함을 불러오지 못했습니다.");
    } finally {
      setCardLoading(false);
    }
  };

  return (
    <>
      <AppFullScreenView
        open={open}
        onClose={onClose}
        hideHeader
        showFloatingClose={false}
        coverBottomNav
        elevateAboveShowcase
        isDarkMode={isDarkMode}
        className={isDarkMode ? "bg-[#0b101b]" : "bg-white"}
        title={displayName || "케이스함"}
      >
        <div className={`min-h-0 flex-1 overflow-y-auto ${isDarkMode ? "bg-[#0b101b]" : "bg-white"}`}>
          <MyCaseGrid
            mode="user"
            ownerUserId={userId}
            peerHintName={displayName}
            peerHintHandle={peerHandle}
            onBack={onClose}
            onToast={onToast}
            bgmEnabled={!cardOpen}
            isDarkMode={isDarkMode}
            onOpenDigitalCard={() => {
              void openPeerDigitalCard();
            }}
            onOpenDetail={(item, detail, meta) => {
              setPeerIdentity(
                meta || {
                  userId,
                  name: displayName || item?.title || "",
                  handle: "",
                  phone: "",
                  organization: "",
                  photoUrl: item?.thumbnailUrl || "",
                  logoUrl: "",
                  membershipTier: "premium",
                  digitalCardIssued: true
                }
              );
              setDetailItem(item);
              setDetailPayload(detail);
              setFeedItems(Array.isArray(meta?.feedItems) ? meta.feedItems : item ? [item] : []);
              setFeedStartIndex(Number.isFinite(meta?.startIndex) ? meta.startIndex : 0);
              setDetailBgmConfig(meta?.bgmStyleConfig || null);
              setDetailOpen(true);
            }}
          />
        </div>
      </AppFullScreenView>

      <MyCaseDetailModal
        open={detailOpen}
        item={detailItem}
        detail={detailPayload}
        feedItems={feedItems}
        startIndex={feedStartIndex}
        isDarkMode={isDarkMode}
        peerIdentity={peerIdentity}
        bgmStyleConfig={detailBgmConfig}
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailPayload(null);
          setDetailBgmConfig(null);
          setPeerIdentity(null);
          setFeedItems([]);
          setFeedStartIndex(0);
        }}
        onToast={onToast}
      />

      <AppFullScreenView
        open={cardOpen && Boolean(peerCard)}
        onClose={() => {
          setCardOpen(false);
          setPeerCard(null);
        }}
        hideHeader
        showFloatingClose={false}
        coverBottomNav
        elevateAboveShowcase
        className="my-case-detail my-case-detail--broadcast bg-[#0B101B]"
        title="디지털 인증명함"
      >
        {peerCard ? (
          <PeerShowcasePreview
            card={peerCard}
            includeDigitalCard={
              isPaidLetteringTier(peerCard.membershipTier) &&
              peerCard.showcaseStyle?.includeDigitalCard !== false
            }
            onClose={() => {
              setCardOpen(false);
              setPeerCard(null);
            }}
            onToast={onToast}
          />
        ) : null}
      </AppFullScreenView>
    </>
  );
}
