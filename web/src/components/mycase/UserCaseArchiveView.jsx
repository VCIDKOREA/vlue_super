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
  onToast
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailPayload, setDetailPayload] = useState(null);

  if (!open || !userId) return null;

  return (
    <>
      <AppFullScreenView
        open={open}
        onClose={onClose}
        hideHeader
        showFloatingClose={false}
        coverBottomNav
        className="bg-white"
        title={displayName || "케이스함"}
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          <MyCaseGrid
            mode="user"
            ownerUserId={userId}
            onBack={onClose}
            onToast={onToast}
            onOpenDetail={(item, detail) => {
              setDetailItem(item);
              setDetailPayload(detail);
              setDetailOpen(true);
            }}
          />
        </div>
      </AppFullScreenView>

      <MyCaseDetailModal
        open={detailOpen}
        item={detailItem}
        detail={detailPayload}
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailPayload(null);
        }}
        onToast={onToast}
      />
    </>
  );
}
