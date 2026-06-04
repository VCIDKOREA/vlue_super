import type { AccountStatus } from "@prisma/client";
import type { Buffer } from "node:buffer";
import { buildInitialLegalNameData } from "@vlue/db";
import { prisma } from "../db/client.js";
import {
  fetchAndParseIamportCertification,
  hashCiUniqueKey
} from "../integrations/portone/iamportCert.js";
import {
  ensurePublicHandleForExistingUser,
  normalizeDesiredPublicHandle,
  resolvePublicHandleForNewUser
} from "../lib/publicHandle.js";
import { hashPassword } from "../lib/passwordHash.js";
import { isValidMemberPassword, MEMBER_PASSWORD_INVALID_MESSAGE } from "../lib/memberPasswordRules.js";
import { upsertMasterAdminDeviceIfEligible } from "./masterAdminDevice.js";
import { applyGroupSignupOnboarding,
  assertAdminPhoneForGroupSignup,
  type GroupSignupPayload
} from "./b2b/groupSignupOnboarding.js";
import { applySignupMembershipBundle } from "./membership/applySignupMembership.js";
import { applyAbuseProtectionOnNewSignup } from "./auth/abusingProtectionService.js";
import { isB2bMembershipKind, normalizeMembershipKind } from "./membership/membershipBmConstants.js";
import { runAutomatedBusinessOnboarding } from "./onboarding/automatedOnboardingService.js";

/** Prisma Bytes 필드와 TS 제네릭 호환 */
function toPrismaBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return new Uint8Array(ab);
}

export type IdentityCompleteResult = {
  userId: string;
  legalName: string;
  accountStatus: Extract<AccountStatus, "active" | "pending_approval">;
  alreadyExisted: boolean;
  /** 본인인증에 사용된 휴대폰(E.164) — 클라이언트 명함 표시용 */
  phoneE164: string | null;
  /** 신규가입 시 디지털 명함 신청이 있었고 DB 행이 만들어진 경우 */
  digitalCard?: { issued: boolean; cardId: string | null };
  /** @ 없이 저장된 슬러그 — 클라이언트에서 @ 접두사로 표시 */
  publicHandle: string;
  /** 사업자 가입 시 DB에 저장된 직책(null 이면 명함에 직책 미표시) */
  businessJobTitle: string | null;
  birthDate: string | null;
  gender: string | null;
  /** true = CI 기준 기존 회원(재인증·로그인) */
  identityMatchedByCi: boolean;
  membershipKind?: string;
  activityTier?: number;
  isDiscounted?: boolean;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v.replace(/^["']|["']$/g, "").trim();
}

/** 클라이언트 `makeDevLocalImpUid` 와 동일 접두사 — 포트원 조회 없이 로컬 E2E 가입 */
const DEV_LOCAL_IMP_PREFIX = "dev_local_";

function assertDevIdentityAllowed(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_IDENTITY !== "1") {
    throw new Error("개발 전용 본인인증은 운영 환경에서 사용할 수 없습니다.");
  }
}

function isDevLocalImpUid(impUid: string): boolean {
  return impUid.startsWith(DEV_LOCAL_IMP_PREFIX);
}

function buildDevIdentityParsed(desiredSlug: string, impUid: string): {
  legalName: string;
  phoneE164: string;
  birthDate: string;
  gender: string;
  ciUniqueKey: string;
  impUid: string;
  certified: boolean;
} {
  const slug = desiredSlug || "e2e";
  const suffix = String(Date.now()).slice(-8);
  return {
    legalName: "E2E테스트",
    phoneE164: `+8210${suffix.padStart(8, "0").slice(0, 8)}`,
    /** User.birthDate @db.VarChar(8) — YYYYMMDD (실제 포트원 파싱과 동일) */
    birthDate: "19900101",
    /** User.gender @db.VarChar(1) — M / F */
    gender: "M",
    ciUniqueKey: `dev-ci-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    impUid,
    certified: true
  };
}

function normalizeTierSnapshot(t: string | undefined | null): string | null {
  const k = normalizeMembershipKind(t);
  return k;
}

/**
 * 온보딩에서만 true 로 전달. 기존 사용자가 다시 신청하면 멱등 upsert.
 */
async function issueDigitalCardIfRequested(
  userId: string,
  requestDigitalCard: boolean,
  membershipTierSnapshot: string | undefined
): Promise<{ issued: boolean; cardId: string | null }> {
  if (!requestDigitalCard) {
    return { issued: false, cardId: null };
  }
  const tier = normalizeTierSnapshot(membershipTierSnapshot);
  const card = await prisma.digitalCard.upsert({
    where: { userId },
    create: { userId, membershipTierSnapshot: tier },
    update: {
      ...(tier != null ? { membershipTierSnapshot: tier } : {}),
      updatedAt: new Date()
    }
  });
  return { issued: true, cardId: card.id };
}

function assertBusinessPayload(
  isBusiness: boolean,
  registrationNo: string | undefined | null,
  jobTitle: string | undefined | null,
  declaresNoJobTitle: boolean
) {
  if (!isBusiness) return;
  const digits = String(registrationNo || "").replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error("사업자등록번호 10자리를 입력해 주세요.");
  }
  if (!declaresNoJobTitle && !String(jobTitle || "").trim()) {
    throw new Error("관련 사업자 직책(예: 대표이사, 실무 담당)을 입력해 주세요. 직책이 없으면 「직책 없음」을 선택하세요.");
  }
}

async function upsertUserBusinessProfile(
  userId: string,
  registrationNoDigits: string,
  jobTitle: string | null,
  companyName?: string | null
) {
  const title =
    jobTitle == null || String(jobTitle).trim() === ""
      ? null
      : String(jobTitle).trim().slice(0, 120);
  const company = String(companyName || "").trim().slice(0, 200) || null;
  await prisma.userBusinessProfile.upsert({
    where: { userId },
    create: {
      userId,
      isBusiness: true,
      businessRegistrationNo: registrationNoDigits,
      jobTitle: title,
      companyName: company
    },
    update: {
      isBusiness: true,
      businessRegistrationNo: registrationNoDigits,
      jobTitle: title,
      ...(company ? { companyName: company } : {})
    }
  });
}

/**
 * IMP.certification 성공 후 전달된 imp_uid 로 포트원에서 실명·CI 조회 후 User 저장
 */
export async function completePortoneIdentity(params: {
  impUid: string;
  isBusinessMember: boolean;
  /** true 이면 본인인증 직후 digital_cards 행 생성 */
  requestDigitalCard?: boolean;
  /** 명함 스냅샷·멤버십 (free|paid — legacy standard/premium → paid) */
  membershipKind?: string;
  /** @deprecated — membershipKind 사용 */
  membershipTier?: string;
  billingCycle?: string;
  referralCode?: string | null;
  /** 마스터 휴대폰 본인인증 시 기기 키(클라이언트 localStorage) */
  adminDeviceKey?: string | null;
  /** 희망 회원 ID(영문 소문자·숫자·_, 3~20자). 비우면 서버가 자동 발급 */
  desiredPublicHandle?: string | null;
  /** 사업자 가입 시 10자리(하이픈 무시) */
  businessRegistrationNo?: string | null;
  /** 사업자 가입 시 관련 사업체 내 직책 */
  businessJobTitle?: string | null;
  /** 사업자 대표자명 (미입력 시 본인인증 실명) */
  businessRepresentativeName?: string | null;
  /** 사업자 개업일자 YYYYMMDD */
  businessOpenDate?: string | null;
  /** 상호 */
  companyName?: string | null;
  /** true 이면 직책 미입력·명함에는 성명만 */
  businessDeclaresNoJobTitle?: boolean;
  /** 신규 일반 가입 시 비밀번호(평문·HTTPS 상에서만 전송). 관리자 기기 경로는 생략 가능 */
  passwordPlain?: string | null;
  /** 유료 단체 가입(10회선+) — 가입 시 B2B draft 생성 */
  groupSignup?: GroupSignupPayload | null;
}): Promise<IdentityCompleteResult> {
  let parsed: Awaited<ReturnType<typeof fetchAndParseIamportCertification>>;
  if (isDevLocalImpUid(params.impUid)) {
    assertDevIdentityAllowed();
    const slug = normalizeDesiredPublicHandle(params.desiredPublicHandle) || "e2e";
    parsed = buildDevIdentityParsed(slug, params.impUid);
  } else {
    const impKey = requireEnv("PORTONE_API_KEY");
    const impSecret = requireEnv("PORTONE_API_SECRET");
    parsed = await fetchAndParseIamportCertification(params.impUid, impKey, impSecret);
  }
  const { legalName, phoneE164, birthDate, gender, ciUniqueKey } = parsed;

  const ciHashBuf = hashCiUniqueKey(ciUniqueKey);
  const ciPrisma = toPrismaBytes(ciHashBuf);

  const declaresNoJob = Boolean(params.businessDeclaresNoJobTitle);
  assertBusinessPayload(
    params.isBusinessMember,
    params.businessRegistrationNo,
    params.businessJobTitle,
    declaresNoJob
  );

  const desiredSlug = normalizeDesiredPublicHandle(params.desiredPublicHandle);
  const bizDigits = params.isBusinessMember
    ? String(params.businessRegistrationNo || "").replace(/\D/g, "").slice(0, 10)
    : "";
  const bizTitleForDb: string | null = params.isBusinessMember
    ? declaresNoJob
      ? null
      : String(params.businessJobTitle || "").trim() || null
    : null;

  const existing = await prisma.user.findFirst({
    where: { ciHash: { equals: ciPrisma } },
    select: {
      id: true,
      legalName: true,
      accountStatus: true,
      phoneE164: true,
      publicHandle: true
    }
  });

  const adminBypass = Boolean(params.adminDeviceKey);

  let userId: string;
  let base: Pick<
    IdentityCompleteResult,
    "userId" | "legalName" | "accountStatus" | "alreadyExisted"
  >;
  let publicHandle: string;

  if (existing) {
    const st = existing.accountStatus;
    const mapped: Extract<AccountStatus, "active" | "pending_approval"> =
      st === "pending_approval" ? "pending_approval" : "active";
    userId = existing.id;
    base = {
      userId,
      legalName: existing.legalName || legalName,
      accountStatus: mapped,
      alreadyExisted: true
    };
    publicHandle = await ensurePublicHandleForExistingUser(
      prisma,
      userId,
      existing.publicHandle,
      desiredSlug
    );
  } else {
    publicHandle = await resolvePublicHandleForNewUser(prisma, desiredSlug);
    if (!adminBypass) {
      const pw = String(params.passwordPlain || "");
      if (!isValidMemberPassword(pw)) {
        throw new Error(MEMBER_PASSWORD_INVALID_MESSAGE);
      }
    }
    const race = await prisma.user.findFirst({
      where: { publicHandle },
      select: { id: true }
    });
    if (race) {
      throw new Error("이미 사용 중인 아이디입니다. 아이디를 변경한 뒤 다시 시도해 주세요.");
    }
    const passwordHash =
      !adminBypass && params.passwordPlain ? await hashPassword(String(params.passwordPlain)) : null;
    const status = params.isBusinessMember ? "pending_approval" : "active";
    const now = new Date();
    const initial = buildInitialLegalNameData({
      legalName,
      portoneIdentityId: params.impUid,
      identityVerifiedAt: now,
      accountStatus: status,
      pendingApprovalAt: params.isBusinessMember ? now : null
    });

    const created = await prisma.user.create({
      data: {
        legalName: initial.legalName as string,
        legalNameLockedAt: now,
        identityVerified: true,
        identityVerifiedAt: now,
        portoneIdentityId: params.impUid,
        ciHash: ciPrisma,
        accountStatus: status,
        pendingApprovalAt: (initial.pendingApprovalAt as Date | null | undefined) ?? null,
        phoneE164: phoneE164 ?? null,
        birthDate,
        gender,
        publicHandle,
        signupMethod: "vlue_native",
        ...(passwordHash ? { passwordHash } : {}),
        status: "ACTIVE",
        currentDiscountRate: 30,
        referrerCode: String(params.referralCode || "")
          .trim()
          .toUpperCase() || null
      }
    });
    userId = created.id;
    base = {
      userId,
      legalName: created.legalName || legalName,
      accountStatus: status,
      alreadyExisted: false
    };

    try {
      await applyAbuseProtectionOnNewSignup({
        userId,
        ciHash: ciHashBuf,
        phoneE164: phoneE164 ?? null,
        referrerCode: params.referralCode ?? null
      });
    } catch (e) {
      console.error("[abuse-protection] rejoin check failed", userId, e);
    }
  }

  /** 신규 가입 시 휴대폰 기본 명함 행 생성 → §7 피드(card_id)·Wallet 연동 */
  if (!existing && phoneE164) {
    try {
      await prisma.businessCard.create({
        data: {
          userId,
          kind: "mobile",
          phoneE164,
          verificationStatus: "approved",
          displayName: legalName.trim(),
          isPremiumLine: false
        }
      });
    } catch {
      /* 번호 유니크 충돌 등은 무시 */
    }
  }

  if (existing) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(phoneE164 ? { phoneE164 } : {}),
          ...(birthDate ? { birthDate } : {}),
          ...(gender ? { gender } : {}),
          portoneIdentityId: params.impUid,
          identityVerified: true,
          identityVerifiedAt: new Date()
        }
      });
    } catch {
      /* ignore */
    }
  }

  let businessJobTitle: string | null = null;
  if (params.isBusinessMember) {
    await upsertUserBusinessProfile(
      userId,
      bizDigits,
      bizTitleForDb,
      params.companyName || params.groupSignup?.companyName
    );
    const bp = await prisma.userBusinessProfile.findUnique({
      where: { userId },
      select: { jobTitle: true }
    });
    businessJobTitle = bp?.jobTitle ?? null;

    if (!existing) {
      const repName = String(params.businessRepresentativeName || legalName).trim();
      const openDate = String(params.businessOpenDate || birthDate || "").replace(/\D/g, "");
      const onboarding = await runAutomatedBusinessOnboarding({
        userId,
        businessRegistrationNo: bizDigits,
        representativeName: repName,
        openDate: openDate.length >= 8 ? openDate.slice(0, 8) : "20000101",
        companyName: params.companyName || params.groupSignup?.companyName || undefined,
        phoneE164: phoneE164
      });
      base.accountStatus = onboarding.accountStatus;
    }
  }

  const membershipKindRaw = params.membershipKind ?? params.membershipTier;
  const isB2bSignup = isB2bMembershipKind(membershipKindRaw);

  if (!existing && isB2bSignup) {
    const company = String(params.groupSignup?.companyName || "").trim();
    if (!company) {
      throw new Error("기업 단체 가입: 상호(기업명)를 입력해 주세요.");
    }
  }

  const digitalCard = await issueDigitalCardIfRequested(
    userId,
    Boolean(params.requestDigitalCard),
    membershipKindRaw
  );

  let signupMembership: Awaited<ReturnType<typeof applySignupMembershipBundle>> | null = null;
  const hasGroupSignup = Boolean(params.groupSignup?.companyName) || isB2bSignup;
  if (!existing) {
    signupMembership = await applySignupMembershipBundle({
      userId,
      isNewUser: true,
      membershipKind: membershipKindRaw,
      billingCycle: params.billingCycle,
      referralCodeInput: params.referralCode,
      plannedLineCount: params.groupSignup?.plannedLineCount
    });
  }

  if (!existing && params.groupSignup && hasGroupSignup) {
    assertAdminPhoneForGroupSignup(phoneE164);
    const cycle = params.billingCycle === "annual" ? "annual" : "monthly";
    const sponsorId =
      signupMembership && "sponsorVluerUserId" in signupMembership
        ? signupMembership.sponsorVluerUserId
        : null;
    const hasReferral = Boolean(
      signupMembership &&
        "referralCodeUsed" in signupMembership &&
        signupMembership.referralCodeUsed
    );
    await applyGroupSignupOnboarding(
      userId,
      params.groupSignup,
      cycle,
      sponsorId,
      phoneE164,
      hasReferral
    );
  }

  try {
    await upsertMasterAdminDeviceIfEligible({
      userId,
      phoneE164ForCheck: phoneE164,
      adminDeviceKey: params.adminDeviceKey
    });
  } catch {
    /* 마스터 기기 등록 실패는 본인인증 본흐름에 영향 없음 */
  }

  const resolvedPhoneE164 = phoneE164 ?? existing?.phoneE164 ?? null;
  return {
    ...base,
    digitalCard,
    phoneE164: resolvedPhoneE164,
    publicHandle,
    businessJobTitle,
    birthDate,
    gender,
    identityMatchedByCi: Boolean(existing),
    membershipKind: normalizeMembershipKind(membershipKindRaw),
    isDiscounted:
      signupMembership && signupMembership.applied ? signupMembership.isDiscounted : undefined
  };
}
