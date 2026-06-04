import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { cancelPersonalSubscriptions } from "./subscriptionLifecycle.js";
import { recalculateEnterpriseBilling } from "./enterpriseBillingScheduler.js";
import { logB2bPipeline } from "../../lib/b2bPipelineLog.js";
import {
  applyBrandingAccountWide,
  hasActiveEnterpriseBranding
} from "./enterpriseBranding.js";

type Tx = Prisma.TransactionClient;

export class CorporateAttributionApproveError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INVALID_STATUS" | "ENTERPRISE_INACTIVE",
    message: string
  ) {
    super(message);
    this.name = "CorporateAttributionApproveError";
  }
}

async function applyB2bVluerBlockTx(db: Tx, userId: string) {
  const now = new Date();
  await db.userVluerProfile.upsert({
    where: { userId },
    create: {
      userId,
      canActAsVluer: false,
      isEligibleForVluerSettlement: false,
      rewardsFrozen: true,
      rewardsFrozenAt: now,
      b2bBlockedAt: now
    },
    update: {
      canActAsVluer: false,
      isEligibleForVluerSettlement: false,
      rewardsFrozen: true,
      rewardsFrozenAt: now,
      b2bBlockedAt: now
    }
  });
}

/**
 * 본사 어드민 최종 승인 — VLUER 차단, 개인 구독 해지·환불 큐, B2B 통합 청구 재산정.
 * 개인 명함·템플릿·활동 로그는 삭제하지 않음.
 */
export async function approveCorporateAttribution(
  requestId: string,
  approvedByAdminDeviceId: string,
  adminNote?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.corporateAttributionRequest.findUnique({
      where: { id: requestId },
      include: { enterprise: true }
    });

    if (!req) {
      throw new CorporateAttributionApproveError("NOT_FOUND", "귀속 요청을 찾을 수 없습니다.");
    }
    if (req.status !== "pending_doc_verification") {
      throw new CorporateAttributionApproveError(
        "INVALID_STATUS",
        `승인 가능 상태가 아닙니다 (현재: ${req.status}).`
      );
    }
    if (req.enterprise.status === "suspended") {
      throw new CorporateAttributionApproveError(
        "ENTERPRISE_INACTIVE",
        "정지된 기업 계정에는 귀속을 승인할 수 없습니다."
      );
    }

    const approvedAt = new Date();

    await tx.corporateAttributionRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedAt,
        approvedByAdminId: approvedByAdminDeviceId,
        adminNote: adminNote?.trim() || req.adminNote
      }
    });

    await applyB2bVluerBlockTx(tx, req.memberUserId);

    const billingHook = await cancelPersonalSubscriptions(
      tx,
      req.memberUserId,
      "corporate_attribution_approved"
    );

    await tx.userCorporateMembership.upsert({
      where: { userId: req.memberUserId },
      create: {
        userId: req.memberUserId,
        enterpriseId: req.enterpriseId,
        attributionRequestId: req.id,
        overrideByCompany: true,
        activatedAt: approvedAt
      },
      update: {
        enterpriseId: req.enterpriseId,
        attributionRequestId: req.id,
        overrideByCompany: true,
        activatedAt: approvedAt
      }
    });

    await tx.b2BCartLine.updateMany({
      where: {
        enterpriseId: req.enterpriseId,
        realCliPhoneE164: req.memberPhoneE164
      },
      data: { linkedUserId: req.memberUserId }
    });

    await tx.businessCard.updateMany({
      where: {
        userId: req.memberUserId,
        phoneE164: req.memberPhoneE164
      },
      data: {
        b2bEnterpriseId: req.enterpriseId,
        isPremiumLine: true
      }
    });

    const billing = await recalculateEnterpriseBilling(req.enterpriseId, tx);

    const pendingLeft = await tx.corporateAttributionRequest.count({
      where: {
        enterpriseId: req.enterpriseId,
        status: "pending_doc_verification"
      }
    });
    if (pendingLeft === 0) {
      await tx.b2BEnterpriseAccount.update({
        where: { id: req.enterpriseId },
        data: { status: "active" }
      });
      logB2bPipeline("admin.attribution_approved", {
        enterpriseId: req.enterpriseId,
        requestId: req.id,
        enterpriseActivated: true
      });
    } else {
      logB2bPipeline("admin.attribution_approved", {
        enterpriseId: req.enterpriseId,
        requestId: req.id,
        pendingAttributionsLeft: pendingLeft
      });
    }

    return {
      ok: true as const,
      requestId: req.id,
      memberUserId: req.memberUserId,
      enterpriseId: req.enterpriseId,
      approvedAt: approvedAt.toISOString(),
      vluerProfile: {
        is_eligible_for_vluer_settlement: false,
        can_act_as_vluer: false,
        rewards_frozen: true
      },
      personalSubscriptions: billingHook,
      enterpriseBilling: billing,
      dataPreservation: {
        personal_business_cards: "preserved",
        templates_and_activity_logs: "preserved"
      },
      override_by_company: true
    };
  });

  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: result.enterpriseId },
    select: { companyBrandingJson: true, adminUserId: true }
  });
  if (ent && hasActiveEnterpriseBranding(ent.companyBrandingJson)) {
    await applyBrandingAccountWide(result.enterpriseId, ent.adminUserId);
  }

  return result;
}
