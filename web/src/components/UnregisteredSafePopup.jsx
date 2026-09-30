import { useState } from "react";
import { createPortal } from "react-dom";
import AdMobBannerSlot from "./ads/AdMobBannerSlot.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import { AD_SLOT, ADMOB_TEST } from "../lib/ads/adMobUnitIds.js";
import {
  PHISHING_SOS_REPORT_URL,
  submitLetteringReport,
  submitLetteringTip
} from "../lib/letteringReport.js";
import { openExternalHref } from "../lib/showcase/showcaseContactActions.js";
import "./vlue-auth-member-popup.css";

/** 네이티브 `UnregisteredNumberPopup` 카피와 1:1 (CALL_OVERLAY_CONTRACT §3a rule 6) */
export const UNREGISTERED_POPUP_COPY = Object.freeze({
  linePathNormal: "• 발신경로 정상 (VLUE 미등록 번호)",
  lineMoneyCaution: "• 유선상 금전요구는 주의바랍니다.",
  tip: "제보하기",
  report: "신고하기",
  sos: "피싱안심SOS",
  close: "닫기"
});

/**
 * 미등록·모르는 번호 안심팝업 (웹 twin).
 *
 * 통화목록에서 미등록 번호를 탭하면 풀스크린 쇼케이스/신고 패널 대신 이 2줄 팝업을 **즉시** 띄운다.
 * 조회·WebView 로딩 없이 순수 로컬 렌더 — 스피너 없음.
 * [제보하기] 한 줄 제보 · [신고하기] 신고 시트 · [피싱안심SOS] 외부 페이지 — 모두 사용자 명시 액션.
 */
export default function UnregisteredSafePopup({ open = false, phone = "", onClose, onToast }) {
  const [tipOpen, setTipOpen] = useState(false);
  const [tipLabel, setTipLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!open || typeof document === "undefined") return null;

  const close = () => {
    setTipOpen(false);
    setTipLabel("");
    setReportOpen(false);
    onClose?.();
  };

  const submitTip = async (e) => {
    e?.preventDefault?.();
    const label = String(tipLabel || "").trim().replace(/\s+/g, " ");
    if (!label || busy) return;
    setBusy(true);
    try {
      const result = await submitLetteringTip({ phone, label });
      const server = result?.server;
      if (server && server.ok === false) {
        onToast?.(String(server.error || "").trim() || "로그인 후 제보할 수 있습니다.");
        return;
      }
      onToast?.("제보가 반영되었습니다");
      setTipOpen(false);
      setTipLabel("");
    } catch (err) {
      onToast?.(err?.message || "제보에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async ({ reasonId, detail }) => {
    const { report } = await submitLetteringReport({
      phone,
      reasonId,
      detail,
      card: null,
      verified: false
    });
    onToast?.(`신고 접수 · 자동 차단 (${report?.reasonLabel || "완료"})`);
    close();
  };

  return createPortal(
    <div
      className="vlue-auth-member-popup-root"
      role="dialog"
      aria-modal="true"
      aria-label="미등록 번호 안심팝업"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="vlue-auth-member-popup-stack">
        <article className="vlue-auth-member-popup vlue-unregistered-popup">
          <p className="vlue-auth-member-popup__badge">경로 검증 · 정상</p>
          <p className="vlue-auth-member-popup__msg vlue-unregistered-popup__body">
            <span>{UNREGISTERED_POPUP_COPY.linePathNormal}</span>
            <span>{UNREGISTERED_POPUP_COPY.lineMoneyCaution}</span>
          </p>

          {tipOpen ? (
            <form className="vlue-unregistered-popup__tip" onSubmit={submitTip}>
              <input
                className="vlue-unregistered-popup__input"
                type="text"
                name="tipLabel"
                aria-label="제보 내용"
                autoComplete="off"
                maxLength={40}
                placeholder="예: 삼성카드"
                value={tipLabel}
                onChange={(e) => setTipLabel(e.target.value)}
                disabled={busy}
                autoFocus
              />
              <button
                type="submit"
                className="vlue-unregistered-popup__btn vlue-unregistered-popup__btn--tip"
                disabled={busy || !tipLabel.trim()}
              >
                {busy ? "저장 중…" : UNREGISTERED_POPUP_COPY.tip}
              </button>
            </form>
          ) : (
            <div className="vlue-unregistered-popup__row">
              <button
                type="button"
                className="vlue-unregistered-popup__btn vlue-unregistered-popup__btn--tip"
                onClick={() => setTipOpen(true)}
              >
                {UNREGISTERED_POPUP_COPY.tip}
              </button>
              <button
                type="button"
                className="vlue-unregistered-popup__btn vlue-unregistered-popup__btn--report"
                onClick={() => setReportOpen(true)}
              >
                {UNREGISTERED_POPUP_COPY.report}
              </button>
              <button
                type="button"
                className="vlue-unregistered-popup__btn vlue-unregistered-popup__btn--sos"
                onClick={() => openExternalHref(PHISHING_SOS_REPORT_URL)}
              >
                {UNREGISTERED_POPUP_COPY.sos}
              </button>
            </div>
          )}

          <button
            type="button"
            className="vlue-auth-member-popup__ok vlue-unregistered-popup__close"
            onClick={close}
          >
            {UNREGISTERED_POPUP_COPY.close}
          </button>
        </article>
        <div className="vlue-auth-member-popup__ad" aria-label="광고">
          <AdMobBannerSlot
            slotId={`${AD_SLOT.DCC_BOTTOM || "dcc_bottom"}_unregistered_popup`}
            heightPx={50}
            unitId={ADMOB_TEST.BANNER}
            label="안심 팝업 배너"
            enabled={open}
            preferredSize="BANNER"
            className="w-full overflow-hidden rounded-xl"
          />
        </div>
      </div>

      <LetteringReportSheet
        contained={false}
        open={reportOpen}
        phone={phone}
        cardName=""
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />
    </div>,
    document.body
  );
}
