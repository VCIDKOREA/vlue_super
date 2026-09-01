import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  assertEmailWebhookSecret,
  handleInboundEmailForwardingWebhook,
  mapNotificationRowsForApi
} from "../services/email/inboundEmailWebhookService.js";
import {
  addUserMasterEmail,
  getUserEmailMapping,
  saveVirtualEmailMapping,
  setUserPrimaryMasterEmail,
  type AddressKind
} from "../services/email/userEmailMappingsService.js";
import { listForwardingNotifications } from "../services/email/userEmailMappingsStore.js";
import {
  getInappMailCacheById,
  listInappMailCaches
} from "../services/email/inappMailCacheStore.js";
import {
  getUserEmailById,
  listUserEmails
} from "../services/email/userEmailsStore.js";
import { sendUserOutboundEmail } from "../services/email/outboundEmailService.js";
import { consumeVerifiedEmailTicket } from "../services/email/emailAuthCodeService.js";
import {
  listExternalMailAccounts,
  runExternalMailSyncBatch,
  upsertExternalMailAccount
} from "../services/email/externalMailSyncQueue.js";

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
      mode: result.mode
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
      addressKind?: AddressKind;
      userCompanySlug?: string | null;
    }>();
    const addressKind = body.addressKind === "brand" ? "brand" : "standard";

    const mapping = await saveVirtualEmailMapping(userId, {
      addressKind,
      userCompanySlug: body.userCompanySlug
    });
    return c.json({ ok: true, mapping });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "LOGIN_ID_REQUIRED") {
      return c.json({ error: "로그인 아이디가 설정되지 않았습니다. VLUE 가입·본인인증을 완료해 주세요.", code }, 400);
    }
    if (code === "PREMIUM_REQUIRED") {
      return c.json(
        { error: "상호 브랜드형은 유료회원·비즈니스회원만 사용할 수 있습니다.", code },
        403
      );
    }
    if (code === "EMAIL_ALREADY_TAKEN") {
      return c.json({ error: "이미 사용 중인 메일 주소입니다.", code }, 409);
    }
    if (code === "INVALID_COMPANY_SLUG") {
      return c.json({ error: "상호 슬러그 형식이 올바르지 않습니다.", code }, 400);
    }
    return c.json({ error: code }, 400);
  }
});

emailForwardingRoutes.post("/masters", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ email?: string; token?: string; ticket?: string }>();
    const email = String(body.email || "").trim();
    if (!email) {
      return c.json({ error: "email is required" }, 400);
    }
    await consumeVerifiedEmailTicket(String(body.token || body.ticket || ""), {
      purpose: "dcc_email",
      email,
      userId
    });
    const mapping = await addUserMasterEmail(userId, email);
    return c.json({ ok: true, mapping });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "LOGIN_ID_REQUIRED") {
      return c.json({ error: "로그인 아이디가 없습니다.", code }, 400);
    }
    if (code === "INVALID_MASTER_EMAIL") {
      return c.json({ error: "유효한 이메일 주소를 입력해 주세요.", code }, 400);
    }
    return c.json({ error: code }, 400);
  }
});

emailForwardingRoutes.patch("/masters/primary", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ email?: string }>();
    const email = String(body.email || "").trim();
    if (!email) {
      return c.json({ error: "email is required" }, 400);
    }
    const mapping = await setUserPrimaryMasterEmail(userId, email);
    return c.json({ ok: true, mapping });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "MAPPING_NOT_CONFIGURED") {
      return c.json({ error: "먼저 VLUE 가상 메일 주소를 선택해 주세요.", code }, 400);
    }
    if (code === "MASTER_EMAIL_NOT_FOUND") {
      return c.json({ error: "등록된 메일이 아닙니다.", code }, 404);
    }
    if (code === "INVALID_MASTER_EMAIL") {
      return c.json({ error: "유효한 이메일 주소를 입력해 주세요.", code }, 400);
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
    const mapping = await setUserPrimaryMasterEmail(userId, target);
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

function mapInappMailForApi(
  rows: Awaited<ReturnType<typeof listInappMailCaches>>
) {
  return rows.map((row) => ({
    id: row.id,
    mailSource: row.mail_source,
    fromAddress: row.from_address,
    subject: row.subject,
    snippet: row.snippet,
    direction: "inbound",
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at
  }));
}

function mapUserEmailsForApi(rows: Awaited<ReturnType<typeof listUserEmails>>) {
  return rows.map((row) => ({
    id: row.id,
    mailSource: row.mail_source,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    subject: row.subject,
    snippet: String(row.body_text || "").slice(0, 280),
    bodyText: row.body_text,
    direction: row.direction,
    receivedAt:
      (row.received_at || row.sent_at || row.created_at) instanceof Date
        ? (row.received_at || row.sent_at || row.created_at)!.toISOString()
        : row.received_at || row.sent_at || row.created_at
  }));
}

/** 올인원 통합 인앱 메일함 피드 */
emailForwardingRoutes.get("/inbox", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const userRows = await listUserEmails(userId, 100);
    if (userRows.length > 0) {
      return c.json({ ok: true, inbox: mapUserEmailsForApi(userRows) });
    }
    const rows = await listInappMailCaches(userId, 100);
    return c.json({ ok: true, inbox: mapInappMailForApi(rows) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

emailForwardingRoutes.get("/inbox/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const mailId = c.req.param("id");
    const userMail = await getUserEmailById(userId, mailId);
    if (userMail) {
      return c.json({
        ok: true,
        mail: {
          id: userMail.id,
          mailSource: userMail.mail_source,
          fromAddress: userMail.from_address,
          toAddress: userMail.to_address,
          subject: userMail.subject,
          snippet: String(userMail.body_text || "").slice(0, 280),
          bodyText: userMail.body_text,
          bodyHtml: userMail.body_html,
          direction: userMail.direction,
          receivedAt:
            (userMail.received_at || userMail.sent_at || userMail.created_at) instanceof Date
              ? (userMail.received_at || userMail.sent_at || userMail.created_at)!.toISOString()
              : userMail.received_at || userMail.sent_at || userMail.created_at
        }
      });
    }
    const row = await getInappMailCacheById(userId, mailId);
    if (!row) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({
      ok: true,
      mail: {
        id: row.id,
        mailSource: row.mail_source,
        fromAddress: row.from_address,
        subject: row.subject,
        snippet: row.snippet,
        bodyText: row.snippet,
        receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** 인앱 메일 발송·답장 */
emailForwardingRoutes.post("/send", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
    }>();
    const result = await sendUserOutboundEmail(userId, {
      to: String(body.to || ""),
      subject: String(body.subject || ""),
      text: body.text,
      html: body.html
    });
    return c.json({
      ok: true,
      messageId: result.result.messageId,
      mailId: result.mail.id
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

emailForwardingRoutes.get("/external-accounts", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listExternalMailAccounts(userId);
    return c.json({
      ok: true,
      accounts: rows.map((r) => ({
        id: r.id,
        email: r.email,
        provider: r.provider,
        syncStatus: r.sync_status,
        lastSyncAt: r.last_sync_at instanceof Date ? r.last_sync_at.toISOString() : r.last_sync_at
      }))
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

emailForwardingRoutes.post("/external-accounts", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      email?: string;
      provider?: string;
      imapHost?: string;
      token?: string;
      ticket?: string;
    }>();
    const email = String(body.email || "").trim();
    if (!email) return c.json({ error: "email is required" }, 400);
    await consumeVerifiedEmailTicket(String(body.token || body.ticket || ""), {
      purpose: "dcc_email",
      email,
      userId
    });
    const account = await upsertExternalMailAccount({
      userId,
      email,
      provider: body.provider,
      imapHost: body.imapHost
    });
    return c.json({
      ok: true,
      account: {
        id: account.id,
        email: account.email,
        provider: account.provider,
        syncStatus: account.sync_status
      }
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown error";
    if (code === "PREMIUM_REQUIRED") {
      return c.json(
        { error: "외부 메일(IMAP) 연동은 유료회원·비즈니스회원 전용입니다.", code },
        403
      );
    }
    return c.json({ error: code }, 400);
  }
});

emailForwardingRoutes.post("/sync/run-batch", async (c) => {
  try {
    const result = await runExternalMailSyncBatch();
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});
