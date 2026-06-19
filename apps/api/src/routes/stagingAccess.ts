import { Hono } from "hono";

const stagingRoutes = new Hono();

function parseWhitelist(): Set<string> {
  const raw = String(process.env.VLUE_STAGING_IP_WHITELIST || "").trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function clientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const forwarded = c.req.header("x-forwarded-for") || c.req.header("X-Forwarded-For") || "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;
  return c.req.header("x-real-ip") || c.req.header("X-Real-Ip") || "";
}

function checkBasicAuth(authHeader: string | undefined): boolean {
  const user = String(process.env.VLUE_STAGING_BASIC_USER || "").trim();
  const pass = String(process.env.VLUE_STAGING_BASIC_PASS || "").trim();
  if (!user || !pass) return false;
  if (!authHeader?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    return u === user && p === pass;
  } catch {
    return false;
  }
}

/** www.vlue.kr 스테이징 잠금 — IP 화이트리스트·Basic Auth 우회 확인 */
stagingRoutes.get("/staging-access", (c) => {
  const lockEnabled = String(process.env.VLUE_WWW_STAGING_LOCK || "false").toLowerCase() === "true";
  if (!lockEnabled) {
    return c.json({ ok: true, bypass: true, reason: "lock_disabled" });
  }

  const ip = clientIp(c);
  const whitelist = parseWhitelist();
  if (ip && whitelist.has(ip)) {
    return c.json({ ok: true, bypass: true, reason: "ip_whitelist" });
  }

  const auth = c.req.header("Authorization") || c.req.header("authorization");
  if (checkBasicAuth(auth)) {
    return c.json({ ok: true, bypass: true, reason: "basic_auth" });
  }

  return c.json({ ok: true, bypass: false, reason: "locked" });
});

export { stagingRoutes };
