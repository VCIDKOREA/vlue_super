import { useEffect, useMemo, useState } from "react";
import IOS_CALL_SCREEN from "../assets/ios-call-screen-reference.png?url";
import SAMSUNG_CALL_SCREEN from "../assets/samsung-call-screen-reference.png?url";
import {
  buildUserLetteringCard,
  withLetteringBizcardPreviewFallback
} from "../lib/letteringBizcardProfile.js";
import { useDraggableY } from "../hooks/useDraggableY.js";
import { saveLetteringCardToWallet } from "../lib/letteringCardWallet.js";
import { getLetteringLayout, letteringLayoutStyle } from "../lib/letteringLayout.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { buildLetteringCertUniversalLink } from "../lib/letteringOpenVlueApp.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { DEMO_UNVERIFIED_REPORT_HISTORY } from "../lib/letteringPhoneReports.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";

/**
 * 사용자 제공 통화 화면 스크린샷 위에 VLUE 빅푸시만 오버레이 (이미지 자체는 수정하지 않음)
 */
export default function LetteringCallScreenPreview({
  verified,
  membershipTier = "premium",
  callPhase,
  expanded,
  setExpanded,
  showToast,
  isRecording = false,
  platform = "android",
  callDurationSec = 8,
  recordingDurationSec = 8
}) {
  const onCall = callPhase === "active";
  const layout = getLetteringLayout(platform);
  const screenSrc = platform === "ios" ? IOS_CALL_SCREEN : SAMSUNG_CALL_SCREEN;
  const drag = useDraggableY({
    initialY: layout.dragInitialY,
    minY: 0,
    maxY: layout.dragMaxY
  });

  useEffect(() => {
    drag.setOffsetY(layout.dragInitialY);
  }, [platform, layout.dragInitialY]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ phone: "", cardName: "", card: null, verified: true });

  const dragHandleProps = useMemo(
    () => ({
      onPointerDown: drag.onPointerDown,
      onPointerMove: drag.onPointerMove,
      onPointerUp: drag.onPointerUp,
      onPointerCancel: drag.onPointerUp
    }),
    [drag.onPointerDown, drag.onPointerMove, drag.onPointerUp]
  );

  const previewCard = verified
    ? withLetteringBizcardPreviewFallback(
        buildUserLetteringCard({ membershipTier: membershipTier || "premium" })
      )
    : {
        name: "",
        phone: "",
        logoUrl: "",
        photoUrl: "",
        title: "",
        organization: ""
      };

  const incomingNumber = verified ? "010-1234-5678" : "010-9876-5432";
  const isFreePreview = verified && !isPaidLetteringTier(membershipTier);

  const openReport = ({ card, incomingNumber: phone, verified: isVerified }) => {
    setReportTarget({
      phone: phone || incomingNumber,
      cardName: card?.name || "",
      card: card || null,
      verified: isVerified
    });
    setReportOpen(true);
  };

  const handleSaveCard = ({ card }) => {
    const result = saveLetteringCardToWallet(card);
    if (result.ok) {
      showToast("명함이 지갑에 저장되었습니다");
      window.dispatchEvent(new Event("vlue-card-wallet-changed"));
      return;
    }
    showToast("명함을 저장할 수 없습니다");
  };

  const nativeBlockHint = (blockResult) =>
    blockResult?.native?.ok
      ? "휴대폰 차단 목록에 반영되었습니다."
      : "앱 차단 목록에 등록되었습니다. 휴대폰 설정에서 VLUE 차단 권한을 허용해 주세요.";

  const handleBlockOnly = async () => {
    const blockResult = await blockLetteringPhoneOnly(reportTarget.phone, {
      cardName: reportTarget.cardName
    });
    if (!blockResult.ok) {
      showToast("차단할 번호를 확인할 수 없습니다.");
      return;
    }
    showToast(`차단 완료. ${nativeBlockHint(blockResult)}`);
    setReportOpen(false);
  };

  const handleReportSubmit = async ({ reasonId, detail }) => {
    const { report, blockResult } = await submitLetteringReport({
      phone: reportTarget.phone,
      reasonId,
      detail,
      card: reportTarget.card,
      verified: reportTarget.verified
    });
    showToast(`신고 접수 · 자동 차단 (${report.reasonLabel}). ${nativeBlockHint(blockResult)}`);
    setReportOpen(false);
  };

  return (
    <>
      <div
        className="lettering-call-screen lettering-call-screen--photo relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"
        data-expanded={expanded ? "true" : "false"}
        data-platform={platform}
        data-report-open={reportOpen ? "true" : "false"}
        style={letteringLayoutStyle(platform)}
      >
        <img
          src={screenSrc}
          alt=""
          className="lettering-call-screen__photo pointer-events-none block h-auto w-full select-none"
          draggable={false}
          decoding="async"
        />

        <div className="lettering-call-screen__overlay-stage pointer-events-none absolute inset-0">
          <div
            className="lettering-ongoing-overlay lettering-ongoing-overlay--photo lettering-ongoing-overlay--draggable absolute inset-x-0"
            style={{ transform: `translate3d(0, ${drag.offsetY}px, 0)` }}
          >
            <LetteringIncomingNotification
              className="lettering-ongoing--on-photo"
              verified={verified}
              callPhase={onCall ? "active" : "ringing"}
              platform={platform}
              isRecording={isRecording}
              callDurationSec={callDurationSec}
              recordingDurationSec={recordingDurationSec}
              incomingNumber={incomingNumber}
              savedContactName={isFreePreview ? previewCard.name || "" : ""}
              reportHistory={verified ? [] : DEMO_UNVERIFIED_REPORT_HISTORY}
              dragHandleProps={dragHandleProps}
              expanded={expanded}
              onExpandedChange={setExpanded}
              card={previewCard}
              onOpenFeed={({ result, feedId, feedType }) => {
                if (
                  result?.channel?.startsWith("VlueLettering") ||
                  result?.channel?.startsWith("Android") ||
                  result?.channel?.startsWith("webkit")
                ) {
                  showToast("VLUE 앱 인증정보로 이동합니다");
                  return;
                }
                if (result?.ok) {
                  showToast("VLUE 앱을 엽니다");
                  return;
                }
                showToast(`VLUE 앱을 설치하거나 로그인해 주세요 (${buildLetteringCertUniversalLink({ feedId, feedType })})`);
              }}
              onSaveCard={handleSaveCard}
              onReport={openReport}
            />
          </div>
        </div>

        <LetteringReportSheet
          contained
          open={reportOpen}
          phone={reportTarget.phone}
          cardName={reportTarget.cardName}
          onClose={() => setReportOpen(false)}
          onBlockOnly={handleBlockOnly}
          onSubmit={handleReportSubmit}
        />
      </div>
    </>
  );
}
