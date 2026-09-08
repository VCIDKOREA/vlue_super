import { prisma } from "../../db/client.js";
import {
  buildJobOccupationDocUrl,
  getLatestJobOccupationReviewForUser,
  insertJobOccupationReview,
  listPendingJobOccupationReviews,
  resolveJobOccupationReview
} from "./jobOccupationVerifyStore.js";

/** Keep in sync with web/src/lib/jobOccupationCatalog.js */
const OCCUPATION_LABELS: Record<string, string> = {
  nurse: "간호사",
  nurse_aide: "간호조무사",
  appraiser: "감정평가사",
  sole_proprietor: "개인사업자",
  architect: "건축사",
  labor_attorney: "공인노무사",
  realtor: "공인중개사",
  cpa: "공인회계사",
  customs_broker: "관세사",
  professor: "교수",
  military_civilian: "군무원",
  pe_engineer: "기술사",
  univ_staff: "대학교직원(학생과 공통 이메일 사용)",
  pilot: "도선사",
  vet_tech: "동물보건사",
  physio: "물리치료사",
  beautician: "미용사",
  radiologist: "방사선사",
  judicial_scrivener: "법무사",
  patent_attorney: "변리사",
  lawyer: "변호사",
  him: "보건의료정보관리사",
  childcare: "보육교사",
  insurance_planner: "보험설계사",
  social_worker: "사회복지사",
  tax_accountant: "세무사",
  claims_adjuster: "손해사정사",
  veterinarian: "수의사",
  optician: "안경사",
  pharmacist: "약사",
  speech_therapist: "언어재활사",
  nutritionist: "영양사",
  wedding_planner: "웨딩플래너",
  kindergarten: "유치원교사",
  emt: "응급구조사",
  doctor: "의사",
  clinical_path: "임상병리사",
  ot: "작업치료사",
  career_soldier: "직업군인",
  dental_tech: "치과기공사",
  dental_hygienist: "치과위생사",
  dentist: "치과의사",
  florist: "플로리스트",
  fitness: "피트니스강사",
  instructor: "학교·학원강사",
  herbal_pharmacist: "한약사",
  oriental_doctor: "한의사",
  marine_officer: "해기사",
  admin_scrivener: "행정사",
  OTHER: "기타(직접입력)"
};

const ALLOWED_DOC_KINDS = new Set([
  "license",
  "certificate",
  "registration",
  "business_card",
  "employee_id",
  "business_registration",
  "other"
]);

const MAX_DOC_DATA_URL_LEN = 600_000;

async function applyApprovedOccupationToDigitalCard(
  userId: string,
  occupationLabel: string,
  verified: boolean
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
        jobOccupationLabel: occupationLabel,
        jobOccupationVerified: verified,
        ...(verified && occupationLabel ? { title: occupationLabel } : {})
      } as object
    }
  });
}

export function mapJobOccupationStatusRow(
  row: Awaited<ReturnType<typeof getLatestJobOccupationReviewForUser>>
) {
  if (!row) {
    return {
      reviewStatus: "",
      occupationId: "",
      occupationLabel: "",
      customLabel: "",
      displayLabel: "",
      docKind: "",
      docFileName: "",
      adminNote: "",
      submittedAt: null as string | null
    };
  }
  const custom = String(row.custom_label || "").trim();
  const base = String(row.occupation_label || "").trim();
  const displayLabel =
    row.occupation_id === "OTHER" && custom ? custom : base || custom;
  return {
    reviewStatus: (row.review_status || "").toLowerCase(),
    occupationId: row.occupation_id || "",
    occupationLabel: base,
    customLabel: custom,
    displayLabel,
    docKind: row.doc_kind || "",
    docFileName: row.doc_file_name || "",
    adminNote: row.admin_note || "",
    submittedAt: row.created_at?.toISOString?.() || null
  };
}

export async function getJobOccupationStatusForUser(userId: string) {
  const row = await getLatestJobOccupationReviewForUser(userId);
  return mapJobOccupationStatusRow(row);
}

export async function submitJobOccupationReview(
  userId: string,
  input: {
    occupationId: string;
    customLabel?: string;
    docKind: string;
    docFileName: string;
    docUrl?: string;
    docDataUrl?: string;
  }
) {
  const occupationId = String(input.occupationId || "").trim();
  if (!OCCUPATION_LABELS[occupationId]) {
    throw new Error("INVALID_OCCUPATION");
  }
  const customLabel = String(input.customLabel || "").trim().slice(0, 120);
  if (occupationId === "OTHER" && !customLabel) {
    throw new Error("CUSTOM_LABEL_REQUIRED");
  }
  const kind = String(input.docKind || "").trim();
  if (!ALLOWED_DOC_KINDS.has(kind)) {
    throw new Error("INVALID_DOC_KIND");
  }
  const fileName = String(input.docFileName || "document.pdf").trim().slice(0, 255);
  const dataUrl = String(input.docDataUrl || input.docUrl || "").trim();
  if (!dataUrl) throw new Error("DOC_REQUIRED");

  const occupationLabel =
    occupationId === "OTHER" ? customLabel : OCCUPATION_LABELS[occupationId];

  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { id: true }
  });

  const docUrl = dataUrl.startsWith("http")
    ? dataUrl
    : buildJobOccupationDocUrl(userId, kind, fileName);
  const docDataUrl =
    dataUrl.startsWith("data:") && dataUrl.length <= MAX_DOC_DATA_URL_LEN ? dataUrl : null;

  const reviewId = await insertJobOccupationReview({
    userId,
    digitalCardId: card?.id || null,
    occupationId,
    occupationLabel,
    customLabel: occupationId === "OTHER" ? customLabel : null,
    docKind: kind,
    docUrl,
    docDataUrl,
    docFileName: fileName,
    reviewStatus: "PENDING"
  });

  return { reviewId, reviewStatus: "PENDING" as const };
}

export async function listJobOccupationPendingForAdmin() {
  const rows = await listPendingJobOccupationReviews(80);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    occupationId: r.occupation_id,
    occupationLabel: r.occupation_label,
    customLabel: r.custom_label || "",
    displayLabel:
      r.occupation_id === "OTHER" && r.custom_label
        ? r.custom_label
        : r.occupation_label,
    docKind: r.doc_kind,
    docFileName: r.doc_file_name || "",
    hasDocPreview: Boolean(r.doc_data_url || r.doc_url),
    createdAt: r.created_at?.toISOString?.() || null
  }));
}

export async function resolveJobOccupationReviewForAdmin(input: {
  reviewId: string;
  action: "approve" | "reject";
  adminDeviceId?: string | null;
  adminNote?: string;
}) {
  const row = await resolveJobOccupationReview(input);
  if (!row) throw new Error("REVIEW_NOT_FOUND");
  if (input.action === "approve") {
    const latest = await getLatestJobOccupationReviewForUser(row.user_id);
    const label =
      latest?.occupation_id === "OTHER" && latest.custom_label
        ? latest.custom_label
        : latest?.occupation_label || "";
    await applyApprovedOccupationToDigitalCard(row.user_id, label, true);
  }
  return { reviewId: row.id, reviewStatus: input.action === "reject" ? "REJECTED" : "APPROVED" };
}
