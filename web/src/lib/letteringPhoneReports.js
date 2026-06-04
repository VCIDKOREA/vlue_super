import { apiUrl } from "./apiBase.js";
import { readLetteringReports, LETTERING_REPORT_REASONS } from "./letteringReport.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { LETTERING_REPORT_OVERLAY_PREVIEW } from "./letteringReportDetailUrl.js";

export { LETTERING_REPORT_OVERLAY_PREVIEW };

const REASON_LABEL_BY_ID = Object.fromEntries(LETTERING_REPORT_REASONS.map((r) => [r.id, r.label]));

/** 미인증 번호 펼침 — 신고·제보 이력 항목 정규화 */
export function normalizeLetteringReportEntry(raw = {}) {
  const reasonId = String(raw.reasonId || "").trim();
  return {
    id: String(raw.id || raw.reportId || "").trim(),
    reasonId,
    reasonLabel:
      String(raw.reasonLabel || raw.reason || "").trim() ||
      REASON_LABEL_BY_ID[reasonId] ||
      "기타",
    detail: String(raw.detail || raw.summary || raw.content || "").trim(),
    createdAt: String(raw.createdAt || raw.reportedAt || "").trim(),
    source: raw.source === "community" ? "community" : "report"
  };
}

function mergeReportLists(extra, fromLocal, { limit } = {}) {
  const seen = new Set();
  const merged = [];
  for (const item of [...(Array.isArray(extra) ? extra : []), ...fromLocal]) {
    const normalized = normalizeLetteringReportEntry(item);
    const key = normalized.id || `${normalized.reasonLabel}|${normalized.detail}|${normalized.createdAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }
  merged.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return tb - ta;
  });
  if (typeof limit === "number") return merged.slice(0, limit);
  return merged;
}

/** 로컬 캐시만 (API 실패 시 폴백) */
export function getLetteringReportsForPhoneLocal(phone, { extra = [] } = {}) {
  const digits = normalizePhoneDigits(phone);
  if (!digits && !extra.length) return [];

  const fromLocal = readLetteringReports()
    .filter((r) => !digits || normalizePhoneDigits(r.phone) === digits)
    .map((r) => normalizeLetteringReportEntry({ ...r, source: "report" }));

  return mergeReportLists(extra, fromLocal);
}

/** @deprecated — 전체 목록이 필요하면 fetchLetteringPhoneReportPage 사용 */
export function getLetteringReportsForPhone(phone, { extra = [], limit = 12 } = {}) {
  return getLetteringReportsForPhoneLocal(phone, { extra }).slice(0, limit);
}

/** 서버(웹 DB) 신고·제보 이력 페이지 조회 */
export async function fetchLetteringPhoneReportPage(phone, { limit = 20, offset = 0 } = {}) {
  const raw = String(phone || "").trim();
  const q = encodeURIComponent(raw);
  if (!q) {
    return { ok: false, total: 0, items: [], phoneE164: "", limit, offset };
  }

  try {
    const res = await fetch(
      apiUrl(`/api/lettering/reports/by-phone?number=${q}&limit=${limit}&offset=${offset}`)
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, total: 0, items: [], phoneE164: "", limit, offset };
    }
    return {
      ok: true,
      total: Number(data.total) || 0,
      items: (Array.isArray(data.items) ? data.items : []).map(normalizeLetteringReportEntry),
      phoneE164: data.phoneE164 || "",
      limit: data.limit ?? limit,
      offset: data.offset ?? offset
    };
  } catch {
    return { ok: false, total: 0, items: [], phoneE164: "", limit, offset };
  }
}

/**
 * 오버레이용 요약 — 최신 N건 미리보기 + 전체 건수 (서버 우선)
 */
export async function fetchLetteringPhoneReportSummary(phone, { extra = [] } = {}) {
  const previewLimit = LETTERING_REPORT_OVERLAY_PREVIEW;
  const server = await fetchLetteringPhoneReportPage(phone, { limit: previewLimit, offset: 0 });

  if (server.ok) {
    const localExtra = mergeReportLists(extra, [], {});
    const serverIds = new Set(server.items.map((i) => i.id).filter(Boolean));
    const mergedPreview = [
      ...server.items,
      ...localExtra.filter((i) => !i.id || !serverIds.has(i.id))
    ].slice(0, previewLimit);

    return {
      ok: true,
      total: server.total,
      preview: mergedPreview,
      source: "server"
    };
  }

  const local = getLetteringReportsForPhoneLocal(phone, { extra });
  return {
    ok: false,
    total: local.length,
    preview: local.slice(0, previewLimit),
    source: "local"
  };
}

export function formatLetteringReportDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

/** 프리뷰·데모용 제보 이력 */
export const DEMO_UNVERIFIED_REPORT_HISTORY = [
  {
    id: "demo-1",
    reasonLabel: "사기·피싱",
    detail: "대출·투자 권유, 계좌·인증번호 요구",
    createdAt: "2026-05-08T14:22:00.000Z",
    source: "report"
  },
  {
    id: "demo-2",
    reasonLabel: "스팸·광고",
    detail: "보험·대출 상품 반복 안내 전화",
    createdAt: "2026-04-15T09:10:00.000Z",
    source: "community"
  },
  {
    id: "demo-3",
    reasonLabel: "스팸·광고",
    detail: "야간 시간대 반복 발신",
    createdAt: "2026-03-20T11:00:00.000Z",
    source: "community"
  },
  {
    id: "demo-4",
    reasonLabel: "사기·피싱",
    detail: "택배 미배송 사칭 문자·전화 연계",
    createdAt: "2026-02-02T08:30:00.000Z",
    source: "report"
  }
];

export function formatReportPhoneHeading(phone) {
  return formatLetteringPhoneDisplay(phone) || "—";
}
