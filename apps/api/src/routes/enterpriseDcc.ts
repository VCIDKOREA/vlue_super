import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { requireAdminConsoleBearer } from "../middleware/adminConsoleGate.js";
import {
  getMyEnterpriseDccApplication,
  listPendingEnterpriseDccApplications,
  listRelatedPartiesForBizNo,
  markEnterpriseDccPaid,
  reviewEnterpriseDccApplication,
  saveEnterpriseDccDetails,
  sendRelatedPartyOtp,
  submitEnterpriseDccForApproval,
  verifyBusinessAndStartApplication,
  verifyRelatedPartyOtp
} from "../services/bizcard/enterpriseDccApplyService.js";

type Vars = { vlueUserId: string; adminConsoleUser?: { id: string } };

export const enterpriseDccRoutes = new Hono<{ Variables: Vars }>();

enterpriseDccRoutes.use("*", requireUserHeader);

/** GET /api/cards/enterprise-dcc/mine */
enterpriseDccRoutes.get("/mine", async (c) => {
  const userId = c.get("vlueUserId");
  const application = await getMyEnterpriseDccApplication(userId);
  return c.json({ ok: true, application });
});

/** GET /api/cards/enterprise-dcc/related-parties?bno= */
enterpriseDccRoutes.get("/related-parties", async (c) => {
  const bno = String(c.req.query("bno") || "");
  const data = await listRelatedPartiesForBizNo(bno);
  return c.json({ ok: true, ...data });
});

/** POST /api/cards/enterprise-dcc/verify-business — 1~2단계 */
enterpriseDccRoutes.post("/verify-business", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    businessRegistrationNo?: string;
    representativeName?: string;
    openDate?: string;
    proposedCompanyName?: string;
  };
  try {
    const result = await verifyBusinessAndStartApplication({
      applicantUserId: userId,
      businessRegistrationNo: String(body.businessRegistrationNo || ""),
      representativeName: String(body.representativeName || ""),
      openDate: String(body.openDate || ""),
      proposedCompanyName: body.proposedCompanyName
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "검증 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/send-otp — 3단계 */
enterpriseDccRoutes.post("/:id/send-otp", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as { relatedPartyUserId?: string };
  try {
    const result = await sendRelatedPartyOtp({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      relatedPartyUserId: String(body.relatedPartyUserId || "")
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "발송 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/verify-otp — 4단계 */
enterpriseDccRoutes.post("/:id/verify-otp", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as { otp?: string };
  try {
    const result = await verifyRelatedPartyOtp({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      otp: String(body.otp || "")
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "인증 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/details — 5단계 */
enterpriseDccRoutes.post("/:id/details", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    department?: string;
    contactName?: string;
    dccOutboundPhone?: string;
    manageLoginId?: string;
    managePassword?: string;
  };
  try {
    const result = await saveEnterpriseDccDetails({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      department: String(body.department || ""),
      contactName: String(body.contactName || ""),
      dccOutboundPhone: String(body.dccOutboundPhone || ""),
      manageLoginId: String(body.manageLoginId || ""),
      managePassword: String(body.managePassword || "")
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "저장 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/submit — 6단계 */
enterpriseDccRoutes.post("/:id/submit", async (c) => {
  const userId = c.get("vlueUserId");
  try {
    const result = await submitEnterpriseDccForApproval({
      applicationId: c.req.param("id"),
      applicantUserId: userId
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "제출 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/mark-paid — 7단계 결제 완료 후 */
enterpriseDccRoutes.post("/:id/mark-paid", async (c) => {
  const userId = c.get("vlueUserId");
  try {
    const result = await markEnterpriseDccPaid(c.req.param("id"), userId);
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "처리 실패" }, 400);
  }
});

/** 관리자 — 승인 큐 (admin console bearer) */
export const enterpriseDccAdminRoutes = new Hono<{ Variables: { adminConsoleUser: { id: string } } }>();

enterpriseDccAdminRoutes.use("*", requireAdminConsoleBearer);

enterpriseDccAdminRoutes.get("/pending", async (c) => {
  const items = await listPendingEnterpriseDccApplications(80);
  return c.json({ ok: true, items });
});

enterpriseDccAdminRoutes.post("/:id/review", async (c) => {
  const admin = c.get("adminConsoleUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    action?: string;
    adminNote?: string;
  };
  const action = body.action === "reject" ? "reject" : "approve";
  try {
    const result = await reviewEnterpriseDccApplication({
      applicationId: c.req.param("id"),
      reviewerUserId: admin.id,
      action,
      adminNote: body.adminNote
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "처리 실패" }, 400);
  }
});
