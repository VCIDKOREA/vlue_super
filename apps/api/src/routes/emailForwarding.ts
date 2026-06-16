import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  assertEmailWebhookSecret,
  handleInboundEmailForwardingWebhook,
  mapNotificationRowsForApi
} from "../services/email/inboundEmailWebhookService.js";
import {
  getUserEmailMapping,
  saveTargetMasterEmail,
  saveVirtualEmailMapping,
  type AddressKind
} from "../services/email/userEmailMappingsService.js";
import { listForwardingNotifications } from "../services/email/userEmailMappingsStore.js";

export const emailForwardingRoutes = new Hono();

/** AWS SES / Cloudflare 인바운드 웹훅 — 메일 본문 저장 없이 즉시 포워딩 */
emailForwardingRoutes.post("/inbound", async (c) => {
  const secret =
    c.req.header("X-VLUE-Email-Webhook-Secret") ||
    c.req.header("Authorization") ||
    c.req.header("X-Webhook-Secret");
  if (!assertEmailWebhookSecret(secret)) {
    return c.json({ error: "FORBIDDEN" }, 403);
  }

  try {
    const contentType = c.req.header("content-type") || "";
    let rawBody: unknown;
    if (contentType.includes("application/json")) {
      rawBody = await c.req.json();
    }

    const result = await handleInboundEmailForwardingWebhook({
      contentType,
      rawBody,
      parseMultipart: () => c.req.parseBody()
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400 | 404 | 422);
    }
    return c.json({
      ok: true,
      userId: result.userId,
      forwardedTo: result.forwardedTo,
      messageId: result.messageId
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

emailForwardingRoutes.use("*", requireUserHeader);

emailForwardingRoutes.get("/mapping", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const data = await getUserEmailMapping(userId);
    return c.json({ ok: true, ...data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

emailForwardingRoutes.put("/mapping", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      virtualEmailPrefix?: string;
      addressKind?: AddressKind;
      userCompanySlug?: string | null;
    }>();
    const prefix = String(body.virtualEmailPrefix || "").trim();
    const addressKind = body.addressKind === "brand" ? "brand" : "standard";
    if (!prefix) {
      return c.json({ error: "virtualEmailPrefix is required" }, 400);
    }

    const mapping = await saveVirtualEmailMapping(userId, {
      virtualEmailPrefix: prefix,
      addressKind,
      userCompanySlug: body.userCompanySlug
    });
    return c.json({ ok: true, mapping });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "PREMIUM_REQUIRED") {
      return c.json({ error: "프리미엄 회원만 상호 브랜드 메일을 사용할 수 있습니다.", code }, 403);
    }
    if (code === "EMAIL_ALREADY_TAKEN") {
      return c.json({ error: "이미 사용 중인 메일 주소입니다.", code }, 409);
    }
    if (code === "INVALID_PREFIX" || code === "INVALID_COMPANY_SLUG") {
      return c.json({ error: "메일 아이디 또는 상호 슬러그 형식이 올바르지 않습니다.", code }, 400);
    }
    return c.json({ error: code }, 400);
  }
});

emailForwardingRoutes.patch("/target", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ targetMasterEmail?: string }>();
    const target = String(body.targetMasterEmail || "").trim();
    if (!target) {
      return c.json({ error: "targetMasterEmail is required" }, 400);
    }

    const mapping = await saveTargetMasterEmail(userId, target);
    return c.json({ ok: true, mapping });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "MAPPING_NOT_CONFIGURED") {
      return c.json({ error: "먼저 VLUE 가상 메일 주소를 설정해 주세요.", code }, 400);
    }
    if (code === "INVALID_MASTER_EMAIL") {
      return c.json({ error: "유효한 이메일 주소를 입력해 주세요.", code }, 400);
    }
    return c.json({ error: code }, 400);
  }
});

emailForwardingRoutes.get("/notifications", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listForwardingNotifications(userId, 50);
    return c.json({ ok: true, notifications: mapNotificationRowsForApi(rows) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});
