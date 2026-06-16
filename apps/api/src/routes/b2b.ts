import type { B2BEnterpriseStatus, Prisma } from "@prisma/client";
import { Hono } from "hono";
import { prisma } from "../db/client.js";

const ENTERPRISE_PENDING_DOC = "pending_doc_verification" as B2BEnterpriseStatus;
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  addCartLine,
  buildInvoicePreview,
  patchCartLineRole,
  requestCorporateAttribution,
  upsertEnterpriseDraft,
  validateCartCheckout,
  type CartLineInput
} from "../services/b2b/cartEngine.js";
import { applyB2bVluerBlock } from "../services/b2b/vluerEligibility.js";
import { buildCardProfileJsonForLine } from "../lib/b2bLineDisplay.js";
import { assignEnterpriseMemberRole, listMemberCredentialsForMaster, provisionEnterpriseAccounts } from "../services/enterprise/enterpriseProvisioning.js";
import { listGroupChatMessages, postGroupChatMessage } from "../services/enterprise/groupChatService.js";
import {
  listEnterpriseMembers,
  updateEnterpriseCartLine,
  updateEnterpriseMemberAccount
} from "../services/enterprise/enterpriseMemberService.js";
import { roleLabelKo } from "../services/enterprise/enterpriseRoles.js";
import { getMembershipUiContext } from "../services/b2b/membershipUiContext.js";
import {
  appendEnrollmentDocuments,
  appendAttributionRequestDocument,
  buildMockStorageUrl,
  ENROLLMENT_DOC_KINDS,
  ENROLLMENT_DOC_LABELS,
  getEnrollmentStatus,
  submitEnterpriseEnrollment,
  type EnrollmentDocKind
} from "../services/b2b/enrollmentDocuments.js";
import {
  getEnterpriseBranding,
  parseBrandingPayload,
  patchEnterpriseBranding,
  uploadEnterpriseLogo
} from "../services/b2b/enterpriseBranding.js";
import { logB2bPipeline } from "../lib/b2bPipelineLog.js";
import { handleB2bRouteError } from "../lib/b2bRouteError.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

export const b2bRoutes = new Hono();

b2bRoutes.use("*", requireUserHeader);

async function getOrCreateDraft(adminUserId: string) {
  let ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId, status: "draft" },
    orderBy: { createdAt: "desc" },
    include: { cartLines: { orderBy: { sortOrder: "asc" } } }
  });
  if (!ent) {
    ent = await prisma.b2BEnterpriseAccount.create({
      data: {
        adminUserId,
        companyName: "미입력 기업",
        masterDisplayNumber: "1588-0000",
        carrier: "LGUPLUS",
        status: "draft"
      },
      include: { cartLines: true }
    });
  }
  return ent;
}

async function resolveB2bBillingOpts(adminUserId: string) {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId: adminUserId },
    orderBy: { createdAt: "desc" },
    select: { referralCodeUsed: true }
  });
  return { hasReferral: Boolean(sub?.referralCodeUsed) };
}

async function previewEnterpriseInvoice(
  adminUserId: string,
  employeeLineCount: number,
  cycle: "monthly" | "annual"
) {
  const opts = await resolveB2bBillingOpts(adminUserId);
  return buildInvoicePreview(employeeLineCount, cycle, opts);
}

b2bRoutes.get("/enterprise/me", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const ent = await prisma.b2BEnterpriseAccount.findFirst({
      where: { adminUserId: me },
      orderBy: { updatedAt: "desc" },
      include: { cartLines: { orderBy: { sortOrder: "asc" } } }
    });
    if (!ent) return c.json({ enterprise: null });
    const invoice = await previewEnterpriseInvoice(me, ent.cartLines.length, ent.billingCycle);
    return c.json({ enterprise: ent, invoice });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/me", err);
  }
});

b2bRoutes.post("/enterprise/setup", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    companyName?: string;
    masterDisplayNumber?: string;
    carrier?: string;
    billingCycle?: string;
  };

  const carrier = body.carrier === "KT" ? "KT" : "LGUPLUS";
  const billingCycle = body.billingCycle === "annual" ? "annual" : "monthly";

  const ent = await upsertEnterpriseDraft(me, {
    companyName: String(body.companyName || "").trim() || "미입력 기업",
    masterDisplayNumber: String(body.masterDisplayNumber || "").trim() || "1588-0000",
    carrier,
    billingCycle
  });

  await applyB2bVluerBlock(me);

  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { sortOrder: "asc" }
  });

  return c.json({
    enterprise: { ...ent, cartLines: lines },
    invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle),
    vluerBlocked: true
  });
});

b2bRoutes.post("/cart/lines", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as CartLineInput & {
    memberPhone?: string;
  };

  const ent = await getOrCreateDraft(me);
  const result = await addCartLine(ent.id, {
    lineKind: body.lineKind === "mobile" ? "mobile" : "extension",
    realCliPhone: String(body.realCliPhone || ""),
    assigneeName: String(body.assigneeName || ""),
    assigneeTitle: body.assigneeTitle,
    enterpriseRole: body.enterpriseRole,
    useMasterDisplayNumber: Boolean(body.useMasterDisplayNumber)
  });

  if (!result.ok) return c.json({ error: result.error }, 400);

  if (body.lineKind === "mobile" && body.realCliPhone) {
    const attr = await requestCorporateAttribution(ent.id, body.realCliPhone);
    if (attr.ok && attr.request && !attr.alreadyExists) {
      /* PENDING_DOC_VERIFICATION 생성됨 */
    }
  }

  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { sortOrder: "asc" }
  });

  return c.json({
    line: result.line,
    invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle),
    lineCount: lines.length,
    groupChat: result.groupChat
  });
});

b2bRoutes.patch("/cart/lines/:lineId", async (c) => {
  const me = c.get("vlueUserId")!;
  const lineId = c.req.param("lineId");
  const body = (await c.req.json().catch(() => ({}))) as {
    useMasterDisplayNumber?: boolean;
    enterpriseRole?: string;
    assigneeName?: string;
    assigneeTitle?: string;
    realCliPhone?: string;
    lineKind?: string;
  };
  const ent = await getOrCreateDraft(me);

  const hasMemberEdit =
    body.assigneeName !== undefined ||
    body.assigneeTitle !== undefined ||
    body.realCliPhone !== undefined ||
    body.lineKind !== undefined ||
    body.enterpriseRole !== undefined;

  if (hasMemberEdit) {
    try {
      const result = await updateEnterpriseCartLine(me, lineId, {
        assigneeName: body.assigneeName,
        assigneeTitle: body.assigneeTitle,
        realCliPhone: body.realCliPhone,
        lineKind: body.lineKind === "mobile" ? "mobile" : body.lineKind === "extension" ? "extension" : undefined,
        enterpriseRole: body.enterpriseRole
      });
      if ("useMasterDisplayNumber" in body) {
        await prisma.b2BCartLine.updateMany({
          where: { id: lineId, enterpriseId: ent.id },
          data: { useMasterDisplayNumber: Boolean(body.useMasterDisplayNumber) }
        });
      }
      const lines = await prisma.b2BCartLine.findMany({
        where: { enterpriseId: ent.id },
        orderBy: { sortOrder: "asc" }
      });
      return c.json({
        ok: true,
        line: result.line,
        groupChat: result.groupChat,
        invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle),
        lineCount: lines.length
      });
    } catch (err) {
      return handleB2bRouteError(c, "/cart/lines/patch", err);
    }
  }

  if (body.enterpriseRole) {
    const patched = await patchCartLineRole(ent.id, lineId, String(body.enterpriseRole));
    if (!patched.ok) return c.json({ error: patched.error }, 404);
  }
  if ("useMasterDisplayNumber" in body) {
    await prisma.b2BCartLine.updateMany({
      where: { id: lineId, enterpriseId: ent.id },
      data: { useMasterDisplayNumber: Boolean(body.useMasterDisplayNumber) }
    });
  }
  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { sortOrder: "asc" }
  });
  return c.json({
    ok: true,
    invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle),
    lineCount: lines.length
  });
});

b2bRoutes.delete("/cart/lines/:lineId", async (c) => {
  const me = c.get("vlueUserId")!;
  const lineId = c.req.param("lineId");
  const ent = await getOrCreateDraft(me);
  await prisma.b2BCartLine.deleteMany({
    where: { id: lineId, enterpriseId: ent.id }
  });
  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id }
  });
  return c.json({
    invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle),
    lineCount: lines.length
  });
});

b2bRoutes.get("/cart/invoice-preview", async (c) => {
  const me = c.get("vlueUserId")!;
  const ent = await getOrCreateDraft(me);
  const lines = await prisma.b2BCartLine.count({ where: { enterpriseId: ent.id } });
  return c.json(await previewEnterpriseInvoice(me, lines, ent.billingCycle));
});

b2bRoutes.post("/cart/checkout-validate", async (c) => {
  const me = c.get("vlueUserId")!;
  const ent = await getOrCreateDraft(me);
  const count = await prisma.b2BCartLine.count({ where: { enterpriseId: ent.id } });
  const validation = validateCartCheckout(count);
  if (!validation.ok) return c.json({ ok: false, error: validation.error }, 400);
  return c.json({
    ok: true,
    invoice: await previewEnterpriseInvoice(me, count, ent.billingCycle)
  });
});

b2bRoutes.get("/enrollment/status", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const data = await getEnrollmentStatus(me);
    return c.json(data);
  } catch (err) {
    return handleB2bRouteError(c, "/enrollment/status", err);
  }
});

/** 목업 파일 업로드 → documentUrls 에 병합 */
b2bRoutes.post("/enrollment/documents", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    fileName?: string;
    url?: string;
  };

  const kind = String(body.kind || "").trim() as EnrollmentDocKind;
  if (!ENROLLMENT_DOC_KINDS.includes(kind)) {
    return c.json({ error: "유효하지 않은 서류 종류입니다." }, 400);
  }

  const ent = await getOrCreateDraft(me);
  const fileName = String(body.fileName || "document.pdf").trim();
  const url =
    String(body.url || "").trim() ||
    buildMockStorageUrl(ent.id, kind, fileName);

  const result = await appendEnrollmentDocuments(me, [
    {
      kind,
      label: ENROLLMENT_DOC_LABELS[kind],
      url,
      fileName,
      uploadedAt: new Date().toISOString()
    }
  ]);

  if (!result.ok) return c.json({ error: result.error }, 400);
  const status = await getEnrollmentStatus(me);
  return c.json({ ...result, enrollment: status.enrollment });
});

/** 10회선 + 필수 서류 완료 시 본사 승인 대기 제출 */
b2bRoutes.post("/enrollment/submit", async (c) => {
  const me = c.get("vlueUserId")!;
  const result = await submitEnterpriseEnrollment(me);
  if (!result.ok) return c.json({ error: result.error }, 400);
  const status = await getEnrollmentStatus(me);
  return c.json({ ...result, enrollment: status.enrollment });
});

b2bRoutes.get("/enterprise/branding", async (c) => {
  const me = c.get("vlueUserId")!;
  const data = await getEnterpriseBranding(me);
  return c.json(data);
});

b2bRoutes.post("/enterprise/branding/logo", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as {
      dataUrl?: string;
      fileName?: string;
    };
    const result = await uploadEnterpriseLogo(me, body);
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json(result);
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/branding/logo", err);
  }
});

b2bRoutes.patch("/enterprise/branding", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseBrandingPayload(body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const result = await patchEnterpriseBranding(me, parsed.branding);
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json(result);
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/branding", err);
  }
});

/** E2E 파이프라인 점검 (목업) */
b2bRoutes.get("/mock/e2e-pipeline", async (c) => {
  const me = c.get("vlueUserId")!;
  const [enrollment, branding, membership] = await Promise.all([
    getEnrollmentStatus(me),
    getEnterpriseBranding(me),
    getMembershipUiContext(me)
  ]);

  const steps = [
    {
      step: 1,
      name: "기업 가입·서류 업로드",
      ok: Boolean(enrollment.enrollment?.documentsComplete),
      detail: enrollment.enrollment?.statusLabel ?? "NO_ENTERPRISE"
    },
    {
      step: 2,
      name: "본사 어드민 승인 대기/완료",
      ok:
        enrollment.enterprise?.status === "active" ||
        enrollment.enrollment?.pendingAttributionCount === 0,
      detail: enrollment.enterprise?.status ?? "none"
    },
    {
      step: 3,
      name: "임직원 UI 오버라이드",
      ok: membership.override_by_company === true,
      detail: membership.override_by_company
    },
    {
      step: 4,
      name: "VLUER 락(귀속 시)",
      ok: Boolean(membership.corporate_active),
      detail: membership.corporate_active ? "corporate_member" : "not_attributed"
    }
  ];

  logB2bPipeline("e2e.check", { userId: me, steps });

  return c.json({
    userId: me,
    enrollment: enrollment.enrollment,
    enterpriseStatus: enrollment.enterprise?.status,
    branding: branding.branding,
    membership: {
      override_by_company: membership.override_by_company,
      corporate_active: membership.corporate_active,
      personal_data_preserved: membership.personal_data_preserved
    },
    steps,
    pipelineGuide: [
      "1) B2B 회선 10+ · 서류 3종 업로드 · 가입 신청 제출",
      "2) 본사 어드민 URL → 귀속 승인 관리 → 최종 승인",
      "3) 귀속 임직원 앱 로그인 → 명함 CI 오버라이드 · VLUER 메뉴 차단 확인",
      "GET /api/b2b/mock/e2e-pipeline 로 상태 점검"
    ]
  });
});

/** 결제 승인(목업) — 회선 BusinessCard 생성 · 대표번호 마스킹 연동 */
b2bRoutes.post("/cart/activate", async (c) => {
  const me = c.get("vlueUserId")!;
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: me },
    orderBy: { updatedAt: "desc" },
    include: { cartLines: { orderBy: { sortOrder: "asc" } } }
  });
  if (!ent) {
    return c.json({ error: "B2B 기업 계정이 없습니다." }, 400);
  }
  if (ent.status === ENTERPRISE_PENDING_DOC) {
    return c.json(
      {
        error:
          "본사 승인(PENDING_DOC_VERIFICATION) 완료 후 활성화할 수 있습니다. 어드민 귀속 승인을 먼저 진행하세요."
      },
      409
    );
  }
  if (ent.status !== "active" && ent.status !== "draft") {
    return c.json({ error: `현재 기업 상태(${ent.status})에서는 활성화할 수 없습니다.` }, 409);
  }
  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { sortOrder: "asc" }
  });

  const validation = validateCartCheckout(lines.length);
  if (!validation.ok) return c.json({ ok: false, error: validation.error }, 400);

  const createdCards = [];
  for (const line of lines) {
    const e164 = line.realCliPhoneE164;
    const existing = await prisma.businessCard.findFirst({
      where: { phoneE164: e164 }
    });
    if (existing) continue;

    const card = await prisma.businessCard.create({
      data: {
        userId: me,
        kind: line.lineKind === "mobile" ? "mobile" : "extension",
        phoneE164: e164,
        displayName: line.assigneeName,
        jobTitle: line.assigneeTitle,
        companyName: ent.companyName,
        verificationStatus: "approved",
        isPremiumLine: true,
        b2bEnterpriseId: ent.id,
        b2bCartLineId: line.id,
        profileJson: buildCardProfileJsonForLine(ent, line) as Prisma.InputJsonValue
      }
    });
    createdCards.push(card);
  }

  if (ent.status === "draft") {
    await prisma.b2BEnterpriseAccount.update({
      where: { id: ent.id },
      data: { status: "active" }
    });
  }

  await provisionEnterpriseAccounts(ent.id, me);

  logB2bPipeline("cart.activated", {
    enterpriseId: ent.id,
    cardsCreated: createdCards.length
  });

  const credentials = await listMemberCredentialsForMaster(me).catch(() => []);

  return c.json({
    ok: true,
    enterpriseId: ent.id,
    cardsCreated: createdCards.length,
    credentials: credentials.map((c) => ({
      ...c,
      roleLabel: roleLabelKo(c.enterpriseRole)
    })),
    invoice: await previewEnterpriseInvoice(me, lines.length, ent.billingCycle)
  });
});

/** 귀속 중 명함 UI — 개인 데이터 유지, override_by_company 플래그 */
b2bRoutes.get("/membership-ui-context", async (c) => {
  const me = c.get("vlueUserId")!;
  const ctx = await getMembershipUiContext(me);
  return c.json(ctx);
});

b2bRoutes.post("/attribution/request", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as { phone?: string };
  const ent = await getOrCreateDraft(me);
  const result = await requestCorporateAttribution(ent.id, String(body.phone || ""));
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ request: result.request, alreadyExists: result.alreadyExists });
});

/** 담당자 회선 — 귀속 요청별 증빙 서류 (1회 인증 전) */
b2bRoutes.post("/attribution/documents", async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    requestId?: string;
    kind?: string;
    fileName?: string;
    url?: string;
  };
  const requestId = String(body.requestId || "").trim();
  if (!requestId) return c.json({ error: "requestId 가 필요합니다." }, 400);
  const result = await appendAttributionRequestDocument(me, requestId, {
    kind: String(body.kind || ""),
    fileName: String(body.fileName || "document.pdf"),
    url: body.url
  });
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json(result);
});

/** 대표/대리인 — 경리(BUYER)·대리인(MANAGER) 역할 지정 */
b2bRoutes.patch("/enterprise/members/:userId/role", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as { role?: string };
    const role = body.role === "MANAGER" || body.role === "BUYER" ? body.role : "STAFF";
    const updated = await assignEnterpriseMemberRole(me, c.req.param("userId"), role);
    return c.json({ ok: true, user: { id: updated.id, enterpriseRole: updated.enterpriseRole } });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/members/role", err);
  }
});

b2bRoutes.get("/enterprise/member-credentials", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const list = await listMemberCredentialsForMaster(me);
    return c.json({
      credentials: list.map((row) => ({ ...row, roleLabel: roleLabelKo(row.enterpriseRole) }))
    });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/member-credentials", err);
  }
});

b2bRoutes.get("/enterprise/members", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const data = await listEnterpriseMembers(me);
    return c.json(data);
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/members", err);
  }
});

b2bRoutes.patch("/enterprise/members/:userId", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as {
      assigneeName?: string;
      enterpriseDept?: string;
      enterpriseRole?: string;
      phone?: string;
      resetPassword?: boolean;
    };
    const result = await updateEnterpriseMemberAccount(me, c.req.param("userId"), body);
    return c.json({ ok: true, ...result });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/members/patch", err);
  }
});

b2bRoutes.patch("/enterprise/cart-lines/:lineId", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as {
      assigneeName?: string;
      assigneeTitle?: string;
      realCliPhone?: string;
      lineKind?: string;
      enterpriseRole?: string;
    };
    const result = await updateEnterpriseCartLine(me, c.req.param("lineId"), {
      assigneeName: body.assigneeName,
      assigneeTitle: body.assigneeTitle,
      realCliPhone: body.realCliPhone,
      lineKind: body.lineKind === "mobile" ? "mobile" : body.lineKind === "extension" ? "extension" : undefined,
      enterpriseRole: body.enterpriseRole
    });
    return c.json({ ok: true, ...result });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/cart-lines/patch", err);
  }
});

b2bRoutes.get("/enterprise/group-chat/messages", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const data = await listGroupChatMessages(me);
    return c.json(data);
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/group-chat/messages", err);
  }
});

b2bRoutes.post("/enterprise/group-chat/messages", async (c) => {
  try {
    const me = c.get("vlueUserId")!;
    const body = (await c.req.json().catch(() => ({}))) as { content?: string };
    const msg = await postGroupChatMessage(me, String(body.content || ""));
    return c.json({ ok: true, message: msg });
  } catch (err) {
    return handleB2bRouteError(c, "/enterprise/group-chat/messages", err);
  }
});
