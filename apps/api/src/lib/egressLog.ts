import type { Context, Next } from "hono";

type RouteStat = { count: number; bytes: number };

const byRoute = new Map<string, RouteStat>();
let windowBytes = 0;
let windowRequests = 0;

const enabled =
  process.env.VLUE_EGRESS_LOG === "1" ||
  (process.env.VLUE_EGRESS_LOG !== "0" && process.env.NODE_ENV !== "production");

const perRequest = process.env.VLUE_EGRESS_LOG === "verbose";

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

function routeKey(method: string, path: string): string {
  return `${method} ${path.split("?")[0]}`;
}

async function responseBytes(res: Response): Promise<number> {
  const cl = res.headers.get("content-length");
  if (cl && /^\d+$/.test(cl)) return Number(cl);
  try {
    return (await res.clone().arrayBuffer()).byteLength;
  } catch {
    return 0;
  }
}

function flushSummary() {
  if (!enabled || byRoute.size === 0) return;
  const top = [...byRoute.entries()]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 12)
    .map(([k, v]) => `${k} ${v.count}x ${formatBytes(v.bytes)}`);
  console.info(
    `[egress] 60s summary — ${windowRequests} req, ${formatBytes(windowBytes)} pooler-proxy\n  ${top.join("\n  ")}`
  );
  byRoute.clear();
  windowBytes = 0;
  windowRequests = 0;
}

let summaryTimer: ReturnType<typeof setInterval> | null = null;

export function startEgressSummaryTimer() {
  if (!enabled || summaryTimer) return;
  summaryTimer = setInterval(flushSummary, 60_000);
}

export function egressLogMiddleware() {
  return async (c: Context, next: Next) => {
    await next();
    if (!enabled) return;

    const bytes = await responseBytes(c.res);
    const key = routeKey(c.req.method, c.req.path);
    const prev = byRoute.get(key) ?? { count: 0, bytes: 0 };
    prev.count += 1;
    prev.bytes += bytes;
    byRoute.set(key, prev);
    windowBytes += bytes;
    windowRequests += 1;

    if (perRequest) {
      console.info(`[egress] ${key} ${formatBytes(bytes)} status=${c.res.status}`);
    }
  };
}
