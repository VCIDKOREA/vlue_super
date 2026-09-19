import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";

/**
 * 비회원 쇼케이스 전달 — 카톡 / SMS 선택
 */
export default function ShareShowcaseChannelSheet({ open, onClose, onPick, busy = false }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="share-showcase-channel-root"
      role="dialog"
      aria-modal="true"
      aria-label="쇼케이스 전달하기"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="share-showcase-channel-sheet">
        <header className="share-showcase-channel-sheet__head">
          <div>
            <p className="share-showcase-channel-sheet__title">쇼케이스 전달하기</p>
            <p className="share-showcase-channel-sheet__sub">전달 방법을 선택하세요</p>
          </div>
          <button
            type="button"
            className="share-showcase-channel-sheet__close"
            aria-label="닫기"
            disabled={busy}
            onClick={() => onClose?.()}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <button
          type="button"
          className="share-showcase-channel-sheet__btn share-showcase-channel-sheet__btn--kakao"
          disabled={busy}
          onClick={() => onPick?.("kakao")}
        >
          <span className="share-showcase-channel-sheet__kakao-mark" aria-hidden>
            톡
          </span>
          <span className="share-showcase-channel-sheet__btn-text">
            <strong>카카오톡으로 보내기</strong>
            <em>친구를 직접 선택해 초대합니다</em>
          </span>
        </button>

        <button
          type="button"
          className="share-showcase-channel-sheet__btn share-showcase-channel-sheet__btn--sms"
          disabled={busy}
          onClick={() => onPick?.("sms")}
        >
          <MessageCircle size={22} strokeWidth={2.2} aria-hidden />
          <span className="share-showcase-channel-sheet__btn-text">
            <strong>SMS 문자 보내기</strong>
            <em>통화 번호로 초대 문자를 보냅니다</em>
          </span>
        </button>

        <button
          type="button"
          className="share-showcase-channel-sheet__cancel"
          disabled={busy}
          onClick={() => onClose?.()}
        >
          취소
        </button>
      </div>
    </div>,
    document.body
  );
}
