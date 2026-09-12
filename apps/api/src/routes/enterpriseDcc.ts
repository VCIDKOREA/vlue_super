import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { requireAdminConsoleBearer } from "../middleware/adminConsoleGate.js";
import {
  getMyEnterpriseDccApplication,
  listPendingEnterpriseDccApplications,
  listRelatedPartiesForBizNo,
  listOwnerPendingDccApprovals,
  markEnterpriseDccPaid,
  reviewEnterpriseDccApplication,
  reviewOwnerDccApproval,
  requestOwnerApproval,
  saveEnterpriseDccDetails,
  saveEnterpriseDccDocuments,
  saveEnterpriseWorkplace,
  attestEnterpriseDccSecurity,
  sendRelatedPartyOtp,
  submitEnterpriseDccForApproval,
  verifyBusinessAndStartApplication,
  verifyRelatedPartyOtp,
  isDccCreateBanned
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

/** GET /api/cards/enterprise-dcc/owner-pending — 대표자 대기함 (반드시 /:id 보다 위) */
enterpriseDccRoutes.get("/owner-pending", async (c) => {
  const userId = c.get("vlueUserId");
  const data = await listOwnerPendingDccApprovals(userId);
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
    contactEmail?: string;
    emailVerifyToken?: string;
    token?: string;
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
      contactEmail: String(body.contactEmail || ""),
      emailVerifyToken: String(body.emailVerifyToken || body.token || ""),
      dccOutboundPhone: String(body.dccOutboundPhone || ""),
      manageLoginId: String(body.manageLoginId || ""),
      managePassword: String(body.managePassword || "")
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "저장 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/request-owner-approval — 시나리오 A */
enterpriseDccRoutes.post("/:id/request-owner-approval", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    relatedPartyUserId?: string;
    department?: string;
    contactName?: string;
    confirmAcknowledged?: boolean;
  };
  try {
    const result = await requestOwnerApproval({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      relatedPartyUserId: String(body.relatedPartyUserId || ""),
      department: body.department,
      contactName: body.contactName,
      confirmAcknowledged: Boolean(body.confirmAcknowledged)
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "요청 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/owner-review — 대표자 승인/거절 */
enterpriseDccRoutes.post("/:id/owner-review", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    action?: string;
    rejectReason?: string;
    reportImpersonation?: boolean;
  };
  try {
    const result = await reviewOwnerDccApproval({
      applicationId: c.req.param("id"),
      ownerUserId: userId,
      action: body.action === "reject" ? "reject" : "approve",
      rejectReason: body.rejectReason,
      reportImpersonation: Boolean(body.reportImpersonation)
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "처리 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/documents — 시나리오 B 서류 */
enterpriseDccRoutes.post("/:id/documents", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    documents?: Array<{ kind: string; url: string; fileName?: string }>;
    workplaceAddress?: string;
  };
  try {
    const result = await saveEnterpriseDccDocuments({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      documents: Array.isArray(body.documents) ? body.documents : [],
      workplaceAddress: body.workplaceAddress
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "서류 저장 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/workplace */
enterpriseDccRoutes.post("/:id/workplace", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    workplaceAddress?: string;
    workplaceLat?: number;
    workplaceLng?: number;
  };
  try {
    const result = await saveEnterpriseWorkplace({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      workplaceAddress: String(body.workplaceAddress || ""),
      workplaceLat: body.workplaceLat,
      workplaceLng: body.workplaceLng
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "주소 저장 실패" }, 400);
  }
});

/** POST /api/cards/enterprise-dcc/:id/security-attest — 위치·보안 게이트 */
enterpriseDccRoutes.post("/:id/security-attest", async (c) => {
  const userId = c.get("vlueUserId");
  const body = (await c.req.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
    networkType?: string;
    vpnActive?: boolean;
    installedPackages?: string[];
  };
  try {
    if (await isDccCreateBanned(userId)) {
      return c.json({ error: "DCC 생성 권한이 영구 차단된 계정입니다." }, 403);
    }
    const result = await attestEnterpriseDccSecurity({
      applicationId: c.req.param("id"),
      applicantUserId: userId,
      lat: Number(body.lat),
      lng: Number(body.lng),
      networkType: String(body.networkType || "unknown"),
      vpnActive: Boolean(body.vpnActive),
      installedPackages: Array.isArray(body.installedPackages) ? body.installedPackages : []
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "인증 실패" }, 400);
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
