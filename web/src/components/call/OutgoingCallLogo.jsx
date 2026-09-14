import { useCallback, useRef } from "react";
import { VlueNavLogoMark, useVlueLogoBlink } from "../VlueNavLogoMark.jsx";

/** 발신 중앙 로고 — 화면 정중앙 타일 (과대 금지) */
const OUTGOING_LOGO_SIZE = 48;

/**
 * 발신 통화 — BigPush 대신 화면 상하좌우 정중앙 VLUÉ 로고(흰 테두리).
 * 탭 시 눈 깜빡임 후 네이티브 expandOutgoingShowcase.
 */
export default function OutgoingCallLogo({ connected = false, onExpand }) {
  const { blinkSeq, triggerBlink } = useVlueLogoBlink();
  const expandingRef = useRef(false);

  const handleTap = useCallback(() => {
    if (expandingRef.current) return;
    expandingRef.current = true;
    triggerBlink();
    window.setTimeout(() => {
      try {
        onExpand?.();
        window.VlueLettering?.expandOutgoingShowcase?.();
        window.Android?.expandOutgoingShowcase?.();
      } catch {
        /* ignore */
      }
      expandingRef.current = false;
    }, 420);
  }, [onExpand, triggerBlink]);

  return (
    <div className="outgoing-call-logo" data-connected={connected ? "1" : "0"}>
      <button
        type="button"
        className="outgoing-call-logo__btn"
        aria-label={connected ? "쇼케이스 열기" : "통화 연결 대기"}
        onClick={handleTap}
      >
        <span className="outgoing-call-logo__mark-wrap">
          <VlueNavLogoMark
            blinkSeq={blinkSeq}
            size={OUTGOING_LOGO_SIZE}
            className="outgoing-call-logo__mark"
          />
        </span>
        <span className="outgoing-call-logo__hint" aria-hidden={!connected}>
          {connected ? "탭하여 쇼케이스 보기" : "연결 중"}
        </span>
      </button>
    </div>
  );
}
