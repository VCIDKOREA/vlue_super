import { useCallback, useRef } from "react";
import { VlueNavLogoMark, useVlueLogoBlink } from "../VlueNavLogoMark.jsx";
import VlueCyanVerifiedSeal from "../VlueCyanVerifiedSeal.jsx";
import { OUTGOING_LOGO_TAP_HINT } from "../../lib/call/outgoingLogoLabel.js";

/** 발신 중앙 로고 — 화면 정중앙 타일 (과대 금지) */
const OUTGOING_LOGO_SIZE = 48;

/**
 * 발신 통화 — BigPush 대신 화면 상하좌우 정중앙 VLUÉ 로고(흰 테두리).
 * 탭 시 눈 깜빡임 후 네이티브 expandOutgoingShowcase.
 *
 * 텍스트는 **로고 상단**에만 표시한다 (하단 「연결중...」 삭제).
 *  - VLUÉ DB 상호/이름 · 저장된 연락처 이름/상호
 *  - 미등록/모르는 번호 → 「탭하여 정보확인」
 * 호스트가 `label` 을 주입하고, 비어 있으면 「탭하여 정보확인」.
 */
export default function OutgoingCallLogo({
  connected = false,
  label = "",
  memberBadge = false,
  onExpand
}) {
  const topText = String(label || "").trim() || OUTGOING_LOGO_TAP_HINT;
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
        aria-label={`${topText} — 탭하면 바로 열립니다`}
        onClick={handleTap}
      >
        <span className="outgoing-call-logo__top">
          <span className="outgoing-call-logo__name">{topText}</span>
          {memberBadge ? (
            <VlueCyanVerifiedSeal
              size={12}
              className="outgoing-call-logo__badge"
              title="VLUÉ 인증"
            />
          ) : null}
        </span>
        <span className="outgoing-call-logo__mark-wrap">
          <VlueNavLogoMark
            blinkSeq={blinkSeq}
            size={OUTGOING_LOGO_SIZE}
            className="outgoing-call-logo__mark"
          />
        </span>
      </button>
    </div>
  );
}
