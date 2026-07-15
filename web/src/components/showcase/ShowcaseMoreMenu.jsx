import { createPortal } from "react-dom";
import { Bookmark, Flag, VolumeX, Volume2 } from "lucide-react";

/**
 * 4 더보기 — 저장 · 신고 · BGM
 */
export default function ShowcaseMoreMenu({
  open,
  onClose,
  onSave,
  onReport,
  onToggleBgm,
  bgmMuted = false,
  canToggleBgm = true
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="showcase-more-menu-root" role="dialog" aria-modal="true" aria-label="더보기">
      <button type="button" className="showcase-more-menu-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="showcase-more-menu">
        <button
          type="button"
          className="showcase-more-menu__item"
          onClick={() => {
            onSave?.();
            onClose?.();
          }}
        >
          <Bookmark size={18} aria-hidden />
          개인케이스에 저장
        </button>
        <button
          type="button"
          className="showcase-more-menu__item"
          disabled={!canToggleBgm}
          onClick={() => {
            onToggleBgm?.();
            onClose?.();
          }}
        >
          {bgmMuted ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
          {bgmMuted ? "BGM 켜기" : "BGM 음소거"}
        </button>
        <button
          type="button"
          className="showcase-more-menu__item showcase-more-menu__item--danger"
          onClick={() => {
            onReport?.();
            onClose?.();
          }}
        >
          <Flag size={18} aria-hidden />
          신고
        </button>
        <button type="button" className="showcase-more-menu__cancel" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>,
    document.body
  );
}
