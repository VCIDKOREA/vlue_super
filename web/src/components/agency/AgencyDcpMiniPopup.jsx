import { createPortal } from "react-dom";
import CompanionMiniCase from "../call/CompanionMiniCase.jsx";
import AgencyDcpCard from "./AgencyDcpCard.jsx";
import "../../styles/showcase-call-glass.css";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

/**
 * 국가기관 DCP — VLUE 미니케이스처럼 가장자리로 빼 두고 드래그 이동
 */
export default function AgencyDcpMiniPopup({
  open = false,
  card = {},
  incomingNumber = "",
  abnormal = false,
  warning = "",
  onClose
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="agency-dcp-mini-layer" data-dcp-popup={abnormal ? "abnormal" : "normal"}>
      <CompanionMiniCase
        brandText={abnormal ? "VLUE DCP · 비정상" : "VLUE DCP"}
        hideExpand
        locked={abnormal}
        customBody={
          <AgencyDcpCard
            card={card}
            incomingNumber={incomingNumber}
            compact
            variant={abnormal ? "abnormal" : "normal"}
            warning={warning || DEFAULT_WARNING}
            onClose={onClose}
          />
        }
      />
    </div>,
    document.body
  );
}
