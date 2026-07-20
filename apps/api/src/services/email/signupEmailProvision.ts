import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/client.js";
import {
  classifyEmailDomain,
  extractEmailDomain,
  isCompanyEmailDomain,
  isPersonalEmailDomain,
  isPlatformEmailDomain,
  isValidEmailShape,
  normalizeBusinessEmail,
  suggestHandleBaseFromEmail
} from "./emailDomainClassification.js";
import {
  findMappingByFullVirtualEmail,
  upsertUserEmailMapping,
  type UserEmailMappingRow
} from "./userEmailMappingsStore.js";

export type SignupTrack = "business_email" | "vlue_id_only";

export {
  classifyEmailDomain,
  extractEmailDomain,
  isCompanyEmailDomain,
  isPersonalEmailDomain,
  isPlatformEmailDomain,
  isValidEmailShape,
  normalizeBusinessEmail
};

export function deriveVirtualPrefixFromHandle(handle: string): string {
  return String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 64);
}

export function buildFullVirtualEmail(prefix: string): string {
  const dom = (process.env.VLUE_EMAIL_DOMAIN || "vlue.kr").trim().toLowerCase();
  const p = deriveVirtualPrefixFromHandle(prefix);
  if (!p) throw new Error("INVALID_VIRTUAL_PREFIX");
  return `${p}@${dom}`;
}

export async function deriveHandleFromBusinessEmail(
  db: PrismaClient,
  emailRaw: string
): Promise<string> {
  const email = normalizeBusinessEmail(emailRaw);
  if (!isValidEmailShape(email)) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  const emailTaken = await db.user.findFirst({
    where: { email },
    select: { id: true }
  });
  if (emailTaken) {
    throw new Error("이미 가입된 이메일입니다. 로그인해 주세요.");
  }

  let base = suggestHandleBaseFromEmail(email) || "user";
  base = deriveVirtualPrefixFromHandle(base) || "user";
  if (base.length < 3) base = `${base}vl`.slice(0, 20);
  base = base.slice(0, 20);

  let candidate = base;
  for (let i = 0; i < 50; i += 1) {
    const clash = await db.user.findFirst({
      where: { publicHandle: candidate },
      select: { id: true }
    });
    if (!clash) return candidate;
    candidate = `${base}${i + 1}`.slice(0, 20);
  }
  throw new Error("사용 가능한 VLUE ID를 만들 수 없습니다. 다른 이메일을 사용해 주세요.");
}

export async function provisionSignupEmailMapping(input: {
  userId: string;
  virtualEmailPrefix: string;
  targetMasterEmail: string | null;
  membershipStatus?: "FREE" | "PREMIUM";
}): Promise<UserEmailMappingRow> {
  const prefix = deriveVirtualPrefixFromHandle(input.virtualEmailPrefix);
  const full = buildFullVirtualEmail(prefix);

  const taken = await findMappingByFullVirtualEmail(full);
  if (taken && taken.user_id !== input.userId) {
    throw new Error("가상 메일 주소가 이미 사용 중입니다.");
  }

  return upsertUserEmailMapping({
    userId: input.userId,
    membershipStatus: input.membershipStatus || "FREE",
    virtualEmailPrefix: prefix,
    userCompanySlug: null,
    fullVirtualEmail: full,
    targetMasterEmail: input.targetMasterEmail
  });
}

export async function applySignupEmailBundle(params: {
  userId: string;
  signupTrack: SignupTrack;
  virtualEmailPrefix: string;
  businessEmail?: string | null;
  membershipStatus?: "FREE" | "PREMIUM";
}): Promise<UserEmailMappingRow | null> {
  if (params.signupTrack === "business_email") {
    const email = normalizeBusinessEmail(params.businessEmail || "");
    if (!email) throw new Error("비즈니스 메일 주소가 필요합니다.");
    return provisionSignupEmailMapping({
      userId: params.userId,
      virtualEmailPrefix: params.virtualEmailPrefix,
      targetMasterEmail: email,
      membershipStatus: params.membershipStatus
    });
  }

  return provisionSignupEmailMapping({
    userId: params.userId,
    virtualEmailPrefix: params.virtualEmailPrefix,
    targetMasterEmail: null,
    membershipStatus: params.membershipStatus
  });
}

export async function applyCompanyVerifiedIfEligible(userId: string, businessEmail: string | null) {
  const email = normalizeBusinessEmail(businessEmail || "");
  if (!email || !isCompanyEmailDomain(email)) return;
  await prisma.$executeRawUnsafe(
    `UPDATE users SET is_company_verified = true, company_verified_at = NOW() WHERE id = $1::uuid`,
    userId
  );
}
