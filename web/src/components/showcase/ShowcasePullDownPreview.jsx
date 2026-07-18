import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";
import "./showcase-pull-down-preview.css";

/**
 * 블루 쇼케이스 설정 — 우측 사이드 탭 「미리보기」
 * 탭/왼쪽으로 스윽 → 전체 화면 미리보기
 * 다시 탭/오른쪽으로 → 닫힘
 */
export default function ShowcasePullDownPreview({
  card,
  includeDigitalCard = true,
  onToast
}) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    return pushAndroidBackHandler(() => {
      setOpen(false);
      return true;
    });
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`showcase-side-preview${open ? " is-open" : ""}${entered ? " is-entered" : ""}`}
      data-showcase-side-preview="1"
    >
      <button
        type="button"
        className="showcase-side-preview__tab"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="showcase-side-preview-panel"
        aria-label={open ? "미리보기 닫기" : "미리보기 열기"}
        title="미리보기"
      >
        <span className="showcase-side-preview__tab-chevron" aria-hidden>
          {open ? <ChevronRight size={12} strokeWidth={2.6} /> : <ChevronLeft size={12} strokeWidth={2.6} />}
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="showcase-side-preview__scrim"
            aria-label="미리보기 닫기"
            onClick={close}
          />
          <aside
            id="showcase-side-preview-panel"
            className="showcase-side-preview__panel"
            role="dialog"
            aria-modal="true"
            aria-label="쇼케이스 미리보기"
          >
            <header className="showcase-side-preview__bar">
              <p className="showcase-side-preview__bar-title">미리보기</p>
              <button type="button" className="showcase-side-preview__close" onClick={close}>
                닫기
              </button>
            </header>
            <div className="showcase-side-preview__body">
              <div className="lettering-home-push-embed showcase-side-preview__embed">
                <LetteringIncomingNotification
                  verified
                  previewMode
                  showOwnerSettings={false}
                  callPhase="connected"
                  platform="android"
                  isRecording={false}
                  callDurationSec={0}
                  recordingDurationSec={0}
                  incomingNumber={card?.phone || ""}
                  card={card}
                  includeDigitalCard={includeDigitalCard}
                  isKnownContact
                  expanded
                  onExpandedChange={(isOpen) => {
                    if (!isOpen) close();
                  }}
                  onEndCall={close}
                  onToast={onToast}
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass"
                />
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>,
    document.body
  );
}
