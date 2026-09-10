import { blockLetteringPhone } from "./letteringPhoneBlock.js";
import { postLetteringReport, postLetteringTip } from "./letteringApi.js";
import { normalizePhoneDigits } from "./letteringPhoneMatch.js";

export const LETTERING_REPORTS_KEY = "vlue_lettering_reports";

export const LETTERING_REPORT_REASONS = [
  { id: "impersonation_vishing", label: "사칭 및 보이스피싱" },
  { id: "illegal_gambling", label: "불법 도박 및 사행성" },
  { id: "illegal_loan_fraud", label: "불법 대출 및 금융 사기" },
  { id: "smishing_malware", label: "스미싱 및 악성 링크" },
  { id: "adult_illegal_ads", label: "성인물 및 불법 광고" },
  { id: "real_estate_ads", label: "부동산 및 분양 광고" },
  { id: "other_commercial_ads", label: "기타 영리 목적 광고" }
];

/** 경찰청 피싱안심SOS 제보 (외부) */
export const PHISHING_SOS_REPORT_URL =
  "https://www.counterscam112.go.kr/report/reportTerms.do?type=vop";

export const LETTERING_TIP_REASON_ID = "community_tip";

export function readLetteringReports() {
  try {
    const raw = localStorage.getItem(LETTERING_REPORTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLetteringReports(items) {
  try {
    localStorage.setItem(LETTERING_REPORTS_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("vlue-lettering-reports-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * 신고 접수 + 신고 내용 저장 + 자동 차단(앱 목록 + 네이티브 브리지)
 */
export async function submitLetteringReport({ phone, reasonId, detail = "", card = null, verified = true }) {
  const digits = normalizePhoneDigits(phone);
  const reason =
    LETTERING_REPORT_REASONS.find((r) => r.id === reasonId) || LETTERING_REPORT_REASONS[0];

  let server = { ok: false };
  try {
    server = await postLetteringReport({ phone: digits || phone, reasonId: reason.id, detail, card, verified });
  } catch {
    /* local fallback */
  }

  const report = {
    id: `lr-${Date.now()}`,
    phone: digits,
    phoneDisplay: String(phone || "").trim(),
    reasonId: reason.id,
    reasonLabel: reason.label,
    detail: String(detail || "").trim(),
    verified: Boolean(verified),
    cardSnapshot: card
      ? {
          name: card.name || "",
          title: card.title || "",
          organization: card.organization || "",
          phone: card.phone || "",
          feedId: card.feedId || ""
        }
      : null,
    createdAt: new Date().toISOString(),
    autoBlocked: true,
    source: "report"
  };

  const reports = [report, ...readLetteringReports()];
  writeLetteringReports(reports);

  const blockResult = blockLetteringPhone(digits || phone, {
    reportId: server.reportId || report.id,
    reason: reason.label,
    serverSynced: server.ok
  });

  return { report, blockResult, server };
}

/**
 * 발신자 제보 — 한 줄 라벨 DB 저장(차단 없음).
 */
export async function submitLetteringTip({
  phone,
  label = "",
  displayName = "",
  organization = "",
  note = ""
}) {
  const digits = normalizePhoneDigits(phone);
  const tipLabel = String(label || displayName || organization || note || "")
    .trim()
    .replace(/\s+/g, " ");

  let server = { ok: false };
  try {
    server = await postLetteringTip({
      phone: digits || phone,
      label: tipLabel
    });
  } catch {
    /* local fallback */
  }

  const tip = {
    id: server.tipId || server.reportId || `lt-${Date.now()}`,
    phone: digits,
    phoneDisplay: String(phone || "").trim(),
    reasonId: LETTERING_TIP_REASON_ID,
    reasonLabel: tipLabel || "발신자 제보",
    detail: "",
    label: tipLabel,
    verified: false,
    cardSnapshot: { kind: "tip", label: tipLabel },
    createdAt: new Date().toISOString(),
    autoBlocked: false,
    source: "community"
  };

  writeLetteringReports([tip, ...readLetteringReports()]);
  return { tip, server, summary: server.summary || null };
}
