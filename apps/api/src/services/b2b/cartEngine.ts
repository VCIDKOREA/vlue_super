import { prisma } from "../../db/client.js";

export type B2BBillingCycle = "monthly" | "annual";
export type B2BCartLineKind = "extension" | "mobile";
export type B2BTelecomCarrier = "LGUPLUS" | "KT";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import {
  B2B_MIN_LINES,
  b2bEnterpriseTotalKrw,
  b2bMasterUnitKrw,
  b2bSubordinateUnitKrw,
  type B2bBillingOptions
} from "../vluer/pricingConstants.js";
import { enforceUniqueLineRoles, normalizeCartLineRole } from "../enterprise/enterpriseRoles.js";
import { ensureEnterpriseGroupChatIfReady } from "../enterprise/enterpriseGroupChatBootstrap.js";

export type CartLineInput = {
  lineKind: B2BCartLineKind;
  realCliPhone: string;
  assigneeName: string;
  assigneeTitle?: string;
  enterpriseRole?: string;
  /** 체크 시 고객 화면·디지털 명함 = 기업 대표번호 */
  useMasterDisplayNumber?: boolean;
};

export function validateCartCheckout(lineCount: number): { ok: boolean; error?: string } {
  if (lineCount < B2B_MIN_LINES) {
    return {
      ok: false,
      error: "B2B 단체 특가는 10인 이상 가입 시에만 적용 가능합니다"
    };
  }
  return { ok: true };
}

export function buildInvoicePreview(
  employeeLineCount: number,
  cycle: B2BBillingCycle,
  opts: B2bBillingOptions = {}
) {
  const employees = Math.max(0, employeeLineCount);
  const totalLinesIncludingMaster = employees + 1;
  const hasReferral = Boolean(opts.hasReferral);
  const masterUnitKrw = b2bMasterUnitKrw(cycle, hasReferral);
  const subordinateUnitKrw = b2bSubordinateUnitKrw(cycle);
  const totalKrw = b2bEnterpriseTotalKrw(totalLinesIncludingMaster, cycle, opts);
  return {
    lineCount: employees,
    totalLinesIncludingMaster,
    billingCycle: cycle,
    masterUnitPriceKrw: masterUnitKrw,
    subordinateUnitPriceKrw: subordinateUnitKrw,
    unitPriceKrw: subordinateUnitKrw,
    setupFeeKrw: 0,
    totalKrw,
    hasReferral,
    minLinesRequired: B2B_MIN_LINES,
    canCheckout: employees >= B2B_MIN_LINES,
    pricingNote: hasReferral
      ? "추천인 적용 — 전 회선 단체 요금"
      : "추천인 없음 — 대표 정가 · 하부 14,700원/회선"
  };
}

export async function upsertEnterpriseDraft(
  adminUserId: string,
  payload: {
    companyName: string;
    masterDisplayNumber: string;
    carrier: B2BTelecomCarrier;
    billingCycle: B2BBillingCycle;
  }
) {
  const existing = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId, status: "draft" },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return prisma.b2BEnterpriseAccount.update({
      where: { id: existing.id },
      data: {
        companyName: payload.companyName.trim(),
        masterDisplayNumber: payload.masterDisplayNumber.trim(),
        carrier: payload.carrier,
        billingCycle: payload.billingCycle
      }
    });
  }

  return prisma.b2BEnterpriseAccount.create({
    data: {
      adminUserId,
      companyName: payload.companyName.trim(),
      masterDisplayNumber: payload.masterDisplayNumber.trim(),
      carrier: payload.carrier,
      billingCycle: payload.billingCycle,
      status: "draft"
    }
  });
}

export async function addCartLine(enterpriseId: string, input: CartLineInput) {
  const e164 = normalizeToE164KR(input.realCliPhone);
  if (!e164) return { ok: false as const, error: "번호 형식 오류" };

  const enterpriseRole = normalizeCartLineRole(input.enterpriseRole);
  await enforceUniqueLineRoles(enterpriseId, null, enterpriseRole);

  const count = await prisma.b2BCartLine.count({ where: { enterpriseId } });
  const line = await prisma.b2BCartLine.create({
    data: {
      enterpriseId,
      lineKind: input.lineKind === "mobile" ? "mobile" : "extension",
      realCliPhoneE164: e164,
      assigneeName: input.assigneeName.trim(),
      assigneeTitle: input.assigneeTitle?.trim() || null,
      enterpriseRole,
      useMasterDisplayNumber: Boolean(input.useMasterDisplayNumber),
      sortOrder: count
    }
  });

  const lineCount = count + 1;
  const entRow = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    select: { plannedLineCount: true }
  });
  const planned = Math.max(B2B_MIN_LINES, entRow?.plannedLineCount ?? lineCount, lineCount);
  await prisma.b2BEnterpriseAccount.update({
    where: { id: enterpriseId },
    data: { plannedLineCount: planned }
  });

  const groupChat = await ensureEnterpriseGroupChatIfReady(enterpriseId);

  return { ok: true as const, line, groupChat };
}

export async function patchCartLineRole(enterpriseId: string, lineId: string, enterpriseRoleRaw: string) {
  const enterpriseRole = normalizeCartLineRole(enterpriseRoleRaw);
  await enforceUniqueLineRoles(enterpriseId, lineId, enterpriseRole);
  const updated = await prisma.b2BCartLine.updateMany({
    where: { id: lineId, enterpriseId },
    data: { enterpriseRole }
  });
  if (!updated.count) return { ok: false as const, error: "회선을 찾을 수 없습니다." };
  return { ok: true as const };
}

export async function resolveMemberForAttribution(phoneRaw: string) {
  const e164 = normalizeToE164KR(phoneRaw);
  if (!e164) return { matched: false as const };

  const user = await prisma.user.findFirst({
    where: { phoneE164: e164 },
    select: {
      id: true,
      legalName: true,
      vluerProfile: { select: { referralCode: true, canActAsVluer: true } }
    }
  });

  if (!user) return { matched: false as const, phoneE164: e164 };

  return {
    matched: true as const,
    phoneE164: e164,
    userId: user.id,
    legalName: user.legalName,
    hasVluerActivity: Boolean(user.vluerProfile?.referralCode),
    needsAttribution: true
  };
}

export async function requestCorporateAttribution(
  enterpriseId: string,
  memberPhoneRaw: string
) {
  const resolved = await resolveMemberForAttribution(memberPhoneRaw);
  if (!resolved.matched || !resolved.userId) {
    return { ok: false as const, error: "기존 VLUE 회원을 찾을 수 없습니다." };
  }

  const existing = await prisma.corporateAttributionRequest.findFirst({
    where: {
      enterpriseId,
      memberUserId: resolved.userId,
      status: { in: ["pending_doc_verification", "approved"] }
    }
  });
  if (existing) {
    return { ok: true as const, request: existing, alreadyExists: true };
  }

  const request = await prisma.corporateAttributionRequest.create({
    data: {
      enterpriseId,
      memberUserId: resolved.userId,
      memberPhoneE164: resolved.phoneE164,
      status: "pending_doc_verification"
    }
  });

  return { ok: true as const, request, alreadyExists: false };
}
