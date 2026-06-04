import type { LineType } from "@prisma/client";
import type { Context, Next } from "hono";
import { resolveRequestUserId } from "../lib/authContext.js";
import {
  canEnterprisePurchase,
  loadEnterpriseUserContext,
  requireEnterpriseContext
} from "../services/enterprise/enterpriseContext.js";

export type ClientKind = "desktop" | "mobile";

export function detectClientKind(c: Context): ClientKind {
  const hdr = String(c.req.header("X-VLUE-Client") || "").toLowerCase();
  if (hdr === "mobile") return "mobile";
  if (hdr === "desktop") return "desktop";
  const ua = String(c.req.header("user-agent") || "").toLowerCase();
  if (/iphone|ipad|android|mobile/.test(ua)) return "mobile";
  return "desktop";
}

export function assertLineTypeAllowsClient(lineType: LineType, clientKind: ClientKind) {
  if (lineType === "WIRED" && clientKind === "mobile") {
    const err = new Error("유선 회선 계정은 PC(웹)에서만 이용할 수 있습니다.");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
}

/** 인증 후 회선 유형 × 클라이언트 검사 */
export async function enforceEnterpriseLineAccess(c: Context, next: Next) {
  const uid = (c.get("vlueUserId") as string | undefined) || (await resolveRequestUserId(c));
  if (!uid) {
    await next();
    return;
  }

  const ctx = await loadEnterpriseUserContext(uid);
  if (!ctx || ctx.lineType === "NONE") {
    await next();
    return;
  }

  try {
    assertLineTypeAllowsClient(ctx.lineType, detectClientKind(c));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "접근이 제한되었습니다.";
    return c.json({ error: msg, code: "LINE_TYPE_FORBIDDEN" }, 403);
  }
  await next();
}

export async function requireEnterprisePurchaser(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  if (!uid) return c.json({ error: "인증 필요" }, 401);

  try {
    const ctx = await requireEnterpriseContext(uid);
    if (!canEnterprisePurchase(ctx.enterpriseRole)) {
      return c.json(
        {
          error: "회사 구매 권한이 없습니다. 경리·대표 계정으로 결제하거나 구매 요청을 이용해 주세요.",
          code: "ENTERPRISE_PURCHASE_FORBIDDEN"
        },
        403
      );
    }
    c.set("enterpriseCtx", ctx);
    await next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "기업 권한 오류";
    return c.json({ error: msg }, 403);
  }
}

export async function requireEnterpriseMember(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  if (!uid) return c.json({ error: "인증 필요" }, 401);
  try {
    const ctx = await requireEnterpriseContext(uid);
    c.set("enterpriseCtx", ctx);
    await next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "기업 권한 오류";
    return c.json({ error: msg }, 403);
  }
}

export async function requireEnterpriseAdmin(c: Context, next: Next) {
  const uid = c.get("vlueUserId") as string | undefined;
  if (!uid) return c.json({ error: "인증 필요" }, 401);
  const ctx = await loadEnterpriseUserContext(uid);
  if (!ctx || (ctx.enterpriseRole !== "MASTER" && ctx.enterpriseRole !== "MANAGER")) {
    return c.json({ error: "대표 또는 대리인 권한이 필요합니다.", code: "ENTERPRISE_ADMIN_REQUIRED" }, 403);
  }
  c.set("enterpriseCtx", ctx);
  await next();
}
