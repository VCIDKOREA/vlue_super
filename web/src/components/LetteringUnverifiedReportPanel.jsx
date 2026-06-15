import { useMemo } from "react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import {
  formatLetteringReportDate,
  getLetteringReportsForPhone
} from "../lib/letteringPhoneReports.js";
import { VLUE_UNVERIFIED_CAUTION } from "../lib/vlueDigitalCardUi.js";

function ReportEntry({ entry }) {
  const dateLabel = formatLetteringReportDate(entry.createdAt);
  const isCommunity = entry.source === "community";

  return (
    <li className="lettering-report-entry">
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

/** 미인증 펼침 — 이 건수 이상이면 신고 목록만 내부 스크롤 */
export const LETTERING_UNVERIFIED_REPORT_SCROLL_MIN = 3;

/** 미인증 번호 펼침 — 신고·제보 이력 + 주의 문구 */
export default function LetteringUnverifiedReportPanel({
  incomingNumber = "",
  reportHistory = [],
  className = ""
}) {
  const incoming = String(incomingNumber || "").trim();
  const reports = useMemo(
    () => getLetteringReportsForPhone(incoming, { extra: reportHistory }),
    [incoming, reportHistory]
  );

  return (
    <div className={`lettering-unverified-panel ${className}`.trim()}>
      <p className="lettering-unverified-alert">
        {"VLUE에 등록되지 않은 발신 번호입니다. 아래는 커뮤니티·VLUE 신고·제보 이력입니다."}
      </p>

      {incoming ? (
        <p className="lettering-unverified-incoming">
          <span className="lettering-unverified-incoming__label">{"발신번호"}</span>
          <span className="lettering-unverified-incoming__value">{formatLetteringPhoneDisplay(incoming)}</span>
        </p>
      ) : null}

      <div className="lettering-unverified-reports">
        <p className="lettering-unverified-reports__title">
          {reports.length
            ? `신고·제보 이력 ${reports.length}건`
            : "신고·제보 이력 없음"}
        </p>

        {reports.length ? (
          <div
            className={`lettering-unverified-reports__list-scroll${
              reports.length >= LETTERING_UNVERIFIED_REPORT_SCROLL_MIN
                ? " lettering-unverified-reports__list-scroll--bounded"
                : ""
            }`}
          >
            <ul className="lettering-unverified-reports__list">
              {reports.map((entry) => (
                <ReportEntry key={entry.id || `${entry.reasonLabel}-${entry.createdAt}`} entry={entry} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="lettering-unverified-reports__empty">
            {"아직 등록된 신고·제보가 없습니다. 의심스러운 통화는 신고해 주세요."}
          </p>
        )}
      </div>

      <p className="lettering-caution lettering-caution--unverified lettering-caution--unverified-strong">
        {VLUE_UNVERIFIED_CAUTION}
      </p>
    </div>
  );
}
