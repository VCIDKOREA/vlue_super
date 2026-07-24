import { useState } from "react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import MyCaseGrid from "./MyCaseGrid.jsx";
import MyCaseDetailModal from "./MyCaseDetailModal.jsx";

/**
 * 타 유저 퍼블릭 프로필 + 케이스함 (인스타 형식 · 라이트)
 */
export default function UserCaseArchiveView({
  open,
  userId,
  displayName = "",
  onClose,
  onToast,
  isDarkMode = false
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailPayload, setDetailPayload] = useState(null);
  const [peerIdentity, setPeerIdentity] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedStartIndex, setFeedStartIndex] = useState(0);

  if (!open || !userId) return null;

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
            onBack={onClose}
            onToast={onToast}
            bgmEnabled
            isDarkMode={isDarkMode}
            onOpenDetail={(item, detail, meta) => {
              setPeerIdentity(
                meta || {
                  userId,
                  name: displayName || item?.title || "",
                  handle: "",
                  phone: "",
                  organization: "",
                  photoUrl: item?.thumbnailUrl || "",
                  membershipTier: "premium"
                }
              );
              setDetailItem(item);
              setDetailPayload(detail);
              setFeedItems(Array.isArray(meta?.feedItems) ? meta.feedItems : item ? [item] : []);
              setFeedStartIndex(Number.isFinite(meta?.startIndex) ? meta.startIndex : 0);
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
        peerIdentity={peerIdentity}
        suppressBgm
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailPayload(null);
          setPeerIdentity(null);
          setFeedItems([]);
          setFeedStartIndex(0);
        }}
        onToast={onToast}
      />
    </>
  );
}
