import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";

export type ProductMetricEventType = "call_interface" | "showcase_view";

const ALLOWED_EVENTS = new Set<string>(["call_interface", "showcase_view"]);

let tableReady: Promise<void> | null = null;

/** migrate 이력과 무관하게 지표 테이블 보장 (IF NOT EXISTS) */
export function ensureProductMetricEventsTable() {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "product_metric_events" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "event_type" VARCHAR(40) NOT NULL,
          "user_id" UUID,
          "target_user_id" UUID,
          "source" VARCHAR(40),
          "meta_json" JSONB,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "product_metric_events_event_type_created_at_idx"
          ON "product_metric_events"("event_type", "created_at" DESC);
        CREATE INDEX IF NOT EXISTS "product_metric_events_created_at_idx"
          ON "product_metric_events"("created_at" DESC);
        CREATE INDEX IF NOT EXISTS "product_metric_events_user_id_event_type_created_at_idx"
          ON "product_metric_events"("user_id", "event_type", "created_at" DESC);
      `)
      .then(() => undefined)
      .catch((e) => {
        tableReady = null;
        console.warn("[product-metrics] ensure table failed", e);
      });
  }
  return tableReady;
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function toDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseRange(from?: string, to?: string, defaultDays = 30) {
  const end = to ? startOfUtcDay(new Date(to)) : startOfUtcDay(new Date());
  const start = from
    ? startOfUtcDay(new Date(from))
    : addUtcDays(end, -(Math.max(1, defaultDays) - 1));
  const safeStart = start.getTime() > end.getTime() ? end : start;
  return { start: safeStart, end: addUtcDays(end, 1) };
}

function emptySeries(start: Date, endExclusive: Date) {
  /** @type {string[]} */
  const days = [];
  for (let d = new Date(start); d < endExclusive; d = addUtcDays(d, 1)) {
    days.push(toDayKey(d));
  }
  return days;
}

function fillSeries(days: string[], countByDay: Map<string, number>) {
  return days.map((day) => ({ day, value: countByDay.get(day) || 0 }));
}

async function countByDayRaw(
  sql: Prisma.Sql
): Promise<Map<string, number>> {
  const rows = (await prisma.$queryRaw(sql)) as Array<{ day: Date | string; cnt: bigint | number }>;
  const map = new Map<string, number>();
  for (const row of rows) {
    const day =
      row.day instanceof Date ? toDayKey(row.day) : String(row.day).slice(0, 10);
    map.set(day, Number(row.cnt) || 0);
  }
  return map;
}

/**
 * 관리자 DB 지표 — 일별 시계열 + 기간 합계
 */
export async function getAdminProductMetrics(opts: { from?: string; to?: string } = {}) {
  await ensureProductMetricEventsTable();
  const { start, end } = parseRange(opts.from, opts.to, 30);
  const days = emptySeries(start, end);

  const emptyMap = () => new Map<string, number>();

  const safeCount = async (sql: Prisma.Sql) => {
    try {
      return await countByDayRaw(sql);
    } catch (e) {
      console.warn("[admin-metrics] series query failed", e);
      return emptyMap();
    }
  };

  const [signupsMap, activeMap, showcaseCreatesMap, paymentsMap, callMap, viewMap, revisitRows] =
    await Promise.all([
      safeCount(Prisma.sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM users
        WHERE created_at >= ${start} AND created_at < ${end}
          AND user_status::text <> 'DELETED'
        GROUP BY 1
        ORDER BY 1
      `),
      safeCount(Prisma.sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT user_id)::bigint AS cnt
        FROM auth_refresh_sessions
        WHERE created_at >= ${start} AND created_at < ${end}
        GROUP BY 1
        ORDER BY 1
      `),
      safeCount(Prisma.sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM showcase_cases
        WHERE created_at >= ${start} AND created_at < ${end}
          AND deleted_at IS NULL
        GROUP BY 1
        ORDER BY 1
      `),
      safeCount(Prisma.sql`
        SELECT date_trunc('day', COALESCE(paid_at, created_at) AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM subscription_payments
        WHERE status = 'paid'
          AND COALESCE(paid_at, created_at) >= ${start}
          AND COALESCE(paid_at, created_at) < ${end}
        GROUP BY 1
        ORDER BY 1
      `),
      safeCount(Prisma.sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM product_metric_events
        WHERE event_type = 'call_interface'
          AND created_at >= ${start} AND created_at < ${end}
        GROUP BY 1
        ORDER BY 1
      `),
      safeCount(Prisma.sql`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM product_metric_events
        WHERE event_type = 'showcase_view'
          AND created_at >= ${start} AND created_at < ${end}
        GROUP BY 1
        ORDER BY 1
      `),
      prisma
        .$queryRaw<Array<{ day: Date | string; active_cnt: bigint; return_cnt: bigint }>>`
          WITH daily AS (
            SELECT
              date_trunc('day', s.created_at AT TIME ZONE 'UTC') AS day,
              s.user_id
            FROM auth_refresh_sessions s
            WHERE s.created_at >= ${start} AND s.created_at < ${end}
            GROUP BY 1, 2
          ),
          first_seen AS (
            SELECT user_id, MIN(created_at) AS first_at
            FROM auth_refresh_sessions
            GROUP BY user_id
          )
          SELECT
            d.day,
            COUNT(*)::bigint AS active_cnt,
            COUNT(*) FILTER (
              WHERE f.first_at < d.day
            )::bigint AS return_cnt
          FROM daily d
          LEFT JOIN first_seen f ON f.user_id = d.user_id
          GROUP BY d.day
          ORDER BY d.day
        `
        .catch((e) => {
          console.warn("[admin-metrics] revisit query failed", e);
          return [] as Array<{ day: Date | string; active_cnt: bigint; return_cnt: bigint }>;
        })
    ]);

  const revisitMap = new Map<string, number>();
  for (const row of revisitRows) {
    const day = row.day instanceof Date ? toDayKey(row.day) : String(row.day).slice(0, 10);
    const active = Number(row.active_cnt) || 0;
    const ret = Number(row.return_cnt) || 0;
    revisitMap.set(day, active > 0 ? Math.round((ret / active) * 1000) / 10 : 0);
  }

  const series = {
    signups: fillSeries(days, signupsMap),
    activeUsers: fillSeries(days, activeMap),
    showcaseCreates: fillSeries(days, showcaseCreatesMap),
    callInterfaceUses: fillSeries(days, callMap),
    paidPayments: fillSeries(days, paymentsMap),
    revisitRate: days.map((day) => ({ day, value: revisitMap.get(day) || 0 })),
    showcaseViews: fillSeries(days, viewMap)
  };

  const sum = (arr: Array<{ value: number }>) => arr.reduce((a, b) => a + b.value, 0);
  const avg = (arr: Array<{ value: number }>) =>
    arr.length ? Math.round((sum(arr) / arr.length) * 10) / 10 : 0;

  const totals = {
    signups: sum(series.signups),
    activeUsers: sum(series.activeUsers),
    showcaseCreates: sum(series.showcaseCreates),
    callInterfaceUses: sum(series.callInterfaceUses),
    paidPayments: sum(series.paidPayments),
    revisitRate: avg(series.revisitRate),
    showcaseViews: sum(series.showcaseViews)
  };

  return {
    ok: true as const,
    range: { from: toDayKey(start), to: toDayKey(addUtcDays(end, -1)) },
    series,
    totals,
    definitions: {
      signups: "기간 내 신규 가입(탈퇴 제외)",
      activeUsers: "로그인 세션 발급 기준 일별 고유 사용자",
      showcaseCreates: "마이케이스 쇼케이스 게시물 생성",
      callInterfaceUses: "통화 인터페이스(미리보기·실통화) 사용 이벤트",
      paidPayments: "유료 구독 결제 완료 건수",
      revisitRate: "당일 활성 사용자 중 이전 세션이 있는 비율(%)",
      showcaseViews: "쇼케이스 조회 이벤트"
    }
  };
}

export async function recordProductMetricEvent(input: {
  eventType: string;
  userId?: string | null;
  targetUserId?: string | null;
  source?: string | null;
  meta?: unknown;
}) {
  const eventType = String(input.eventType || "").trim();
  if (!ALLOWED_EVENTS.has(eventType)) {
    return { ok: false as const, error: "INVALID_EVENT_TYPE" };
  }
  const userId = String(input.userId || "").trim() || null;
  const targetUserId = String(input.targetUserId || "").trim() || null;
  const source = String(input.source || "").trim().slice(0, 40) || null;

  try {
    await ensureProductMetricEventsTable();
    const meta =
      input.meta && typeof input.meta === "object" ? JSON.stringify(input.meta) : null;
    await prisma.$executeRawUnsafe(
      `INSERT INTO product_metric_events
        (id, event_type, user_id, target_user_id, source, meta_json, created_at)
       VALUES (
         gen_random_uuid(),
         $1,
         NULLIF($2, '')::uuid,
         NULLIF($3, '')::uuid,
         NULLIF($4, ''),
         CASE WHEN $5 IS NULL OR $5 = '' THEN NULL ELSE $5::jsonb END,
         NOW()
       )`,
      eventType,
      userId || "",
      targetUserId || "",
      source || "",
      meta || ""
    );
    return { ok: true as const };
  } catch (e) {
    console.warn("[product-metrics] record failed", e);
    return { ok: false as const, error: "RECORD_FAILED" };
  }
}
