import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { uploadOfficeScanPdf } from "../services/office/officeScanService.js";
import {
  listRemoteControlQueue,
  submitRemoteControl
} from "../services/office/remoteControlService.js";
import { listConnectedAgents } from "../services/office/remoteControlHub.js";
import { listAssetFilesForUser } from "../services/vault/assetFileService.js";
import {
  assertEmailWebhookSecret,
  handleOfficeEmailWebhook,
  listOfficeEmailInbox,
  mapInboxRowsForApi
} from "../services/office/emailWebhookService.js";
import { listOfficeEmailSent, mapSentRowsForApi } from "../services/office/officeEmailSent.js";
import { getActiveMarketingPopup } from "../services/office/marketingPopupService.js";
import { getLatestNotice } from "../services/office/noticeService.js";
import {
  createOfficeCalendarEvent,
  listOfficeCalendarEvents,
  upsertGroupMembers
} from "../services/office/officeCalendarService.js";
import {
  createMediaCampaignFromUploads,
  getMediaCampaign,
  resolveMediaFilePath
} from "../services/office/mediaCampaignService.js";
import { readFile } from "node:fs/promises";
import { officeExcelRoutes } from "./officeExcel.js";
import {
  getPosLedgerDashboard,
  getPosLedgerRole,
  ingestPosBillFromOcr,
  invitePosStaff,
  listPosStaffForOwner,
  patchPosLedgerEntry,
  updatePosStaffTransmit
} from "../services/office/posBillOcrService.js";

export const officeRoutes = new Hono();

officeRoutes.post("/email-webhook", async (c) => {
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

    const result = await handleOfficeEmailWebhook({
      contentType,
      rawBody,
      parseMultipart: () => c.req.parseBody()
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status as 400 | 404);
    }
    return c.json({
      ok: true,
      inboxId: result.inboxId,
      userId: result.userId,
      ingestedCount: result.ingestedCount,
      files: result.files
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.use("*", requireUserHeader);

officeRoutes.get("/marketing/active-popup", async (c) => {
  try {
    const popup = await getActiveMarketingPopup();
    return c.json({ ok: true, popup });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/notices/latest", async (c) => {
  try {
    const notice = await getLatestNotice();
    return c.json({ ok: true, notice });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/files", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listAssetFilesForUser(userId, 200);
    const files = rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileUrl: row.file_url,
      contentType: row.content_type,
      fileSize: row.file_size,
      objectKey: row.object_key,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));
    return c.json({ ok: true, files });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/email-inbox", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listOfficeEmailInbox(userId, 80);
    return c.json({ ok: true, inbox: mapInboxRowsForApi(rows) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/email-sent", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listOfficeEmailSent(userId, 80);
    return c.json({ ok: true, sent: mapSentRowsForApi(rows) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.post("/scan-upload", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.parseBody();
    const fileField = body.file ?? body.scan ?? body.pdf;
    if (!fileField || typeof fileField === "string") {
      return c.json({ error: "PDF file (field: file) is required" }, 400);
    }

    const upload = fileField as File;
    const arrayBuffer = await upload.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) return c.json({ error: "empty file" }, 400);

    const contentType = String(upload.type || "application/pdf");
    if (contentType !== "application/pdf" && !upload.name?.toLowerCase().endsWith(".pdf")) {
      return c.json({ error: "PDF format required" }, 400);
    }

    const fileName = String(body.fileName || upload.name || `cs-scan-${Date.now()}.pdf`);
    const file = await uploadOfficeScanPdf({ userId, fileName, buffer });
    return c.json({ ok: true, file });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.post("/remote-control", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      assetFileId?: string;
      deviceId?: string;
      senderLineNumber?: string;
      action?: "print" | "fax";
    }>();
    const assetFileId = String(body?.assetFileId || "").trim();
    const deviceId = String(body?.deviceId || "").trim();
    const senderLineNumber = String(body?.senderLineNumber || "").trim();
    const action = body?.action === "fax" ? "fax" : "print";
    if (!assetFileId || !deviceId || !senderLineNumber) {
      return c.json({ error: "assetFileId, deviceId, senderLineNumber are required" }, 400);
    }
    const result = await submitRemoteControl({
      userId,
      assetFileId,
      deviceId,
      senderLineNumber,
      action
    });
    if (!result.ok) {
      return c.json({ error: result.error, ignored: true }, result.status as 403 | 404);
    }
    return c.json({ ok: true, job: result.job, agents: result.agents });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/remote-control/queue", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const rows = await listRemoteControlQueue(userId, 120);
    const queue = rows.map((row) => ({
      id: row.id,
      assetFileId: row.asset_file_id,
      deviceId: row.device_id,
      senderLineNumber: row.sender_line_number,
      action: row.action,
      status: row.status,
      fileUrl: row.file_url,
      fileName: row.file_name,
      errorMessage: row.error_message,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));
    return c.json({ ok: true, queue });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/remote-control/agents", async (c) => {
  const userId = c.get("vlueUserId") as string;
  return c.json({ ok: true, agents: listConnectedAgents(userId) });
});

/** 원터치 그룹 일정 */
officeRoutes.post("/calendar/events", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.json<{
      groupId?: string;
      title?: string;
      body?: string;
      startsAt?: string;
      endsAt?: string;
      pushNotify?: boolean;
      notifyUserIds?: string[];
      memberUserIds?: string[];
    }>();
    const title = String(body.title || "").trim();
    const startsAt = String(body.startsAt || "").trim();
    const endsAt = String(body.endsAt || "").trim();
    if (!title || !startsAt || !endsAt) {
      return c.json({ error: "title, startsAt, endsAt are required" }, 400);
    }
    if (body.groupId && body.memberUserIds?.length) {
      await upsertGroupMembers(body.groupId, body.memberUserIds, userId);
    }
    const event = await createOfficeCalendarEvent({
      authorUserId: userId,
      groupId: body.groupId,
      title,
      body: body.body,
      startsAt,
      endsAt,
      pushNotify: body.pushNotify,
      notifyUserIds: body.notifyUserIds
    });
    return c.json({ ok: true, event });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/calendar/events", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const groupId = c.req.query("groupId") || undefined;
    const from = c.req.query("from") || undefined;
    const to = c.req.query("to") || undefined;
    const events = await listOfficeCalendarEvents({ groupId, userId, from, to });
    return c.json({ ok: true, events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** 홍보 미디어 — 다중 이미지 → 15초 MP4 */
officeRoutes.post("/media/upload", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = await c.req.parseBody();
    const title = typeof body.title === "string" ? body.title : undefined;
    const shopId = typeof body.shopId === "string" ? body.shopId : undefined;
    const files: Array<{ buffer: Buffer; name: string; mime?: string }> = [];
    for (const [key, val] of Object.entries(body)) {
      if (key === "title" || key === "shopId") continue;
      if (val && typeof val === "object" && "arrayBuffer" in val) {
        const f = val as File;
        const buffer = Buffer.from(await f.arrayBuffer());
        if (buffer.length) files.push({ buffer, name: f.name || key, mime: f.type });
      }
    }
    const campaign = await createMediaCampaignFromUploads({ userId, shopId, title, files });
    return c.json({ ok: true, campaign });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const code = message === "FILES_REQUIRED" || message === "NO_VALID_IMAGES" ? 400 : 500;
    return c.json({ error: message }, code);
  }
});

officeRoutes.get("/media/campaigns/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const campaign = await getMediaCampaign(c.req.param("id"), userId);
    if (!campaign) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ ok: true, campaign });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/media/files/:campaignId/:fileName", async (c) => {
  try {
    const full = await resolveMediaFilePath(c.req.param("campaignId"), c.req.param("fileName"));
    if (!full) return c.json({ error: "NOT_FOUND" }, 404);
    const buf = await readFile(full);
    const lower = full.toLowerCase();
    const type = lower.endsWith(".mp4")
      ? "video/mp4"
      : lower.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return c.json({ error: "NOT_FOUND" }, 404);
  }
});

/** POS RBAC — OWNER / STAFF 역할 */
officeRoutes.get("/pos-ledger/role", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const role = await getPosLedgerRole(userId);
    return c.json({ ok: true, ...role });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.post("/pos-ledger/staff", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { staffHandle?: string };
    const result = await invitePosStaff(userId, String(body.staffHandle || ""));
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/pos-ledger/staff", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const result = await listPosStaffForOwner(userId);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.patch("/pos-ledger/staff/:staffUserId", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as { transmitEnabled?: boolean };
    if (typeof body.transmitEnabled !== "boolean") {
      return c.json({ error: "transmitEnabled(boolean)가 필요합니다." }, 400);
    }
    const result = await updatePosStaffTransmit(userId, c.req.param("staffUserId"), body.transmitEnabled);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** POS 빌지 OCR 장부 — CS 스캐너 연동 */
officeRoutes.post("/pos-ledger/ingest", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await ingestPosBillFromOcr(userId, body);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.get("/pos-ledger/dashboard", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const dash = await getPosLedgerDashboard(userId);
    return c.json({ ok: true, ...dash });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

officeRoutes.patch("/pos-ledger/entries/:id", async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await patchPosLedgerEntry(userId, c.req.param("id"), body);
    return c.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

/** AI 엑셀 에디터 — /api/office/excel/* */
officeRoutes.route("/excel", officeExcelRoutes);
