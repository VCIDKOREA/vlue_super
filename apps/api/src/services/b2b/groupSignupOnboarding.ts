import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import {
  addCartLine,
  type B2BBillingCycle,
  upsertEnterpriseDraft,
  validateCartCheckout
} from "./cartEngine.js";
import { B2B_MIN_LINES, b2bEnterpriseTotalKrw } from "../vluer/pricingConstants.js";
import { assertCompanyContactPayload, resolveMasterDisplayNumber } from "../../lib/b2bCompanyContact.js";
import { provisionEnterpriseMasterOnSignup } from "../enterprise/enterpriseProvisioning.js";
import { ensureEnterpriseGroupChatIfReady } from "../enterprise/enterpriseGroupChatBootstrap.js";

export type GroupSignupLineInput = {
  lineKind: "mobile" | "extension";
  realCliPhone: string;
  assigneeName: string;
  assigneeTitle?: string;
  enterpriseRole?: string;
  extensionNo?: string;
  useMasterDisplayNumber?: boolean;
};

export type GroupSignupPayload = {
  companyName: string;
  masterDisplayNumber: string;
  carrier: "LGUPLUS" | "KT";
  companyContactType?: "company_rep" | "rep_mobile" | "rep_extension";
  repExtensionMain?: string;
  repExtensionNo?: string;
  /** 접수 회선 수(VLUE 인증번호 포함) — 10 이상 */
  plannedLineCount?: number;
  lines: GroupSignupLineInput[];
};

/** 가입 완료 직후 B2B enterprise draft + 회선 등록 (가입 시 단체 선택한 경우) */
export async function applyGroupSignupOnboarding(
  adminUserId: string,
  payload: GroupSignupPayload,
  billingCycle: B2BBillingCycle,
  acquiredByVluerUserId?: string | null,
  adminPhoneE164?: string | null,
  hasReferral = false
) {
  const companyName = String(payload.companyName || "").trim();
  assertCompanyContactPayload(payload, adminPhoneE164);
  const masterDisplayNumber = resolveMasterDisplayNumber(payload, adminPhoneE164);
  if (!companyName || masterDisplayNumber.replace(/\D/g, "").length < 4) {
    throw new Error("단체 가입 정보(상호·고객 연락처)가 올바르지 않습니다.");
  }

  const extraLines = Array.isArray(payload.lines) ? payload.lines : [];
  const planned = Math.floor(Number(payload.plannedLineCount) || 0);
  const lineCount =
    planned >= B2B_MIN_LINES ? planned : Math.max(B2B_MIN_LINES, 1 + extraLines.length);
  const checkout = validateCartCheckout(lineCount);
  if (!checkout.ok) {
    throw new Error(checkout.error || "단체 가입 회선 수가 부족합니다.");
  }

  const ent = await upsertEnterpriseDraft(adminUserId, {
    companyName,
    masterDisplayNumber,
    carrier: payload.carrier === "KT" ? "KT" : "LGUPLUS",
    billingCycle
  });

  await prisma.b2BCartLine.deleteMany({ where: { enterpriseId: ent.id } });

  for (const row of extraLines) {
    const phone = String(row.realCliPhone || "").trim();
    const name = String(row.assigneeName || "").trim();
    if (!phone || !name) continue;
    const result = await addCartLine(ent.id, {
      lineKind: row.lineKind === "mobile" ? "mobile" : "extension",
      realCliPhone: phone,
      assigneeName: name,
      assigneeTitle: String(row.assigneeTitle || "").trim() || undefined,
      enterpriseRole: row.enterpriseRole,
      useMasterDisplayNumber: Boolean(row.useMasterDisplayNumber)
    });
    if (!result.ok) {
      throw new Error(result.error || "회선 등록 실패");
    }
  }

  const totalKrw = b2bEnterpriseTotalKrw(lineCount, billingCycle, { hasReferral });
  await prisma.b2BEnterpriseAccount.update({
    where: { id: ent.id },
    data: {
      totalBillingAmountKrw: totalKrw,
      plannedLineCount: lineCount,
      ...(acquiredByVluerUserId ? { acquiredByVluerUserId } : {})
    }
  });

  await provisionEnterpriseMasterOnSignup(adminUserId, ent.id);
  const groupChat = await ensureEnterpriseGroupChatIfReady(ent.id);

  return { enterpriseId: ent.id, lineCount, totalBillingAmountKrw: totalKrw, groupChat };
}

/** 본인인증 휴대폰 = VLUE 인증번호(관리자 회선) — user.phoneE164 와 대조용 */
export function assertAdminPhoneForGroupSignup(adminPhoneE164: string | null | undefined) {
  const e164 = normalizeToE164KR(String(adminPhoneE164 || ""));
  if (!e164) {
    throw new Error("단체 가입: VLUE 인증번호(본인인증 휴대폰)가 필요합니다.");
  }
  return e164;
}
