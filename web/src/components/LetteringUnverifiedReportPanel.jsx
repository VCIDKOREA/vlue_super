import { useEffect, useMemo, useState } from "react";
import { fetchLetteringTipSummary } from "../lib/letteringApi.js";
import {
  getLetteringReportsForPhone,
  summarizeLetteringTipsFromEntries
} from "../lib/letteringPhoneReports.js";
import { submitLetteringTip } from "../lib/letteringReport.js";
import { VLUE_UNVERIFIED_CAUTION } from "../lib/vlueDigitalCardUi.js";

const EMPTY_SUMMARY = {
  tipCount: 0,
  topLabel: "",
  topCount: 0,
  labels: [],
  analysis: { status: "none", message: "분석결과는 없습니다" }
};

/**
 * 미인증·모르는 번호 펼침
 * — DB 제보 송출 + 한 줄 제보 + 신고 + 분석 자리
 */
export default function LetteringUnverifiedReportPanel({
  incomingNumber = "",
  reportHistory = [],
  tipSummary: tipSummaryProp = null,
  onReport,
  onTipSubmit,
  onTipSummaryChange,
  className = ""
}) {
  const incoming = String(incomingNumber || "").trim();
  const localEntries = useMemo(
    () => getLetteringReportsForPhone(incoming, { extra: reportHistory }),
    [incoming, reportHistory]
  );
  const localSummary = useMemo(
    () => summarizeLetteringTipsFromEntries(localEntries),
    [localEntries]
  );

  const [remoteSummary, setRemoteSummary] = useState(null);
  const [label, setLabel] = useState("");
  const [composerMode, setComposerMode] = useState("hidden"); // hidden | new | edit
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [reportTick, setReportTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onReportsChanged = () => setReportTick((n) => n + 1);
    window.addEventListener("vlue-lettering-reports-changed", onReportsChanged);
    return () => window.removeEventListener("vlue-lettering-reports-changed", onReportsChanged);
  }, []);

  useEffect(() => {
    if (!incoming) {
      setRemoteSummary(null);
      return undefined;
    }
    let cancelled = false;
    fetchLetteringTipSummary(incoming).then((data) => {
      if (cancelled || !data?.ok) return;
      setRemoteSummary(data);
      onTipSummaryChange?.(data);
    });
    return () => {
      cancelled = true;
    };
    // onTipSummaryChange intentionally omitted — parent setState is stable; avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, reportTick]);

  const summary = useMemo(() => {
    if (tipSummaryProp?.topLabel || tipSummaryProp?.tipCount) return tipSummaryProp;
    if (remoteSummary?.tipCount > 0 || remoteSummary?.topLabel) return remoteSummary;
    if (localSummary.tipCount > 0) return localSummary;
    return remoteSummary || localSummary || EMPTY_SUMMARY;
  }, [tipSummaryProp, remoteSummary, localSummary]);

  const hasTips = Boolean(summary.topLabel && summary.tipCount > 0);
  const showComposer = !hasTips || composerMode === "new" || composerMode === "edit";
  const canSubmitTip = Boolean(label.trim());

  useEffect(() => {
    if (composerMode === "edit" && summary.topLabel) {
      setLabel(summary.topLabel);
    }
  }, [composerMode, summary.topLabel]);

  async function submitLabel(nextLabel) {
    const tipLabel = String(nextLabel || "").trim().replace(/\s+/g, " ");
    if (busy || !tipLabel) return;
    setBusy(true);
    setError("");
    setJustSaved(false);
    try {
      const result = onTipSubmit
        ? await onTipSubmit({ label: tipLabel })
        : await submitLetteringTip({ phone: incoming, label: tipLabel });

      const server = result?.server;
      if (server && server.ok === false) {
        setError(String(server.error || "").trim() || "로그인 후 제보할 수 있습니다.");
        return;
      }

      if (result?.summary || server?.summary) {
        const next = result?.summary || server.summary;
        setRemoteSummary(next);
        onTipSummaryChange?.(next);
      } else {
        setReportTick((n) => n + 1);
      }

      setLabel("");
      setComposerMode("hidden");
      setJustSaved(true);
    } catch (err) {
      setError(err?.message || "제보에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFormSubmit(e) {
    e?.preventDefault?.();
    await submitLabel(label);
  }

  function openNew() {
    setLabel("");
    setComposerMode("new");
    setJustSaved(false);
    setError("");
  }

  function openEdit() {
    setLabel(summary.topLabel || "");
    setComposerMode("edit");
    setJustSaved(false);
    setError("");
  }

  return (
    <div className={`lettering-unverified-panel ${className}`.trim()}>
      <header className="lettering-unverified-hero">
        <p className="lettering-unverified-hero__badge">미등록 번호</p>
        <p className="lettering-unverified-hero__hint">{VLUE_UNVERIFIED_CAUTION}</p>
      </header>

      {hasTips ? (
        <section className="lettering-unverified-broadcast" aria-label="VLUE 제보 송출">
          <p className="lettering-unverified-broadcast__label">{summary.topLabel}</p>
          <p className="lettering-unverified-broadcast__meta">
            {`제보 ${summary.topCount || summary.tipCount}회`}
            {summary.tipCount > (summary.topCount || 0)
              ? ` · 전체 ${summary.tipCount}건`
              : ""}
          </p>

          <button
            type="button"
            className="lettering-unverified-btn lettering-unverified-btn--tip lettering-unverified-btn--block"
            disabled={busy}
            onClick={() => submitLabel(summary.topLabel)}
          >
            {busy ? "저장 중…" : "같은 내용 제보하기"}
          </button>

          <div className="lettering-unverified-broadcast__links">
            <button type="button" className="lettering-unverified-link" onClick={openNew} disabled={busy}>
              신규 제보
            </button>
            <span className="lettering-unverified-broadcast__dot" aria-hidden>
              ·
            </span>
            <button type="button" className="lettering-unverified-link" onClick={openEdit} disabled={busy}>
              제보 수정
            </button>
          </div>
        </section>
      ) : null}

      {showComposer ? (
        <form className="lettering-unverified-tip" onSubmit={handleFormSubmit}>
          <p className="lettering-unverified-tip__title">
            {hasTips ? (composerMode === "edit" ? "제보 수정" : "신규 제보") : "발신자 제보"}
          </p>
          <p className="lettering-unverified-tip__sub">예: 삼성카드</p>

          <div className="lettering-unverified-field">
            <input
              className="lettering-unverified-field__input"
              type="text"
              name="tipLabel"
              aria-label="제보 내용"
              autoComplete="off"
              maxLength={40}
              placeholder="예: 삼성카드"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={busy}
            />
          </div>

          {error ? <p className="lettering-unverified-tip__error">{error}</p> : null}
          {justSaved ? (
            <p className="lettering-unverified-tip__ok" role="status">
              제보가 반영되었습니다
            </p>
          ) : null}

          <div className="lettering-unverified-actions">
            <button
              type="submit"
              className="lettering-unverified-btn lettering-unverified-btn--tip"
              disabled={busy || !canSubmitTip}
            >
              {busy ? "저장 중…" : "제보하기"}
            </button>
            <button
              type="button"
              className="lettering-unverified-btn lettering-unverified-btn--report"
              onClick={() => onReport?.()}
              disabled={busy}
            >
              신고
            </button>
          </div>

          {hasTips ? (
            <button
              type="button"
              className="lettering-unverified-link lettering-unverified-link--center"
              onClick={() => {
                setComposerMode("hidden");
                setError("");
              }}
              disabled={busy}
            >
              닫기
            </button>
          ) : null}
        </form>
      ) : (
        <div className="lettering-unverified-actions lettering-unverified-actions--solo">
          <button
            type="button"
            className="lettering-unverified-btn lettering-unverified-btn--report lettering-unverified-btn--block"
            onClick={() => onReport?.()}
            disabled={busy}
          >
            신고
          </button>
        </div>
      )}

      <section className="lettering-unverified-analysis" aria-label="VLUE 분석결과">
        <p className="lettering-unverified-analysis__title">VLUE 분석결과</p>
        <p className="lettering-unverified-analysis__body">
          {summary.analysis?.message || "분석결과는 없습니다"}
        </p>
      </section>
    </div>
  );
}
