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
      events: { orderBy: [{ seq: "asc" }, { timestamp: "asc" }] }
    }
  });
  if (!session) return null;

  const lastOkStep = session.events
    .filter((e) => e.ok === true)
    .reduce((m, e) => Math.max(m, e.seq), 0);

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
      suggestedFixHint: suggestedFixHint(session.feature, session.failStep)
    },
    events: session.events.map((e) => ({
      id: e.id,
      seq: e.seq,
      code: e.code,
      label: e.label,
      ok: e.ok,
      timestamp: e.timestamp.toISOString(),
      elapsedMs: e.elapsedMs,
      reason: e.reason,
      exceptionMessage: e.exceptionMessage,
      exceptionStack: e.exceptionStack,
      exceptionFn: e.exceptionFn,
      exceptionLine: e.exceptionLine,
      payloadJson: e.payloadJson
    }))
  };
}
