import { prisma } from "../../db/client.js";
import { hasActiveEnterpriseBranding } from "./enterpriseBranding.js";

function mapEnterpriseCompany(ent: {
  id: string;
  companyName: string;
  masterDisplayNumber: string;
  companyBrandingJson: unknown;
  billingCycle: string;
  status: string;
}) {
  return {
    id: ent.id,
    company_name: ent.companyName,
    master_display_number: ent.masterDisplayNumber,
    branding: ent.companyBrandingJson ?? null,
    billing_cycle: ent.billingCycle,
    status: ent.status
  };
}

/**
 * 귀속 활성 시 UI 우선순위 — 개인 데이터는 그대로, 브랜딩만 기업 CI/BI 우선.
 * 기업 관리자·귀속 임직원 모두 동일 enterprise 브랜딩을 계정 전체 명함에 적용.
 */
export async function getMembershipUiContext(userId: string) {
  const [membership, adminEnterprise, cards, attribution] = await Promise.all([
    prisma.userCorporateMembership.findUnique({
      where: { userId },
      include: {
        enterprise: {
          select: {
            id: true,
            companyName: true,
            masterDisplayNumber: true,
            companyBrandingJson: true,
            billingCycle: true,
            status: true
          }
        }
      }
    }),
    prisma.b2BEnterpriseAccount.findFirst({
      where: { adminUserId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        masterDisplayNumber: true,
        companyBrandingJson: true,
        billingCycle: true,
        status: true
      }
    }),
    prisma.businessCard.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    }),
    prisma.corporateAttributionRequest.findFirst({
      where: { memberUserId: userId, status: "approved" },
      orderBy: { approvedAt: "desc" },
      select: { id: true, approvedAt: true, enterpriseId: true }
    })
  ]);

  let company: ReturnType<typeof mapEnterpriseCompany> | null = null;
  let corporateActive = false;
  let overrideByCompany = false;
  let appliesAccountWide = false;

  if (membership?.enterprise) {
    corporateActive = true;
    overrideByCompany = membership.overrideByCompany;
    company = mapEnterpriseCompany(membership.enterprise);
    appliesAccountWide = hasActiveEnterpriseBranding(membership.enterprise.companyBrandingJson);
  } else if (adminEnterprise && hasActiveEnterpriseBranding(adminEnterprise.companyBrandingJson)) {
    corporateActive = true;
    overrideByCompany = true;
    company = mapEnterpriseCompany(adminEnterprise);
    appliesAccountWide = true;
  } else if (attribution?.enterpriseId) {
    const ent = await prisma.b2BEnterpriseAccount.findUnique({
      where: { id: attribution.enterpriseId },
      select: {
        id: true,
        companyName: true,
        masterDisplayNumber: true,
        companyBrandingJson: true,
        billingCycle: true,
        status: true
      }
    });
    if (ent && hasActiveEnterpriseBranding(ent.companyBrandingJson)) {
      corporateActive = true;
      overrideByCompany = true;
      company = mapEnterpriseCompany(ent);
      appliesAccountWide = true;
    }
  }

  return {
    override_by_company: overrideByCompany,
    corporate_active: corporateActive,
    applies_account_wide: appliesAccountWide,
    company,
    latest_attribution: attribution
      ? {
          request_id: attribution.id,
          enterprise_id: attribution.enterpriseId,
          approved_at: attribution.approvedAt?.toISOString() ?? null
        }
      : null,
    personal_data_preserved: true,
    business_cards: cards.map((c) => ({
      id: c.id,
      kind: c.kind,
      phone_e164: c.phoneE164,
      display_name: c.displayName,
      profile_json: c.profileJson,
      b2b_enterprise_id: c.b2bEnterpriseId,
      b2b_cart_line_id: c.b2bCartLineId
    }))
  };
}
