import { createPortal } from "react-dom";
import CompanionMiniCase from "../call/CompanionMiniCase.jsx";
import AgencyDcpCard from "./AgencyDcpCard.jsx";
import AdMobBannerSlot from "../ads/AdMobBannerSlot.jsx";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import "../../styles/showcase-call-glass.css";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

/**
 * 국가기관 DCP / 안심케어 팝업
 * - contactSafeCare: 중앙 모달(인증회원 팝업과 동일) — MiniCase peek 시 띠배너만 보이는 버그 방지
 * - 그 외(라이브 DCP): 가장자리 MiniCase + 외부 하단 띠배너
 */
export default function AgencyDcpMiniPopup({
  open = false,
  card = {},
  incomingNumber = "",
  abnormal = false,
  expired = false,
  warning = "",
  contactSafeCare = false,
  onClose,
  onShareShowcase
}) {
  if (!open || typeof document === "undefined") return null;
  const variant = expired ? "expired" : abnormal ? "abnormal" : "normal";
  const stack = (
    <div className="agency-dcp-popup-stack">
      <AgencyDcpCard
        card={card}
        incomingNumber={incomingNumber}
        compact
        variant={variant}
        warning={warning || (expired ? "" : DEFAULT_WARNING)}
        contactSafeCare={contactSafeCare}
        hideBanner
        onClose={onClose}
        onShareShowcase={onShareShowcase}
      />
      <div className="agency-dcp-popup-stack__ad" aria-label="광고">
        <AdMobBannerSlot
          slotId={contactSafeCare ? "contact_safe_popup_banner" : "dcp_popup_banner"}
          heightPx={50}
          unitId={ADMOB_TEST.BANNER}
          label="안심 팝업 배너"
          enabled={open}
          preferredSize="BANNER"
          className="w-full overflow-hidden rounded-xl"
        />
      </div>
    </div>
  );

  if (contactSafeCare) {
    return createPortal(
      <div
        className="agency-dcp-center-layer"
        data-dcp-popup={variant}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="agency-dcp-center-layer__stack">{stack}</div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="agency-dcp-mini-layer" data-dcp-popup={variant}>
      <CompanionMiniCase
        brandText={expired ? "VLUÉ · 인증 만료" : abnormal ? "VLUÉ DCP · 비정상" : "VLUÉ DCP"}
        expandOnTap={false}
        locked={abnormal || expired}
        customBody={stack}
      />
    </div>,
    document.body
  );
}
