import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { readVcidBroadcastOn } from "../../lib/bizcardAccountSync.js";
import { canUseV1PaidDccFeatures } from "../../lib/v1PaidPackageGate.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";
import "./showcase-pull-down-preview.css";

/**
 * 블루 쇼케이스 설정 — 우측 사이드 탭 「미리보기」
 * 탭/왼쪽으로 스윽 → 전체 화면 미리보기
 * 쇼케이스 꺼짐 — VLUE 인증 팝업(번호+인증)만, BGM·콘텐츠 슬라이드 없음
 */
export default function ShowcasePullDownPreview({
  card,
  includeDigitalCard = true,
  membershipTier = "free",
  onToast
}) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [broadcastOn, setBroadcastOn] = useState(() => readVcidBroadcastOn());

  useEffect(() => {
    const sync = () => setBroadcastOn(readVcidBroadcastOn());
    window.addEventListener("vlue-vcid-changed", sync);
    return () => window.removeEventListener("vlue-vcid-changed", sync);
  }, []);

  const showcaseOffPreview = !broadcastOn;
  const previewCard = useMemo(() => {
    if (!showcaseOffPreview) return card;
    return { ...card, membershipTier: "free" };
  }, [card, showcaseOffPreview]);

  const previewIncludeDigitalCard =
    !showcaseOffPreview &&
    Boolean(includeDigitalCard) &&
    canUseV1PaidDccFeatures(membershipTier);

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
            aria-label={showcaseOffPreview ? "VLUE 인증 미리보기" : "쇼케이스 미리보기"}
          >
            <header className="showcase-side-preview__bar">
              <p className="showcase-side-preview__bar-title">
                {showcaseOffPreview ? "VLUE 인증 미리보기" : "미리보기"}
              </p>
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
                  showcaseOffPreview={showcaseOffPreview}
                  callPhase="connected"
                  platform="android"
                  isRecording={!showcaseOffPreview}
                  callDurationSec={0}
                  recordingDurationSec={0}
                  incomingNumber={previewCard?.phone || ""}
                  card={previewCard}
                  includeDigitalCard={previewIncludeDigitalCard}
                  isKnownContact
                  expanded={!showcaseOffPreview}
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
