import { prisma } from "../../db/client.js";
import { suggestedFixHint } from "./diagnosticsHints.js";

export async function listDiagnosticSessions(opts: {
  feature?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const feature = opts.feature?.trim().toUpperCase() || undefined;
  const status = opts.status?.trim().toUpperCase() || undefined;

  const rows = await prisma.diagnosticSession.findMany({
    where: {
      ...(feature ? { feature } : {}),
      ...(status ? { status } : {}),
      ...(opts.cursor
        ? {
            startedAt: { lt: new Date(opts.cursor) }
          }
        : {})
    },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      feature: true,
      sessionKey: true,
      status: true,
      startedAt: true,
      endedAt: true,
      deviceModel: true,
      androidVersion: true,
      appVersion: true,
      deviceId: true,
      userId: true,
      phoneMasked: true,
      lastStep: true,
      failStep: true,
      failReason: true
    }
  });

  return {
    sessions: rows.map((r) => ({
      ...r,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      suggestedFixHint: suggestedFixHint(r.feature, r.failStep)
    })),
    nextCursor: rows.length ? rows[rows.length - 1]!.startedAt.toISOString() : null
  };
}

export async function getDiagnosticSessionDetail(id: string) {
  const session = await prisma.diagnosticSession.findUnique({
    where: { id },
    include: {
      events: { orderBy: [{ elapsedMs: "asc" }, { seq: "asc" }] }
    }
  });
  if (!session) return null;

  const lastOkStep = session.events
    .filter((e) => e.ok === true)
    .reduce((m, e) => Math.max(m, e.seq), 0);

  const events = session.events.map((e) => {
    const payload =
      e.payloadJson && typeof e.payloadJson === "object" && !Array.isArray(e.payloadJson)
        ? (e.payloadJson as Record<string, unknown>)
        : {};
    return {
      id: e.id,
      seq: e.seq,
      code: e.code,
      label: e.label,
      ok: e.ok,
      timestamp: e.timestamp.toISOString(),
      elapsedMs: e.elapsedMs,
      deltaFromPrevMs:
        typeof payload.deltaFromPrevMs === "number"
          ? payload.deltaFromPrevMs
          : typeof payload.delta === "number"
            ? payload.delta
            : null,
      baseTimeNanos: typeof payload.baseTimeNanos === "number" ? payload.baseTimeNanos : null,
      elapsedRealtimeNanos:
        typeof payload.elapsedRealtimeNanos === "number" ? payload.elapsedRealtimeNanos : null,
      reason: e.reason,
      exceptionMessage: e.exceptionMessage,
      exceptionStack: e.exceptionStack,
      exceptionFn: e.exceptionFn,
      exceptionLine: e.exceptionLine,
      payloadJson: e.payloadJson
    };
  });

  /* 실제 발생 시각 기준 정렬 */
  events.sort((a, b) => {
    if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
    return a.seq - b.seq;
  });

  const perf = computePerfFromEvents(events);
  const perfSummaryEvent = [...events].reverse().find((e) => e.code === "PERF_SUMMARY");
  const devicePerf =
    perfSummaryEvent?.payloadJson &&
    typeof perfSummaryEvent.payloadJson === "object" &&
    !Array.isArray(perfSummaryEvent.payloadJson)
      ? (perfSummaryEvent.payloadJson as Record<string, unknown>).perf ||
        (perfSummaryEvent.payloadJson as Record<string, unknown>).summary
      : null;

  return {
    session: {
      id: session.id,
      feature: session.feature,
      sessionKey: session.sessionKey,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      deviceModel: session.deviceModel,
      androidVersion: session.androidVersion,
      appVersion: session.appVersion,
      deviceId: session.deviceId,
      userId: session.userId,
      phoneMasked: session.phoneMasked,
      lastStep: session.lastStep,
      failStep: session.failStep,
      failReason: session.failReason,
      overlayStateJson: session.overlayStateJson,
      metaJson: session.metaJson,
      lastOkStep,
      suggestedFixHint: suggestedFixHint(session.feature, session.failStep),
      perf,
      devicePerf: devicePerf ?? null,
      kpi: {
        bigPushVisibleMaxMs: 300,
        showcaseVisibleMaxMs: 1000
      }
    },
    events
  };
}

const PERF_ALIASES: Record<string, string[]> = {
  REACT_ROOT_READY: ["REACT_ROOT_READY", "REACT_ROOT_MOUNTED"],
  BIG_PUSH_VISIBLE: ["BIG_PUSH_VISIBLE", "ADD_VIEW_SUCCESS"],
  BIG_PUSH_REQUESTED: ["BIG_PUSH_REQUESTED", "SHOW_OVERLAY", "COORDINATOR_START_OVERLAY"],
  SHOWCASE_VISIBLE: ["SHOWCASE_VISIBLE"],
  INCOMING_CALL: ["INCOMING_CALL"],
  ANSWER_DETECTED: ["ANSWER_DETECTED"],
  SHOWCASE_REQUESTED: ["SHOWCASE_REQUESTED"],
  OVERLAY_ATTACHED: ["OVERLAY_ATTACHED"],
  DCC_BOUND: ["DCC_BOUND"],
  CALL_END: ["CALL_END"]
};

function firstElapsed(
  byCode: Map<string, number>,
  logical: string
): number | null {
  const aliases = PERF_ALIASES[logical] || [logical];
  for (const a of aliases) {
    if (byCode.has(a)) return byCode.get(a)!;
  }
  return null;
}

function computePerfFromEvents(
  events: { code: string; elapsedMs: number }[]
): {
  milestones: Record<string, number>;
  segments: {
    id: string;
    label: string;
    fromCode: string;
    toCode: string;
    elapsedMs: number;
    kpiMs?: number;
    kpiPass?: boolean;
  }[];
  summary: Record<string, number | boolean | null>;
} {
  const byCode = new Map<string, number>();
  for (const e of events) {
    const c = String(e.code || "").toUpperCase();
    if (!byCode.has(c)) byCode.set(c, e.elapsedMs);
  }
  const milestones: Record<string, number> = {};
  for (const logical of Object.keys(PERF_ALIASES)) {
    const v = firstElapsed(byCode, logical);
    if (v != null) milestones[logical] = v;
  }

  const defs: {
    id: string;
    label: string;
    from: string;
    to: string;
    kpiMs?: number;
  }[] = [
    { id: "incoming_to_bigpush_requested", label: "Incoming → BigPush Requested", from: "INCOMING_CALL", to: "BIG_PUSH_REQUESTED" },
    { id: "bigpush_requested_to_visible", label: "BigPush Requested → Visible", from: "BIG_PUSH_REQUESTED", to: "BIG_PUSH_VISIBLE", kpiMs: 300 },
    { id: "incoming_to_bigpush_visible", label: "Incoming → BigPush", from: "INCOMING_CALL", to: "BIG_PUSH_VISIBLE", kpiMs: 300 },
    { id: "answer_to_showcase_requested", label: "Answer → Showcase Requested", from: "ANSWER_DETECTED", to: "SHOWCASE_REQUESTED" },
    { id: "showcase_requested_to_overlay", label: "Showcase Requested → Overlay Attached", from: "SHOWCASE_REQUESTED", to: "OVERLAY_ATTACHED" },
    { id: "overlay_to_react", label: "React Init", from: "OVERLAY_ATTACHED", to: "REACT_ROOT_READY" },
    { id: "react_to_dcc", label: "DCC Bind", from: "REACT_ROOT_READY", to: "DCC_BOUND" },
    { id: "dcc_to_showcase_visible", label: "DCC → Showcase Visible", from: "DCC_BOUND", to: "SHOWCASE_VISIBLE" },
    { id: "answer_to_showcase_visible", label: "Answer → Showcase", from: "ANSWER_DETECTED", to: "SHOWCASE_VISIBLE", kpiMs: 1000 },
    { id: "total_showcase", label: "Total Showcase", from: "ANSWER_DETECTED", to: "SHOWCASE_VISIBLE", kpiMs: 1000 }
  ];

  const segments = [];
  for (const d of defs) {
    const from = milestones[d.from];
    const to = milestones[d.to];
    if (from == null || to == null) continue;
    const elapsedMs = Math.max(0, to - from);
    segments.push({
      id: d.id,
      label: d.label,
      fromCode: d.from,
      toCode: d.to,
      elapsedMs,
      ...(d.kpiMs != null
        ? { kpiMs: d.kpiMs, kpiPass: elapsedMs <= d.kpiMs }
        : {})
    });
  }

  const pick = (id: string) => segments.find((s) => s.id === id)?.elapsedMs ?? null;
  const incomingToBigPush = pick("incoming_to_bigpush_visible") ?? pick("incoming_to_bigpush_requested");
  const totalShowcase = pick("total_showcase") ?? pick("answer_to_showcase_visible");
  const summary: Record<string, number | boolean | null> = {
    incomingToBigPushMs: incomingToBigPush,
    bigPushVisibleMs: pick("bigpush_requested_to_visible"),
    answerToShowcaseMs: totalShowcase,
    reactInitMs: pick("overlay_to_react"),
    dccBindMs: pick("react_to_dcc"),
    totalShowcaseMs: totalShowcase,
    kpiBigPushVisibleMs: 300,
    kpiShowcaseVisibleMs: 1000,
    kpiBigPushPass: incomingToBigPush != null ? incomingToBigPush <= 300 : null,
    kpiShowcasePass: totalShowcase != null ? totalShowcase <= 1000 : null
  };

  return { milestones, segments, summary };
}
