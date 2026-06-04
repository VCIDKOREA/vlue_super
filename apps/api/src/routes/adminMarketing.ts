import type { AdminDevice } from "@prisma/client";
import { Hono } from "hono";
import { requireAdminDevice } from "../middleware/adminGate.js";
import {
  createMarketingPopup,
  listMarketingPopups
} from "../services/office/marketingPopupService.js";
import { listNotices, releaseNotice } from "../services/office/noticeService.js";

type AdminVars = { adminDevice: AdminDevice };

export const adminMarketingRoutes = new Hono<{ Variables: AdminVars }>();

adminMarketingRoutes.use("*", requireAdminDevice);

/** POST /api/admin/marketing/popups */
adminMarketingRoutes.post("/marketing/popups", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    imageUrl?: string;
    imageDataUrl?: string;
    linkUrl?: string;
    linkType?: "internal" | "external";
    startsAt?: string;
    endsAt?: string;
  };

  const imageUrl = String(body.imageUrl || body.imageDataUrl || "").trim();
  const startsAt = String(body.startsAt || "").trim();
  const endsAt = String(body.endsAt || "").trim();

  if (!imageUrl) return c.json({ error: "광고 이미지(imageUrl 또는 imageDataUrl)가 필요합니다." }, 400);
  if (!startsAt || !endsAt) return c.json({ error: "노출 시작일·종료일(startsAt, endsAt)이 필요합니다." }, 400);
  if (Number.isNaN(new Date(startsAt).getTime()) || Number.isNaN(new Date(endsAt).getTime())) {
    return c.json({ error: "날짜 형식이 올바르지 않습니다." }, 400);
  }
  if (new Date(startsAt) > new Date(endsAt)) {
    return c.json({ error: "시작일은 종료일보다 이전이어야 합니다." }, 400);
  }

  const adminDevice = c.get("adminDevice");
  const popup = await createMarketingPopup({
    title: String(body.title || "VLUE 마케팅").trim(),
    imageUrl,
    linkUrl: String(body.linkUrl || "").trim() || undefined,
    linkType: body.linkType === "internal" ? "internal" : "external",
    startsAt,
    endsAt,
    adminDeviceId: adminDevice.id
  });

  return c.json({ ok: true, popup });
});

adminMarketingRoutes.get("/marketing/popups", async (c) => {
  const popups = await listMarketingPopups(30);
  return c.json({ ok: true, popups });
});

/** POST /api/admin/notices/release */
adminMarketingRoutes.post("/notices/release", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    highlightText?: string;
    bodyText?: string;
  };

  const title = String(body.title || "").trim();
  const bodyText = String(body.bodyText || "").trim();
  if (!title) return c.json({ error: "공지 제목(title)이 필요합니다." }, 400);
  if (!bodyText) return c.json({ error: "상세 내용(bodyText)이 필요합니다." }, 400);

  const adminDevice = c.get("adminDevice");
  const result = await releaseNotice({
    title,
    highlightText: String(body.highlightText || "").trim() || undefined,
    bodyText,
    adminDeviceId: adminDevice.id
  });

  return c.json({
    ok: true,
    notice: result.notice,
    deliveredConnections: result.deliveredConnections
  });
});

adminMarketingRoutes.get("/notices", async (c) => {
  const notices = await listNotices(30);
  return c.json({ ok: true, notices });
});
