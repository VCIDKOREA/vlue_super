import type { AdminDevice } from "@prisma/client";
import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { requireAdminDevice } from "../middleware/adminGate.js";
import {
  approveCorporateAttribution,
  CorporateAttributionApproveError
} from "../services/b2b/corporateAttributionApprove.js";
import {
  getOnboardingStats,
  listManualReviewQueue,
  mapManualReviewRows,
  resolveManualReview
} from "../services/onboarding/automatedOnboardingService.js";
import {
  listTitleDeptPendingForAdmin,
  resolveTitleDeptReviewForAdmin
} from "../services/bizcard/titleDeptReviewService.js";

type AdminVars = { adminDevice: AdminDevice };

export const adminV1Routes = new Hono<{ Variables: AdminVars }>();

adminV1Routes.use("*", requireAdminDevice);

function normalizeDocumentLinks(documentUrls: unknown): { url: string; label: string }[] {
  if (!documentUrls) return [];
  const arr = Array.isArray(documentUrls) ? documentUrls : [];
  return arr
    .map((item, i) => {
      if (typeof item === "string" && item.trim()) {
        return { url: item.trim(), label: `증빙 ${i + 1}` };
      }
      if (item && typeof item === "object" && "url" in item) {
        const u = String((item as { url?: string }).url || "").trim();
        const label = String((item as { label?: string }).label || `증빙 ${i + 1}`).trim();
        if (u) return { url: u, label };
      }
      return null;
    })
    .filter((x): x is { url: string; label: string } => Boolean(x));
}

/** 서류 검증 대기 귀속 요청 목록 */
adminV1Routes.get("/corporate-attribution/pending", async (c) => {
  const rows = await prisma.corporateAttributionRequest.findMany({
    where: { status: "pending_doc_verification" },
    orderBy: { createdAt: "asc" },
    include: {
      enterprise: { select: { id: true, companyName: true, status: true, billingCycle: true } },
      memberUser: { select: { id: true, legalName: true, phoneE164: true } }
    },
    take: 100
  });

  const requests = await Promise.all(
    rows.map(async (r) => {
      const line = await prisma.b2BCartLine.findFirst({
        where: {
          enterpriseId: r.enterpriseId,
          realCliPhoneE164: r.memberPhoneE164
        },
        select: { assigneeName: true, assigneeTitle: true }
      });
      return {
        ...r,
        memberDisplayName: line?.assigneeName || r.memberUser.legalName || "",
        memberTitle: line?.assigneeTitle || null,
        documentLinks: normalizeDocumentLinks(r.documentUrls)
      };
    })
  );

  return c.json({ requests });
});

adminV1Routes.get("/onboarding/stats", async (c) => {
  const stats = await getOnboardingStats();
  return c.json({ ok: true, stats });
});

adminV1Routes.get("/onboarding/manual-review", async (c) => {
  const rows = await listManualReviewQueue(100);
  return c.json({ ok: true, requests: mapManualReviewRows(rows) });
});

adminV1Routes.post("/onboarding/resolve", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    reviewId?: string;
    action?: "approve" | "reject";
    adminNote?: string;
  };
  const reviewId = String(body.reviewId || "").trim();
  const action = body.action === "reject" ? "reject" : "approve";
  if (!reviewId) return c.json({ error: "reviewId 가 필요합니다." }, 400);
  const adminDevice = c.get("adminDevice");
  try {
    const result = await resolveManualReview({
      reviewId,
      action,
      adminDeviceId: adminDevice.id,
      adminNote: body.adminNote
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return c.json({ error: msg }, msg === "REVIEW_NOT_FOUND" ? 404 : 400);
  }
});

/** 직책·부서 확인 서류 검토 대기 */
adminV1Routes.get("/title-dept/pending", async (c) => {
  const requests = await listTitleDeptPendingForAdmin();
  return c.json({ ok: true, requests });
});

adminV1Routes.post("/title-dept/resolve", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    reviewId?: string;
    action?: "approve" | "reject";
    adminNote?: string;
  };
  const reviewId = String(body.reviewId || "").trim();
  const action = body.action === "reject" ? "reject" : "approve";
  if (!reviewId) return c.json({ error: "reviewId 가 필요합니다." }, 400);
  const adminDevice = c.get("adminDevice");
  try {
    const result = await resolveTitleDeptReviewForAdmin({
      reviewId,
      action,
      adminDeviceId: adminDevice.id,
      adminNote: body.adminNote
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return c.json({ error: msg }, msg === "REVIEW_NOT_FOUND" ? 404 : 400);
  }
});

/**
 * POST /api/v1/admin/corporate-attribution/approve
 * Body: { requestId: string, adminNote?: string }
 */
adminV1Routes.post("/corporate-attribution/approve", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    requestId?: string;
    adminNote?: string;
  };
  const requestId = String(body.requestId || "").trim();
  if (!requestId) {
    return c.json({ error: "requestId 가 필요합니다." }, 400);
  }

  const adminDevice = c.get("adminDevice");

  try {
    const result = await approveCorporateAttribution(
      requestId,
      adminDevice.id,
      body.adminNote
    );
    return c.json(result);
  } catch (e) {
    if (e instanceof CorporateAttributionApproveError) {
      const status = e.code === "NOT_FOUND" ? 404 : 409;
      return c.json({ error: e.message, code: e.code }, status);
    }
    throw e;
  }
});
