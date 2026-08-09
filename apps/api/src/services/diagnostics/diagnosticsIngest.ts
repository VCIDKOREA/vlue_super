import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";

const FEATURES = new Set([
  "BIG_PUSH",
  "SHOWCASE",
  "MINI_CASE",
  "OVERLAY",
  "FOREGROUND_SERVICE",
  "API",
  "VERIFICATION",
  "PUSH"
]);

const STATUSES = new Set(["RUNNING", "OK", "FAILED", "SKIPPED"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function asStr(v: unknown, max = 200): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

function asBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  return null;
}

function asDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function asJson(v: unknown, maxChars = 4_000): Prisma.InputJsonValue | undefined {
  if (v == null) return undefined;
  if (typeof v !== "object") return undefined;
  try {
    const s = JSON.stringify(v);
    if (s.length <= maxChars) return v as Prisma.InputJsonValue;
    return {
      _truncated: true,
      preview: s.slice(0, maxChars)
    } as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export type UpsertSessionInput = {
  id?: string;
  feature?: string;
  sessionKey?: string;
  status?: string;
  startedAt?: unknown;
  endedAt?: unknown;
  deviceModel?: string;
  androidVersion?: string;
  appVersion?: string;
  deviceId?: string;
  userId?: string | null;
  phoneMasked?: string;
  lastStep?: number;
  failStep?: number | null;
  failReason?: string | null;
  overlayStateJson?: unknown;
  metaJson?: unknown;
};

export async function upsertDiagnosticSession(
  input: UpsertSessionInput,
  resolvedUserId: string | null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const feature = asStr(input.feature, 40)?.toUpperCase() || "BIG_PUSH";
  if (!FEATURES.has(feature)) return { ok: false, error: "INVALID_FEATURE" };

  const id = isUuid(input.id) ? input.id : crypto.randomUUID();
  const sessionKey =
    asStr(input.sessionKey, 48) ||
    new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const statusRaw = asStr(input.status, 16)?.toUpperCase() || "RUNNING";
  const status = STATUSES.has(statusRaw) ? statusRaw : "RUNNING";
  const startedAt = asDate(input.startedAt) || new Date();
  const endedAt = asDate(input.endedAt);
  const userId =
    (isUuid(input.userId) ? input.userId : null) ||
    (isUuid(resolvedUserId) ? resolvedUserId : null);
  const lastStep = Math.max(asInt(input.lastStep) ?? 0, 0);

  const existing = await prisma.diagnosticSession.findUnique({ where: { id } });

  if (!existing) {
    await prisma.diagnosticSession.create({
      data: {
        id,
        feature,
        sessionKey,
        status,
        startedAt,
        endedAt: endedAt ?? undefined,
        deviceModel: asStr(input.deviceModel, 80),
        androidVersion: asStr(input.androidVersion, 24),
        appVersion: asStr(input.appVersion, 32),
        deviceId: asStr(input.deviceId, 80),
        userId: userId ?? undefined,
        phoneMasked: asStr(input.phoneMasked, 24),
        lastStep,
        failStep: asInt(input.failStep),
        failReason: asStr(input.failReason, 4000),
        overlayStateJson: asJson(input.overlayStateJson),
        metaJson: asJson(input.metaJson)
      }
    });
    return { ok: true, id };
  }

  const nextStatus =
    existing.status === "RUNNING" || status === "FAILED" || status === "SKIPPED"
      ? status
      : existing.status;

  await prisma.diagnosticSession.update({
    where: { id },
    data: {
      sessionKey: asStr(input.sessionKey, 48) || existing.sessionKey,
      status: nextStatus,
      endedAt: endedAt ?? existing.endedAt ?? undefined,
      deviceModel: asStr(input.deviceModel, 80) ?? existing.deviceModel,
      androidVersion: asStr(input.androidVersion, 24) ?? existing.androidVersion,
      appVersion: asStr(input.appVersion, 32) ?? existing.appVersion,
      deviceId: asStr(input.deviceId, 80) ?? existing.deviceId,
      userId: userId ?? existing.userId,
      phoneMasked: asStr(input.phoneMasked, 24) ?? existing.phoneMasked,
      lastStep: Math.max(existing.lastStep, lastStep),
      failStep: asInt(input.failStep) ?? existing.failStep,
      failReason: asStr(input.failReason, 4000) ?? existing.failReason,
      overlayStateJson: asJson(input.overlayStateJson) ?? undefined,
      metaJson: asJson(input.metaJson) ?? undefined
    }
  });

  return { ok: true, id };
}

export type IngestEventInput = {
  sessionId?: string;
  seq?: number;
  code?: string;
  label?: string;
  ok?: boolean | null;
  timestamp?: unknown;
  elapsedMs?: number;
  reason?: string | null;
  exceptionMessage?: string | null;
  exceptionStack?: string | null;
  exceptionFn?: string | null;
  exceptionLine?: number | null;
  payloadJson?: unknown;
  terminalFailure?: boolean;
};

export type IngestEventsBody = {
  session?: UpsertSessionInput;
  events?: IngestEventInput[];
};

/** 세션 FAILED 로 올릴 실제 단말 실패 코드만 */
const TERMINAL_FAIL_CODES = new Set([
  "ADD_VIEW_FAIL",
  "ADD_VIEW_EXCEPTION"
]);

export async function ingestDiagnosticEvents(
  body: IngestEventsBody,
  resolvedUserId: string | null
): Promise<{ ok: true; sessionId: string; accepted: number } | { ok: false; error: string }> {
  const sessionInput = body.session || {};
  const events = Array.isArray(body.events) ? body.events.slice(0, 100) : [];

  let sessionId = isUuid(sessionInput.id) ? sessionInput.id : undefined;
  if (!sessionId && events[0] && isUuid(events[0].sessionId)) {
    sessionId = events[0].sessionId;
  }

  const upsert = await upsertDiagnosticSession(
    { ...sessionInput, id: sessionId },
    resolvedUserId
  );
  if (!upsert.ok) return upsert;
  sessionId = upsert.id;

  let accepted = 0;
  let maxStep = 0;
  let failStep: number | null = null;
  let failReason: string | null = null;
  let nextStatus: string | null = null;
  let overlayState: Prisma.InputJsonValue | undefined;
  let endedAt: Date | null = null;
  let sawAddViewSuccess = false;

  for (const ev of events) {
    const seq = asInt(ev.seq);
    const code = asStr(ev.code, 64)?.toUpperCase();
    if (seq == null || seq < 0 || !code) continue;
    const label = asStr(ev.label, 160) || `[${seq}] ${code}`;
    const timestamp = asDate(ev.timestamp) || new Date();
    const elapsedMs = asInt(ev.elapsedMs) ?? 0;
    const reason = asStr(ev.reason, 4000);
    const ok = asBool(ev.ok);
    const payload = asJson(ev.payloadJson);
    const terminalFailure =
      ev.terminalFailure === true ||
      TERMINAL_FAIL_CODES.has(code) ||
      (code === "SKIP" &&
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        (payload as Record<string, unknown>).terminal === true);

    try {
      await prisma.diagnosticEvent.upsert({
        where: {
          sessionId_seq_code: { sessionId, seq, code }
        },
        create: {
          sessionId,
          seq,
          code,
          label,
          ok: ok ?? undefined,
          timestamp,
          elapsedMs,
          reason: reason ?? undefined,
          exceptionMessage: asStr(ev.exceptionMessage, 4000) ?? undefined,
          exceptionStack: asStr(ev.exceptionStack, 800) ?? undefined,
          exceptionFn: asStr(ev.exceptionFn, 160) ?? undefined,
          exceptionLine: asInt(ev.exceptionLine) ?? undefined,
          payloadJson: payload
        },
        update: {
          label,
          ok: ok ?? undefined,
          timestamp,
          elapsedMs,
          reason: reason ?? undefined,
          exceptionMessage: asStr(ev.exceptionMessage, 4000) ?? undefined,
          exceptionStack: asStr(ev.exceptionStack, 800) ?? undefined,
          exceptionFn: asStr(ev.exceptionFn, 160) ?? undefined,
          exceptionLine: asInt(ev.exceptionLine) ?? undefined,
          payloadJson: payload
        }
      });
      accepted += 1;
    } catch {
      continue;
    }

    maxStep = Math.max(maxStep, seq);

    if (code === "ADD_VIEW_SUCCESS") {
      sawAddViewSuccess = true;
    }

    /* SKIP / CALL_END ok=false 는 세션 FAIL 로 쓰지 않음 — terminalFailure 또는 EXCEPTION/FAIL 만 */
    if (terminalFailure) {
      failStep = seq;
      failReason = reason || asStr(ev.exceptionMessage, 4000) || code;
      nextStatus = code === "SKIP" ? "SKIPPED" : "FAILED";
    }

    if (code === "CALL_END" || seq === 11) {
      endedAt = timestamp;
      if (!nextStatus) {
        nextStatus = "OK";
      }
    }

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const p = payload as Record<string, unknown>;
      if (
        p.type != null ||
        p.layoutParams != null ||
        p.overlayPermission != null ||
        p.width != null ||
        p.result != null ||
        p.overlayInstanceId != null ||
        p.overlayDiag != null
      ) {
        const merged: Record<string, unknown> = { ...p };
        if (p.overlayDiag && typeof p.overlayDiag === "object" && !Array.isArray(p.overlayDiag)) {
          Object.assign(merged, p.overlayDiag as Record<string, unknown>);
        }
        overlayState = merged as Prisma.InputJsonValue;
      }
    }
  }

  /* session blob 의 failReason 은 terminal 일 때만 신뢰 — SUCCESS 후 이전 SKIP reason 제거 */
  const existing = await prisma.diagnosticSession.findUnique({ where: { id: sessionId } });
  if (existing) {
    const sessionStatus = asStr(sessionInput.status, 16)?.toUpperCase();
    const sessionClaimsTerminal =
      sessionStatus === "FAILED" || sessionStatus === "SKIPPED";

    let status = existing.status;
    if (failStep != null) {
      status = nextStatus || "FAILED";
    } else if (sawAddViewSuccess) {
      status = nextStatus === "OK" || nextStatus == null || existing.status === "FAILED" || existing.status === "SKIPPED"
        ? (nextStatus === "FAILED" ? "FAILED" : "OK")
        : status;
      if (existing.status === "FAILED" || existing.status === "SKIPPED") status = "OK";
      if (nextStatus === "OK") status = "OK";
    } else if (nextStatus === "OK") {
      status = "OK";
    } else if (nextStatus && existing.status === "RUNNING") {
      status = nextStatus;
    }

    await prisma.diagnosticSession.update({
      where: { id: sessionId },
      data: {
        lastStep: Math.max(existing.lastStep, maxStep),
        failStep: sawAddViewSuccess && !failStep
          ? null
          : failStep ?? (sessionClaimsTerminal ? asInt(sessionInput.failStep) : null) ?? undefined,
        failReason: sawAddViewSuccess && !failReason
          ? null
          : failReason ?? (sessionClaimsTerminal ? asStr(sessionInput.failReason, 4000) : null) ?? undefined,
        status,
        endedAt: existing.endedAt ?? endedAt ?? undefined,
        overlayStateJson: overlayState ?? undefined
      }
    });
  }

  return { ok: true, sessionId, accepted };
}
