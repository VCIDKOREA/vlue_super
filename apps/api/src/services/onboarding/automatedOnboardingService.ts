import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { assertPaidLineAllowed } from "../office/companyLinesService.js";
import { verifyNtsBusinessStatus } from "./ntsBusinessVerifyService.js";
import {
  getOnboardingStats,
  insertOnboardingReview,
  listManualReviewQueue,
  resolveManualReview,
  type OnboardingReviewStatus
} from "./onboardingReviewStore.js";

export { getOnboardingStats, listManualReviewQueue, resolveManualReview };

export type AutomatedOnboardingInput = {
  userId: string;
  businessRegistrationNo: string;
  representativeName: string;
  openDate: string;
  companyName?: string;
  phoneE164?: string | null;
};

export type AutomatedOnboardingResult = {
  autoApproved: boolean;
  reviewStatus: OnboardingReviewStatus;
  accountStatus: "active" | "pending_approval";
  ntsStatusCode: string;
  ntsStatusLabel: string;
  companyLineWhitelist: boolean;
  failureReason?: string;
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

async function isCompanyLineWhitelisted(phoneE164?: string | null) {
  const phone = String(phoneE164 || "").replace(/\D/g, "");
  if (phone.length < 8) return false;
  const check = await assertPaidLineAllowed(phone);
  return check.allowed;
}

export async function runAutomatedBusinessOnboarding(
  input: AutomatedOnboardingInput
): Promise<AutomatedOnboardingResult> {
  const bno = digitsOnly(input.businessRegistrationNo);
  const openDate = digitsOnly(input.openDate);
  const rep = String(input.representativeName || "").trim();
  const whitelist = await isCompanyLineWhitelisted(input.phoneE164);

  let nts = whitelist
    ? {
        ok: true,
        statusCode: "01",
        statusLabel: "계속사업자(회선화이트리스트)",
        matched: true,
        source: "mock" as const
      }
    : await verifyNtsBusinessStatus({
        businessRegistrationNo: bno,
        representativeName: rep,
        openDate
      });

  const autoApproved = Boolean(whitelist || (nts.ok && nts.matched));
  const reviewStatus: OnboardingReviewStatus = autoApproved ? "AUTO_APPROVED" : "MANUAL_REVIEW";
  const failureReason = autoApproved
    ? undefined
    : nts.reason || (nts.ok ? "MANUAL_POLICY" : nts.statusLabel);

  await insertOnboardingReview({
    userId: input.userId,
    businessRegistrationNo: bno,
    representativeName: rep,
    openDate,
    companyName: input.companyName,
    phoneE164: input.phoneE164 || undefined,
    ntsStatusCode: nts.statusCode,
    ntsStatusLabel: nts.statusLabel,
    ntsMatched: nts.matched,
    ntsSource: nts.source,
    companyLineWhitelist: whitelist,
    reviewStatus,
    failureReason
  });

  if (autoApproved) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { accountStatus: "active", pendingApprovalAt: null }
    });
    ssePublish(input.userId, {
      type: "vlue-onboarding-auto-approved",
      message: "사업자 검증이 완료되어 가입이 승인되었습니다.",
      at: new Date().toISOString()
    });
  } else {
    await prisma.user.update({
      where: { id: input.userId },
      data: { accountStatus: "pending_approval", pendingApprovalAt: new Date() }
    });
  }

  return {
    autoApproved,
    reviewStatus,
    accountStatus: autoApproved ? "active" : "pending_approval",
    ntsStatusCode: nts.statusCode,
    ntsStatusLabel: nts.statusLabel,
    companyLineWhitelist: whitelist,
    failureReason
  };
}

export function mapManualReviewRows(
  rows: Awaited<ReturnType<typeof listManualReviewQueue>>
) {
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    businessRegistrationNo: r.business_registration_no,
    representativeName: r.representative_name,
    openDate: r.open_date,
    companyName: r.company_name,
    phoneE164: r.phone_e164,
    ntsStatusCode: r.nts_status_code,
    ntsStatusLabel: r.nts_status_label,
    failureReason: r.failure_reason,
    reviewStatus: r.review_status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    legalName: r.legal_name,
    publicHandle: r.public_handle,
    accountStatus: r.account_status
  }));
}
