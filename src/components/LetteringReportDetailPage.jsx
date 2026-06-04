import { useCallback, useEffect, useState } from "react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import {
  fetchLetteringPhoneReportPage,
  formatLetteringReportDate
} from "../lib/letteringPhoneReports.js";
import { parseLetteringReportDetailParams } from "../lib/letteringReportDetailUrl.js";
import {
  VLUE_CARD_CAUTION,
  VLUE_UNVERIFIED_CAUTION,
  VLUE_UNVERIFIED_REPORT_DISCLAIMER
} from "../lib/vlueDigitalCardUi.js";
import ScreenBackHeader from "./common/ScreenBackHeader";

const PAGE_SIZE = 20;

function ReportRow({ entry }) {
  const dateLabel = formatLetteringReportDate(entry.createdAt);
  const isCommunity = entry.source === "community";

  return (
    <li className="lettering-report-detail-row">
      <div className="lettering-report-entry__head">
        <span className="lettering-report-entry__reason">{entry.reasonLabel}</span>
        {dateLabel ? <time className="lettering-report-entry__date">{dateLabel}</time> : null}
      </div>
      {entry.detail ? <p className="lettering-report-entry__detail">{entry.detail}</p> : null}
      {isCommunity ? (
        <span className="lettering-report-entry__tag">{"커뮤니티 제보"}</span>
      ) : (
        <span className="lettering-report-entry__tag lettering-report-entry__tag--report">{"VLUE 신고"}</span>
      )}
    </li>
  );
}

/** 웹 — 번호별 신고·제보 상세 내역 (#lettering-reports?phone=) */
export default function LetteringReportDetailPage() {
  const [{ phone }, setParams] = useState(() => parseLetteringReportDetailParams());
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [source, setSource] = useState("server");

  useEffect(() => {
    const onHash = () => setParams(parseLetteringReportDetailParams());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const loadPage = useCallback(
    async (nextOffset, append) => {
      if (!phone) {
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);

      const result = await fetchLetteringPhoneReportPage(phone, {
        limit: PAGE_SIZE,
        offset: nextOffset
      });

      if (result.ok) {
        setTotal(result.total);
        setSource("server");
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setOffset(nextOffset + result.items.length);
      } else if (!append) {
        setSource("local");
        setItems([]);
        setTotal(0);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [phone]
  );

  useEffect(() => {
    setOffset(0);
    loadPage(0, false);
  }, [loadPage]);

  const hasMore = items.length < total;
  const phoneDisplay = formatLetteringPhoneDisplay(phone);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else window.location.hash = "";
  }, []);

  return (
    <div className="lettering-report-detail-page relative min-h-[100dvh] bg-[#050810] text-slate-900">
      <ScreenBackHeader
        sticky={false}
        title="신고·제보 상세"
        onBack={handleBack}
        isDarkMode
        className="border-white/10 bg-[#0b1220]/90"
      />
      <div className="lettering-report-detail-page__hero pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-950/50 to-transparent" aria-hidden />

      <div className="relative z-[1] mx-auto max-w-[480px] px-4 pb-10 pt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/80">VLUE Lettering</p>
        <h1 className="mt-2 text-[20px] font-black text-white">{"신고·제보 상세 내역"}</h1>
        <p className="mt-2 text-[12px] font-semibold text-white/55">
          {"웹에 저장된 커뮤니티·VLUE 신고 이력입니다."}
        </p>

        <div className="lettering-report-detail-card mt-6">
          <p className="lettering-report-detail-card__label">{"조회 번호"}</p>
          <p className="lettering-report-detail-card__phone">{phoneDisplay || "—"}</p>
          <p className="lettering-report-detail-card__count">
            {loading ? "불러오는 중…" : `총 ${total}건`}
            {source === "local" && !loading ? " · 서버 연결 실패" : null}
          </p>

          {loading ? (
            <p className="lettering-report-detail-empty">{"이력을 불러오는 중입니다."}</p>
          ) : items.length ? (
            <>
              <ul className="lettering-unverified-reports__list lettering-report-detail-list">
                {items.map((entry) => (
                  <ReportRow key={entry.id || `${entry.createdAt}-${entry.reasonLabel}`} entry={entry} />
                ))}
              </ul>
              {hasMore ? (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadPage(offset, true)}
                  className="lettering-report-detail-more"
                >
                  {loadingMore ? "불러오는 중…" : `더 보기 (${items.length}/${total})`}
                </button>
              ) : null}
            </>
          ) : (
            <p className="lettering-report-detail-empty">
              {"등록된 신고·제보 이력이 없습니다."}
            </p>
          )}

          <div className="lettering-report-detail-cautions">
            <p className="lettering-caution lettering-caution--unverified lettering-caution--unverified-strong">
              {VLUE_UNVERIFIED_CAUTION}
            </p>
            <p className="lettering-unverified-footer-note">{VLUE_UNVERIFIED_REPORT_DISCLAIMER}</p>
            <p className="lettering-caution lettering-caution--unverified">{VLUE_CARD_CAUTION}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
