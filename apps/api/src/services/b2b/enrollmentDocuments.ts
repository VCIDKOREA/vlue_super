import type { B2BEnterpriseStatus, Prisma } from "@prisma/client";

const ENTERPRISE_PENDING_DOC = "pending_doc_verification" as B2BEnterpriseStatus;
import { randomUUID } from "crypto";
import { prisma } from "../../db/client.js";
import { validateCartCheckout } from "./cartEngine.js";
import { logB2bPipeline } from "../../lib/b2bPipelineLog.js";

export const ENROLLMENT_DOC_KINDS = [
  "employment_certificate",
  "wage_contract",
  "business_registration"
] as const;

export type EnrollmentDocKind = (typeof ENROLLMENT_DOC_KINDS)[number];

export const ENROLLMENT_DOC_LABELS: Record<EnrollmentDocKind, string> = {
  employment_certificate: "재직증명서",
  wage_contract: "위축계약서",
  business_registration: "사업자등록증"
};

export type EnrollmentDocumentEntry = {
  kind: EnrollmentDocKind;
  label: string;
  url: string;
  fileName?: string;
  uploadedAt: string;
};

function asDocArray(raw: unknown): EnrollmentDocumentEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is EnrollmentDocumentEntry =>
      Boolean(x && typeof x === "object" && "url" in x && "kind" in x)
  ) as EnrollmentDocumentEntry[];
}

export function mergeDocumentUrls(
  existing: unknown,
  incoming: EnrollmentDocumentEntry[]
): EnrollmentDocumentEntry[] {
  const arr = asDocArray(existing);
  for (const doc of incoming) {
    const idx = arr.findIndex((d) => d.kind === doc.kind);
    if (idx >= 0) arr[idx] = doc;
    else arr.push(doc);
  }
  return arr;
}

export function buildMockStorageUrl(
  enterpriseId: string,
  kind: string,
  fileName: string
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `https://storage.vlue.mock/b2b/${enterpriseId}/${kind}/${randomUUID()}-${safe}`;
}

export async function ensureEnterpriseEnrollmentAttribution(
  db: typeof prisma,
  enterpriseId: string,
  adminUserId: string
) {
  const user = await db.user.findUnique({
    where: { id: adminUserId },
    select: { phoneE164: true, legalName: true }
  });
  const phone = user?.phoneE164?.trim() || "+8201000000000";

  const existing = await db.corporateAttributionRequest.findFirst({
    where: { enterpriseId, memberUserId: adminUserId }
  });
  if (existing) return existing;

  return db.corporateAttributionRequest.create({
    data: {
      enterpriseId,
      memberUserId: adminUserId,
      memberPhoneE164: phone,
      status: "pending_doc_verification"
    }
  });
}

export async function appendEnrollmentDocuments(
  adminUserId: string,
  docs: EnrollmentDocumentEntry[]
) {
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId, status: { in: ["draft", ENTERPRISE_PENDING_DOC] } },
    orderBy: { updatedAt: "desc" }
  });
  if (!ent) {
    return { ok: false as const, error: "B2B 기업 계정을 먼저 생성해 주세요." };
  }

  await ensureEnterpriseEnrollmentAttribution(prisma, ent.id, adminUserId);

  const pending = await prisma.corporateAttributionRequest.findMany({
    where: {
      enterpriseId: ent.id,
      status: "pending_doc_verification"
    }
  });

  if (pending.length === 0) {
    await ensureEnterpriseEnrollmentAttribution(prisma, ent.id, adminUserId);
  }

  const targets = await prisma.corporateAttributionRequest.findMany({
    where: {
      enterpriseId: ent.id,
      status: "pending_doc_verification"
    }
  });

  const updatedIds: string[] = [];
  for (const req of targets) {
    const merged = mergeDocumentUrls(req.documentUrls, docs);
    await prisma.corporateAttributionRequest.update({
      where: { id: req.id },
      data: { documentUrls: merged as Prisma.InputJsonValue }
    });
    updatedIds.push(req.id);
  }

  logB2bPipeline("enrollment.documents_uploaded", {
    enterpriseId: ent.id,
    adminUserId,
    documentKinds: docs.map((d) => d.kind),
    attributionRequestIds: updatedIds
  });

  return {
    ok: true as const,
    enterpriseId: ent.id,
    updatedRequestIds: updatedIds,
    documents: docs
  };
}

export function documentsSatisfyRequired(documentUrls: unknown): boolean {
  const arr = asDocArray(documentUrls);
  return ENROLLMENT_DOC_KINDS.every((kind) => arr.some((d) => d.kind === kind && d.url));
}

export async function getEnrollmentStatus(adminUserId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId },
    orderBy: { updatedAt: "desc" },
    include: {
      cartLines: true,
      attributions: {
        where: { status: { in: ["pending_doc_verification", "approved"] } },
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });

  if (!ent) {
    return { enterprise: null, enrollment: null };
  }

  const lineCount = ent.cartLines.length;
  const checkout = validateCartCheckout(lineCount);

  const adminAttr = ent.attributions.find((a) => a.memberUserId === adminUserId);
  const docs = mergeDocumentUrls(
    adminAttr?.documentUrls,
    ent.attributions.flatMap((a) => asDocArray(a.documentUrls))
  );
  const uniqueDocs = mergeDocumentUrls(null, docs);
  const documentsComplete = ENROLLMENT_DOC_KINDS.every((k) =>
    uniqueDocs.some((d) => d.kind === k)
  );

  const pendingCount = ent.attributions.filter(
    (a) => a.status === "pending_doc_verification"
  ).length;

  return {
    enterprise: ent,
    enrollment: {
      enterpriseId: ent.id,
      enterpriseStatus: ent.status,
      lineCount,
      canCheckout: checkout.ok,
      documentsComplete,
      requiredDocumentKinds: ENROLLMENT_DOC_KINDS,
      uploadedDocuments: uniqueDocs,
      pendingAttributionCount: pendingCount,
      canSubmitEnrollment:
        checkout.ok && documentsComplete && ent.status === "draft",
      statusLabel:
        ent.status === ENTERPRISE_PENDING_DOC
          ? "PENDING_DOC_VERIFICATION"
          : ent.status === "active"
            ? "ACTIVE"
            : ent.status.toUpperCase()
    }
  };
}

export async function submitEnterpriseEnrollment(adminUserId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId, status: "draft" },
    orderBy: { updatedAt: "desc" },
    include: { cartLines: true }
  });

  if (!ent) {
    logB2bPipeline("enrollment.submit_failed", { adminUserId, reason: "no_draft_enterprise" });
    return { ok: false as const, error: "제출 가능한 B2B 초안 계정이 없습니다." };
  }

  const validation = validateCartCheckout(ent.cartLines.length);
  if (!validation.ok) {
    logB2bPipeline("enrollment.submit_failed", {
      enterpriseId: ent.id,
      reason: "min_lines",
      lineCount: ent.cartLines.length
    });
    return { ok: false as const, error: validation.error };
  }

  await ensureEnterpriseEnrollmentAttribution(prisma, ent.id, adminUserId);

  const status = await getEnrollmentStatus(adminUserId);
  if (!status.enrollment?.documentsComplete) {
    logB2bPipeline("enrollment.submit_failed", {
      enterpriseId: ent.id,
      reason: "documents_incomplete"
    });
    return {
      ok: false as const,
      error: "재직증명서·위축계약서·사업자등록증을 모두 업로드해 주세요."
    };
  }

  await prisma.b2BEnterpriseAccount.update({
    where: { id: ent.id },
    data: {
      status: ENTERPRISE_PENDING_DOC,
      acquiredByVluerUserId: adminUserId
    } as { status: typeof ENTERPRISE_PENDING_DOC; acquiredByVluerUserId: string }
  });

  await prisma.corporateAttributionRequest.updateMany({
    where: {
      enterpriseId: ent.id,
      status: { in: ["pending_doc_verification"] }
    },
    data: { status: "pending_doc_verification" }
  });

  logB2bPipeline("enrollment.submitted", {
    enterpriseId: ent.id,
    adminUserId,
    lineCount: ent.cartLines.length
  });

  return {
    ok: true as const,
    enterpriseId: ent.id,
    status: "pending_doc_verification" as const,
    message: "본사 어드민 승인 대기(PENDING_DOC_VERIFICATION) 상태로 접수되었습니다."
  };
}
