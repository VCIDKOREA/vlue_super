import { prisma } from "../../db/client.js";
import {
  buildTitleDeptDocUrl,
  getLatestTitleDeptReviewForUser,
  insertTitleDeptReview,
  listPendingTitleDeptReviews,
  resolveTitleDeptReview,
  type TitleDeptReviewSource
} from "./titleDeptReviewStore.js";

const ALLOWED_DOC_KINDS = new Set([
  "employment_certificate",
  "insurance_enrollment",
  "business_registration"
]);

const MAX_DOC_DATA_URL_LEN = 600_000;

function parseIssuedDate(raw: string): string | null {
  const s = String(raw || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function isIssuedWithin31Days(issuedAt: string): boolean {
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return false;
  const ageMs = Date.now() - issued.getTime();
  return ageMs >= 0 && ageMs <= 31 * 24 * 60 * 60 * 1000;
}

async function applyApprovedTitleToDigitalCard(
  userId: string,
  title: string,
  department: string
) {
  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { exportSnapshotJson: true }
  });
  if (!card) return;
  const prev =
    card.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
      ? (card.exportSnapshotJson as Record<string, unknown>)
      : {};
  await prisma.digitalCard.update({
    where: { userId },
    data: {
      exportSnapshotJson: {
        ...prev,
        title: title || "",
        department: department || ""
      }
    }
  });
}

export function mapTitleDeptStatusRow(row: Awaited<ReturnType<typeof getLatestTitleDeptReviewForUser>>) {
  if (!row) {
    return {
      reviewStatus: "",
      approvedTitle: "",
      approvedDepartment: "",
      pendingTitle: "",
      pendingDepartment: "",
      submittedAt: null as string | null
    };
  }
  return {
    reviewStatus: (row.review_status || "").toLowerCase(),
    approvedTitle: row.approved_title || "",
    approvedDepartment: row.approved_department || "",
    pendingTitle: row.pending_title || "",
    pendingDepartment: row.pending_department || "",
    submittedAt: row.created_at?.toISOString?.() || null
  };
}

export async function getTitleDeptStatusForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicHandle: true }
  });
  const { isPlatformCeoHandle } = await import("../admin/platformAccountRoles.js");
  if (isPlatformCeoHandle(user?.publicHandle)) {
    return {
      reviewStatus: "approved",
      approvedTitle: "CEO",
      approvedDepartment: "",
      pendingTitle: "",
      pendingDepartment: "",
      submittedAt: null as string | null
    };
  }
  const row = await getLatestTitleDeptReviewForUser(userId);
  return mapTitleDeptStatusRow(row);
}

export async function submitTitleDeptReview(
  userId: string,
  input: {
    title?: string;
    department?: string;
    docKind: string;
    docFileName: string;
    docIssuedAt: string;
    docUrl?: string;
    docDataUrl?: string;
    source?: TitleDeptReviewSource;
  }
) {
  const kind = String(input.docKind || "").trim();
  if (!ALLOWED_DOC_KINDS.has(kind)) {
    throw new Error("INVALID_DOC_KIND");
  }
  const issuedAt = parseIssuedDate(input.docIssuedAt);
  if (!issuedAt || !isIssuedWithin31Days(issuedAt)) {
    throw new Error("DOC_ISSUED_AT_INVALID");
  }
  const fileName = String(input.docFileName || "document.pdf").trim().slice(0, 255);
  const dataUrl = String(input.docDataUrl || input.docUrl || "").trim();
  if (!dataUrl) throw new Error("DOC_REQUIRED");

  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { id: true }
  });

  const docUrl =
    dataUrl.startsWith("http") ? dataUrl : buildTitleDeptDocUrl(userId, kind, fileName);
  const docDataUrl =
    dataUrl.startsWith("data:") && dataUrl.length <= MAX_DOC_DATA_URL_LEN ? dataUrl : null;

  const reviewId = await insertTitleDeptReview({
    userId,
    digitalCardId: card?.id || null,
    source: input.source || "bizcard_settings",
    pendingTitle: String(input.title || "").trim().slice(0, 120) || undefined,
    pendingDepartment: String(input.department || "").trim().slice(0, 120) || undefined,
    docKind: kind,
    docUrl,
    docDataUrl,
    docFileName: fileName,
    docIssuedAt: issuedAt,
    reviewStatus: "PENDING"
  });

  return { reviewId, reviewStatus: "PENDING" as const };
}

export async function listTitleDeptPendingForAdmin() {
  const rows = await listPendingTitleDeptReviews(100);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    source: r.source,
    pendingTitle: r.pending_title || "",
    pendingDepartment: r.pending_department || "",
    approvedTitle: r.approved_title || "",
    approvedDepartment: r.approved_department || "",
    docKind: r.doc_kind || "",
    docUrl: r.doc_url || "",
    /* 목록에서는 base64 본문 미전송 — 폴링 egress 방지. 미리보기는 docUrl 또는 상세 API */
    docDataUrl: "",
    hasDocData: r.doc_data_url === "stored" || Boolean(r.doc_url),
    docFileName: r.doc_file_name || "",
    docIssuedAt: r.doc_issued_at ? String(r.doc_issued_at).slice(0, 10) : "",
    reviewStatus: r.review_status,
    createdAt: r.created_at,
    legalName: r.legal_name || "",
    publicHandle: r.public_handle || ""
  }));
}

export async function resolveTitleDeptReviewForAdmin(input: {
  reviewId: string;
  action: "approve" | "reject";
  adminDeviceId: string;
  adminNote?: string;
}) {
  const result = await resolveTitleDeptReview(input);
  if (input.action === "approve") {
    await applyApprovedTitleToDigitalCard(
      result.userId,
      result.approvedTitle,
      result.approvedDepartment
    );
  }
  return result;
}

export async function recordOnboardingDigitalCardDoc(
  userId: string,
  digitalCardId: string | null,
  input: {
    docKind: string;
    docFileName: string;
    docIssuedAt: string;
    docDataUrl?: string;
  }
) {
  return submitTitleDeptReview(userId, {
    title: "",
    department: "",
    docKind: input.docKind,
    docFileName: input.docFileName,
    docIssuedAt: input.docIssuedAt,
    docDataUrl: input.docDataUrl,
    source: "onboarding_signup"
  });
}
