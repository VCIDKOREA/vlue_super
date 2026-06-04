import type { AdminDevice } from "@prisma/client";
import type { Context, Next } from "hono";
import { prisma } from "../db/client.js";

export type AdminDeviceContext = { adminDevice: AdminDevice };

/** 본사 어드민 API — 승인된 X-Admin-Device-Id 필수 */
export async function requireAdminDevice(c: Context, next: Next) {
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
      { error: "승인되지 않은 기기입니다. 마스터 기기에서 6자리 코드로 승인해 주세요." },
      403
    );
  }
  c.set("adminDevice", dev);
  return next();
}
