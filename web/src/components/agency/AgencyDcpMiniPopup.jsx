import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import CompanionMiniCase from "../call/CompanionMiniCase.jsx";
import AgencyDcpCard from "./AgencyDcpCard.jsx";
import AdMobBannerSlot from "../ads/AdMobBannerSlot.jsx";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import "../../styles/showcase-call-glass.css";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

/** pointerUp → flushSync 오픈 직후 touch→mouse mousedown 이 백드롭을 닫는 고스트 방지 */
const DISMISS_GUARD_MS = 450;

/**
 * 국가기관 DCP / 안심케어 팝업
 * - contactSafeCare: 중앙 모달 — 한 번 연 뒤 DOM 유지(AdMob·카드 언마운트 플리커 방지)
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
  const everOpenedRef = useRef(false);
  const openedAtRef = useRef(0);
  if (open) everOpenedRef.current = true;

  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  if (typeof document === "undefined") return null;

  const variant = expired ? "expired" : abnormal ? "abnormal" : "normal";
  const cardEl = (
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
  );
  const adEl = (
    <div className="agency-dcp-popup-stack__ad" aria-label="광고">
      <AdMobBannerSlot
        slotId={contactSafeCare ? "contact_safe_popup_banner" : "dcp_popup_banner"}
        heightPx={50}
        unitId={ADMOB_TEST.BANNER}
        label="안심 팝업 배너"
        enabled={Boolean(open)}
        preferredSize="BANNER"
        className="w-full overflow-hidden rounded-xl"
      />
    </div>
  );

  const onBackdropDismiss = (e) => {
    if (!open) return;
    if (e.target !== e.currentTarget) return;
    /* 통화목록 pointerUp 직후 호환 mousedown 이 백드롭을 닫던 경로 */
    if (contactSafeCare && Date.now() - openedAtRef.current < DISMISS_GUARD_MS) return;
    onClose?.();
  };

  if (contactSafeCare) {
    if (!everOpenedRef.current && !open) return null;
    return createPortal(
      <div
        className={`agency-dcp-center-layer${open ? "" : " is-hidden"}`}
        data-dcp-popup={variant}
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-hidden={open ? undefined : "true"}
        onMouseDown={onBackdropDismiss}
        onClick={onBackdropDismiss}
      >
        <div className="agency-dcp-center-layer__stack">
          <div className="agency-dcp-center-shell">{cardEl}</div>
          {adEl}
        </div>
      </div>,
      document.body
    );
  }

  if (!open) return null;

  const stack = (
    <div className="agency-dcp-popup-stack">
      {cardEl}
      {adEl}
    </div>
  );

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
