import { apiUrl } from "./apiBase.js";
import {
  readLetteringReports,
  LETTERING_REPORT_REASONS,
  LETTERING_TIP_REASON_ID
} from "./letteringReport.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { LETTERING_REPORT_OVERLAY_PREVIEW } from "./letteringReportDetailUrl.js";

export { LETTERING_REPORT_OVERLAY_PREVIEW };

const REASON_LABEL_BY_ID = Object.fromEntries(LETTERING_REPORT_REASONS.map((r) => [r.id, r.label]));
REASON_LABEL_BY_ID[LETTERING_TIP_REASON_ID] = "발신자 제보";

/** 미인증 번호 펼침 — 신고·제보 이력 항목 정규화 */
export function normalizeLetteringReportEntry(raw = {}) {
  const reasonId = String(raw.reasonId || "").trim();
  const isTip = reasonId === LETTERING_TIP_REASON_ID || raw.source === "community";
  const snap = raw.cardSnapshot && typeof raw.cardSnapshot === "object" ? raw.cardSnapshot : null;
  const tipLabel = String(
    raw.label ||
      snap?.label ||
      snap?.displayName ||
      snap?.name ||
      snap?.organization ||
      snap?.note ||
      ""
  ).trim();
  return {
    id: String(raw.id || raw.reportId || raw.tipId || "").trim(),
    reasonId,
    reasonLabel:
      String(raw.reasonLabel || raw.reason || "").trim() ||
      tipLabel ||
      REASON_LABEL_BY_ID[reasonId] ||
      (isTip ? "발신자 제보" : "기타"),
    detail: String(raw.detail || raw.summary || raw.content || "").trim(),
    label: tipLabel || (isTip ? String(raw.reasonLabel || "").trim() : ""),
    createdAt: String(raw.createdAt || raw.reportedAt || "").trim(),
    source: isTip ? "community" : "report"
  };
}

/** 로컬·미리보기용 제보 집계 */
export function summarizeLetteringTipsFromEntries(entries = []) {
  const counts = new Map();
  for (const raw of entries) {
    const entry = normalizeLetteringReportEntry(raw);
    if (entry.source !== "community") continue;
    const label = String(entry.label || entry.reasonLabel || "").trim();
    if (!label || label === "발신자 제보") continue;
    const key = label.replace(/\s+/g, " ").toLowerCase();
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { label, count: 1 });
  }
  const labels = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  const top = labels[0] || null;
  const tipCount = entries.filter((e) => normalizeLetteringReportEntry(e).source === "community").length;
  return {
    tipCount,
    topLabel: top?.label || "",
    topCount: top?.count || 0,
    labels,
    analysis: { status: "none", message: "분석결과는 없습니다" }
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
    .map((r) =>
      normalizeLetteringReportEntry({
        ...r,
        source:
          r.source === "community" || r.reasonId === LETTERING_TIP_REASON_ID ? "community" : "report"
      })
    );

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

/** 프리뷰·데모용 제보 이력 — 한 줄 라벨 집계 송출 예시 */
export const DEMO_UNVERIFIED_REPORT_HISTORY = [
  {
    id: "demo-tip-1",
    reasonId: "community_tip",
    reasonLabel: "삼성카드",
    label: "삼성카드",
    detail: "",
    createdAt: "2026-05-08T14:22:00.000Z",
    source: "community",
    cardSnapshot: { kind: "tip", label: "삼성카드" }
  },
  {
    id: "demo-tip-2",
    reasonId: "community_tip",
    reasonLabel: "삼성카드",
    label: "삼성카드",
    detail: "",
    createdAt: "2026-04-15T09:10:00.000Z",
    source: "community",
    cardSnapshot: { kind: "tip", label: "삼성카드" }
  },
  {
    id: "demo-tip-3",
    reasonId: "community_tip",
    reasonLabel: "삼성카드",
    label: "삼성카드",
    detail: "",
    createdAt: "2026-03-20T11:00:00.000Z",
    source: "community",
    cardSnapshot: { kind: "tip", label: "삼성카드" }
  },
  {
    id: "demo-tip-4",
    reasonId: "community_tip",
    reasonLabel: "삼성카드 고객센터",
    label: "삼성카드 고객센터",
    detail: "",
    createdAt: "2026-02-02T08:30:00.000Z",
    source: "community",
    cardSnapshot: { kind: "tip", label: "삼성카드 고객센터" }
  }
];

export function formatReportPhoneHeading(phone) {
  return formatLetteringPhoneDisplay(phone) || "—";
}
