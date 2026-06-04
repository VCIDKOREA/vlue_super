import { Hono } from "hono";
import { prisma } from "../db/client.js";

type AdminDeviceRow = NonNullable<Awaited<ReturnType<typeof prisma.adminDevice.findUnique>>>;
type AdminVars = { adminDevice: AdminDeviceRow };

function genSixDigit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const adminRoutes = new Hono<{ Variables: AdminVars }>();

/** 기기 등록·승인 상태 조회 (승인 전에도 deviceKey 로 조회) */
adminRoutes.get("/device/me", async (c) => {
  const dk = c.req.header("x-admin-device-id")?.trim();
  if (!dk) {
    return c.json({ error: "X-Admin-Device-Id 헤더가 필요합니다." }, 400);
  }
  const dev = await prisma.adminDevice.findUnique({ where: { deviceKey: dk } });
  if (!dev) {
    return c.json({ ok: true, registered: false, isAuthorized: false, isMaster: false });
  }
  return c.json({
    ok: true,
    registered: true,
    isAuthorized: dev.isAuthorized,
    isMaster: dev.isMaster,
    deviceId: dev.id
  });
});

/** 승인된 기기만 /api/admin/* 의 나머지(현재: authorize) 호출 가능 — pending · me 만 예외 */
adminRoutes.use("*", async (c, next) => {
  if (
    (c.req.path === "/device/pending" && c.req.method === "POST") ||
    (c.req.path === "/device/me" && c.req.method === "GET")
  ) {
    return next();
  }
  const dk = c.req.header("x-admin-device-id")?.trim();
  if (!dk) {
    return c.json({ error: "X-Admin-Device-Id 헤더가 필요합니다." }, 403);
  }
  const dev = await prisma.adminDevice.findUnique({ where: { deviceKey: dk } });
  if (!dev) {
    return c.json({ error: "등록되지 않은 관리 기기입니다." }, 403);
  }
  if (!dev.isAuthorized) {
    return c.json(
      { error: "승인되지 않은 기기입니다. 마스터 기기에서 화면에 표시된 6자리 코드로 승인해 주세요." },
      403
    );
  }
  c.set("adminDevice", dev);
  return next();
});

adminRoutes.post("/device/pending", async (c) => {
  const expected = process.env.ADMIN_ENTRY_PATH?.trim();
  if (!expected) {
    return c.json({ error: "서버에 ADMIN_ENTRY_PATH 가 설정되지 않았습니다." }, 503);
  }
  const body = (await c.req.json().catch(() => ({}))) as { entryPathProof?: string };
  const proof = typeof body.entryPathProof === "string" ? body.entryPathProof.trim() : "";
  if (proof !== expected) {
    return c.json({ error: "유효하지 않은 관리자 진입 경로입니다." }, 403);
  }

  const dk = c.req.header("x-admin-device-id")?.trim();
  if (!dk || dk.length < 8 || dk.length > 80) {
    return c.json({ error: "X-Admin-Device-Id 가 필요합니다 (8~80자)." }, 400);
  }

  const ua = c.req.header("user-agent")?.slice(0, 512) ?? null;
  const fwd = c.req.header("x-forwarded-for");
  const lastIp = (fwd?.split(",")[0]?.trim() || c.req.header("cf-connecting-ip") || "").slice(0, 45) || null;

  const existing = await prisma.adminDevice.findUnique({ where: { deviceKey: dk } });
  if (existing?.isMaster) {
    await prisma.adminDevice.update({
      where: { deviceKey: dk },
      data: {
        userAgent: ua ?? undefined,
        lastIp: lastIp ?? undefined,
        authCode: null,
        authCodeExpiresAt: null
      }
    });
    return c.json({ ok: true, isMaster: true, message: "마스터 기기입니다. 코드 재발급이 필요 없습니다." });
  }

  const now = new Date();
  const exp = new Date(now.getTime() + 10 * 60 * 1000);
  const code = genSixDigit();

  await prisma.adminDevice.upsert({
    where: { deviceKey: dk },
    create: {
      deviceKey: dk,
      isMaster: false,
      isAuthorized: false,
      authCode: code,
      authCodeExpiresAt: exp,
      userAgent: ua,
      lastIp
    },
    update: {
      authCode: code,
      authCodeExpiresAt: exp,
      userAgent: ua ?? undefined,
      lastIp: lastIp ?? undefined
    }
  });

  return c.json({ ok: true, authCode: code, expiresAt: exp.toISOString(), deviceKey: dk });
});

adminRoutes.post("/device/authorize", async (c) => {
  const caller = c.get("adminDevice");
  if (!caller.isMaster) {
    return c.json({ error: "마스터 기기에서만 다른 기기를 승인할 수 있습니다." }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as { authCode?: string };
  const raw = String(body.authCode ?? "").replace(/\D/g, "");
  if (raw.length !== 6) {
    return c.json({ error: "6자리 코드를 입력해 주세요." }, 400);
  }

  const target = await prisma.adminDevice.findFirst({
    where: {
      authCode: raw,
      authCodeExpiresAt: { gt: new Date() },
      isMaster: false
    }
  });

  if (!target) {
    return c.json({ error: "유효한 코드가 없거나 만료되었습니다." }, 404);
  }
  if (target.id === caller.id) {
    return c.json({ error: "본 기기 코드는 승인할 수 없습니다." }, 400);
  }

  await prisma.adminDevice.update({
    where: { id: target.id },
    data: {
      isAuthorized: true,
      authCode: null,
      authCodeExpiresAt: null
    }
  });

  return c.json({ ok: true });
});
