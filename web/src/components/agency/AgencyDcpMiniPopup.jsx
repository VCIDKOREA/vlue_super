import { createPortal } from "react-dom";
import CompanionMiniCase from "../call/CompanionMiniCase.jsx";
import AgencyDcpCard from "./AgencyDcpCard.jsx";
import AdMobBannerSlot from "../ads/AdMobBannerSlot.jsx";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import "../../styles/showcase-call-glass.css";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

/**
 * 국가기관 DCP — VLUÉ 미니케이스처럼 가장자리로 빼 두고 드래그 이동
 * 띠배너는 카드 상자 외부 하단에 분리 부착
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
  return createPortal(
    <div className="agency-dcp-mini-layer" data-dcp-popup={variant}>
      <CompanionMiniCase
        brandText={expired ? "VLUÉ · 인증 만료" : abnormal ? "VLUÉ DCP · 비정상" : "VLUÉ DCP"}
        expandOnTap={false}
        locked={abnormal || expired}
        customBody={
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
                slotId="dcp_popup_banner"
                heightPx={50}
                unitId={ADMOB_TEST.BANNER}
                label="안심 팝업 배너"
                enabled={open}
                preferredSize="BANNER"
                className="w-full overflow-hidden rounded-xl"
              />
            </div>
          </div>
        }
      />
    </div>,
    document.body
  );
}
