import type { Context, Next } from "hono";
import { prisma } from "../db/client.js";
import { verifyAccessToken } from "../lib/authContext.js";
import { isSuperAdminUser } from "../services/admin/superAdminAuth.js";

export type HqUserVar = {
  id: string;
  role: string;
  publicHandle: string | null;
  phoneE164: string | null;
  legalName: string | null;
  accountStatus: string;
};

export async function requireSuperAdminBearer(c: Context, next: Next) {
  const auth = c.req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return c.json({ error: "SUPER_ADMIN 인증이 필요합니다." }, 401);

  const userId = await verifyAccessToken(token);
  if (!userId) return c.json({ error: "세션이 만료되었습니다." }, 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, publicHandle: true, phoneE164: true, legalName: true, accountStatus: true }
  });
  if (!user || !isSuperAdminUser(user)) {
    return c.json({ error: "SUPER_ADMIN 권한이 없습니다." }, 403);
  }

  c.set("hqUser", user as HqUserVar);
  return next();
}
