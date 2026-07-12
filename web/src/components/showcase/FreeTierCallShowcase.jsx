import { ShieldCheck } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { normalizeLetteringCard } from "../../lib/letteringCardNormalize.js";
import { CALL_STATES } from "../../lib/showcase/tentShowcaseTypes.js";
import TentShowcaseOverlay from "./TentShowcaseOverlay.jsx";
import ShowcaseIdentityCorner from "./ShowcaseIdentityCorner.jsx";
import "../../styles/tent-showcase.css";

/**
 * 무료 회원 단독 쇼케이스 (디지털 인증명함 없음) — 1장
 * - known: 천막 프로필에 이름·번호가 이미 있으므로 좌측 하단 중복 카드 없음
 * - unknown(일반): 쇼케이스 1장 + 좌측 하단 전화번호만
 */
export default function FreeTierCallShowcase({
  isKnownContact = false,
  card: cardRaw,
  phone = "",
  verified = true,
  /** 쇼케이스 꺼짐 — 「1장·기본안심」 문구 없이 번호+인증만 */
  showcaseOffPreview = false
}) {
  const card = normalizeLetteringCard(cardRaw || {});
  const phoneLabel = formatLetteringPhoneDisplay(phone || card.phone || "") || "—";
  const displayName = String(card.name || card.displayName || "").trim();
  const organization = String(card.organization || "").trim();
  const showName =
    !showcaseOffPreview &&
    card.showcaseStyle?.showBroadcastName !== false &&
    !card.hideBroadcastName;

  if (isKnownContact && !showcaseOffPreview) {
    return (
      <div className="free-tier-solo free-tier-solo--profile free-tier-solo--tent" data-mode="known">
        <TentShowcaseOverlay
          previewMode
          forceInteractive
          callState={CALL_STATES.CONNECTED}
          verified={verified}
          membershipTier="free"
          peerPhone={phone || card.phone || ""}
          displayName={showName ? displayName : ""}
          organization={showName ? organization : ""}
          card={card}
          showcaseStyle={card.showcaseStyle || null}
          privacyMode="public"
          className="tent-showcase--fill free-tier-solo__tent"
        />
      </div>
    );
  }

  return (
    <div
      className={`free-tier-solo free-tier-solo--sheet${showcaseOffPreview ? " free-tier-solo--showcase-off" : ""}`}
      data-mode={showcaseOffPreview ? "off" : "unknown"}
      role="status"
    >
      <div className="free-tier-solo__sheet-stage" aria-hidden>
        <div className="free-tier-solo__sheet-glow" />
        <span className="free-tier-solo__sheet-mark">
          <ShieldCheck className="free-tier-solo__sheet-shield" strokeWidth={2.2} />
        </span>
      </div>
      <ShowcaseIdentityCorner
        phone={phone || card.phone || phoneLabel}
        verified={verified}
        showName={false}
        kicker={verified ? "VLUE 인증 번호" : "미확인 번호"}
        hint=""
      />
    </div>
  );
}
