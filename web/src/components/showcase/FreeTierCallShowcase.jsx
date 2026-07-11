import { ShieldCheck } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { normalizeLetteringCard } from "../../lib/letteringCardNormalize.js";
import { CALL_STATES } from "../../lib/showcase/tentShowcaseTypes.js";
import TentShowcaseOverlay from "./TentShowcaseOverlay.jsx";
import "../../styles/tent-showcase.css";

/**
 * 무료 회원 단독 쇼케이스 (디지털 인증명함 없음)
 * - known: 천막 프로필(카톡·인스타 독) — 빅푸시 펼침과 동일
 * - unknown: VLUE 인증마크 + 전화번호 안심 화면
 */
export default function FreeTierCallShowcase({
  isKnownContact = false,
  card: cardRaw,
  phone = "",
  verified = true
}) {
  const card = normalizeLetteringCard(cardRaw || {});
  const phoneLabel = formatLetteringPhoneDisplay(phone || card.phone || "") || "—";

  if (isKnownContact) {
    return (
      <div className="free-tier-solo free-tier-solo--profile free-tier-solo--tent" data-mode="known">
        <TentShowcaseOverlay
          previewMode
          forceInteractive
          callState={CALL_STATES.CONNECTED}
          verified={verified}
          membershipTier="free"
          peerPhone={phone || card.phone || ""}
          displayName={card.name || card.displayName || ""}
          organization={card.organization || ""}
          card={card}
          showcaseStyle={card.showcaseStyle || null}
          privacyMode="public"
          className="tent-showcase--fill free-tier-solo__tent"
        />
      </div>
    );
  }

  return (
    <div className="free-tier-solo free-tier-solo--safe" data-mode="unknown" role="status">
      <div className="free-tier-solo__safe-card">
        <span className="free-tier-solo__shield-wrap" aria-hidden>
          <ShieldCheck className="free-tier-solo__shield" strokeWidth={2.2} />
        </span>
        <p className="free-tier-solo__kicker">{verified ? "VLUE 인증 번호" : "미확인 번호"}</p>
        <p className="free-tier-solo__phone">{phoneLabel}</p>
        <p className="free-tier-solo__hint">기본 안심 쇼케이스 · 개인 SNS·사진은 숨겨집니다</p>
      </div>
    </div>
  );
}
