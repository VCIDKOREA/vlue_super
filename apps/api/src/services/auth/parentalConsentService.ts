import { Buffer } from "node:buffer";
import { prisma } from "../../db/client.js";
import {
  fetchAndParseIamportCertification,
  hashCiUniqueKey
} from "../../integrations/portone/iamportCert.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendFamilyProtectionPush } from "../fcmNotificationService.js";
import {
  isAdultSignupAge,
  isMinorForParentalConsent,
  PARENTAL_CONSENT_REQUIRED_MESSAGE
} from "@vlue/shared/policy/minor-signup";

const DEV_LOCAL_IMP_PREFIX = "dev_local_";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v.replace(/^["']|["']$/g, "").trim();
}

function assertDevIdentityAllowed(): void {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_IDENTITY !== "1") {
    throw new Error("개발 전용 본인인증은 운영 환경에서 사용할 수 없습니다.");
  }
}

function isDevLocalImpUid(impUid: string): boolean {
  return impUid.startsWith(DEV_LOCAL_IMP_PREFIX);
}

export class ParentalConsentError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "PARENTAL_CONSENT_FAILED") {
    super(message);
    this.name = "ParentalConsentError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function parseGuardianCert(impUid: string) {
  if (isDevLocalImpUid(impUid)) {
    assertDevIdentityAllowed();
    return {
      legalName: "E2E부모",
      birthDate: "19850301",
      ciUniqueKey: `dev-guardian-${Date.now()}`
    };
  }
  const impKey = requireEnv("PORTONE_API_KEY");
  const impSecret = requireEnv("PORTONE_API_SECRET");
  const parsed = await fetchAndParseIamportCertification(impUid, impKey, impSecret);
  return {
    legalName: parsed.legalName,
    birthDate: parsed.birthDate,
    ciUniqueKey: parsed.ciUniqueKey
  };
}

function wardDisplayLabel(minor: { legalName?: string | null; publicHandle?: string | null }): string {
  return minor.publicHandle ? `@${minor.publicHandle}` : minor.legalName || "자녀";
}

/** 로그인한 보호자 계정과 PASS CI 일치 여부 (자녀 초대·앱 승인 공통) */
export async function verifyGuardianPassCiMatchesUser(
  guardianUserId: string,
  guardianImpUid: string
): Promise<void> {
  const impUid = String(guardianImpUid || "").trim();
  if (!impUid) {
    throw new ParentalConsentError("보호자 본인인증 imp_uid 가 필요합니다.", 400, "MISSING_IMP_UID");
  }

  const guardian = await prisma.user.findUnique({
    where: { id: guardianUserId },
    select: {
      id: true,
      ciHash: true,
      status: true,
      requiresParentalConsent: true,
      parentalConsentAt: true
    }
  });
  if (!guardian || guardian.status === "DELETED") {
    throw new ParentalConsentError("보호자 계정을 찾을 수 없습니다.", 404, "GUARDIAN_NOT_FOUND");
  }
  if (guardian.requiresParentalConsent && !guardian.parentalConsentAt) {
    throw new ParentalConsentError("보호자 계정도 부모 승인이 필요합니다.", 403, "GUARDIAN_PENDING");
  }
  if (!guardian.ciHash) {
    throw new ParentalConsentError("보호자 본인인증 정보가 없습니다. PASS 인증 후 다시 시도해 주세요.", 403, "GUARDIAN_NO_CI");
  }

  const cert = await parseGuardianCert(impUid);
  if (!isAdultSignupAge(cert.birthDate)) {
    throw new ParentalConsentError("법정대리인은 만 14세 이상이어야 합니다.", 403, "GUARDIAN_UNDERAGE");
  }

  const certCiHash = hashCiUniqueKey(cert.ciUniqueKey);
  if (!Buffer.from(guardian.ciHash).equals(certCiHash)) {
    throw new ParentalConsentError(
      "본인인증 정보가 로그인한 보호자 계정과 일치하지 않습니다.",
      403,
      "GUARDIAN_CI_MISMATCH"
    );
  }
}

async function resolveGuardianFromPass(impUid: string, minorCiHash?: Uint8Array | null) {
  const guardianCert = await parseGuardianCert(impUid);
  if (!isAdultSignupAge(guardianCert.birthDate)) {
    throw new ParentalConsentError(
      "법정대리인은 만 14세 이상이어야 합니다.",
      403,
      "GUARDIAN_UNDERAGE"
    );
  }

  const guardianCiHash = hashCiUniqueKey(guardianCert.ciUniqueKey);
  const guardianCiPrisma = new Uint8Array(guardianCiHash);
  const guardian = await prisma.user.findFirst({
    where: {
      ciHash: { equals: guardianCiPrisma },
      status: { not: "DELETED" }
    },
    select: { id: true, legalName: true, publicHandle: true, requiresParentalConsent: true, parentalConsentAt: true }
  });

  if (!guardian) {
    throw new ParentalConsentError(
      "법정대리인 VLUE 계정이 없습니다. 부모님이 먼저 VLUE에 가입한 뒤 본인인증으로 승인해 주세요.",
      404,
      "GUARDIAN_NOT_MEMBER"
    );
  }
  if (guardian.requiresParentalConsent && !guardian.parentalConsentAt) {
    throw new ParentalConsentError("법정대리인 계정도 부모 승인이 필요합니다.", 403, "GUARDIAN_PENDING");
  }
  if (minorCiHash && Buffer.from(minorCiHash).equals(guardianCiHash)) {
    throw new ParentalConsentError("자녀와 동일인은 법정대리인이 될 수 없습니다.", 400, "SAME_CI");
  }

  return { guardian, guardianCiHash };
}

async function finalizeParentalConsent(
  minor: { id: string; legalName?: string | null; publicHandle?: string | null; ciHash?: Uint8Array | null },
  guardian: { id: string; legalName?: string | null; publicHandle?: string | null }
): Promise<{ ok: true; guardianUserId: string; familyLinkId: string }> {
  const now = new Date();

  const link = await familyProtectionDb.familyProtectionLink.upsert({
    where: {
      guardianUserId_wardUserId: { guardianUserId: guardian.id, wardUserId: minor.id }
    },
    create: {
      guardianUserId: guardian.id,
      wardUserId: minor.id,
      wardRole: "child",
      familyRelation: "child",
      status: "active",
      wardAcceptedAt: now
    },
    update: {
      wardRole: "child",
      familyRelation: "child",
      status: "active",
      wardAcceptedAt: now
    }
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: minor.id },
      data: {
        requiresParentalConsent: true,
        parentalConsentAt: now,
        parentalGuardianUserId: guardian.id,
        accountStatus: "active",
        pendingApprovalAt: null
      }
    }),
    prisma.verificationLog.create({
      data: {
        userId: minor.id,
        action: "parental_consent_approved",
        detail: {
          guardianUserId: guardian.id,
          guardianLegalName: guardian.legalName,
          familyLinkId: link.id,
          at: now.toISOString()
        },
        outcome: "approved"
      }
    })
  ]);

  const wardLabel = wardDisplayLabel(minor);
  ssePublish(guardian.id, {
    type: "vlue-parental-consent-approved",
    wardUserId: minor.id,
    wardLabel,
    familyLinkId: link.id
  });
  ssePublish(minor.id, {
    type: "vlue-parental-consent-approved",
    wardUserId: minor.id,
    wardLabel,
    familyLinkId: link.id,
    message: "부모 승인이 완료되었습니다. 가족보호가 시작됩니다."
  });

  return { ok: true, guardianUserId: guardian.id, familyLinkId: link.id };
}

export async function notifyGuardianParentalConsentRequest(
  guardianUserId: string,
  minor: { id: string; legalName?: string | null; publicHandle?: string | null }
): Promise<void> {
  const wardLabel = wardDisplayLabel(minor);
  const title = "자녀 가입 승인 요청";
  const body = `${wardLabel} 님의 VLUE 가입에 법정대리인 PASS 승인이 필요합니다.`;

  try {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId: guardianUserId,
        actorUserId: minor.id,
        title,
        body
      }
    });
  } catch {
    /* ignore */
  }

  ssePublish(guardianUserId, {
    type: "vlue-parental-consent-request",
    wardUserId: minor.id,
    wardLabel,
    title,
    body
  });

  try {
    await sendFamilyProtectionPush(guardianUserId, title, body, {
      type: "vlue-parental-consent-request",
      wardUserId: minor.id,
      wardLabel
    });
  } catch (err) {
    console.warn("[parental-consent] fcm_notify_failed", { guardianUserId, err });
  }
}

/** 미성년 가입 후 지정 보호자에게 승인 요청 (자녀 세션) */
export async function requestParentalConsentToGuardian(
  minorUserId: string,
  guardianHandleRaw: string
): Promise<{ ok: true; guardianUserId: string }> {
  const handle = String(guardianHandleRaw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!handle) {
    throw new ParentalConsentError("부모 VLUE 아이디를 입력해 주세요.", 400, "MISSING_GUARDIAN_HANDLE");
  }

  const minor = await prisma.user.findUnique({
    where: { id: minorUserId },
    select: {
      id: true,
      status: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      ciHash: true,
      legalName: true,
      publicHandle: true
    }
  });
  if (!minor || minor.status === "DELETED") {
    throw new ParentalConsentError("자녀 계정을 찾을 수 없습니다.", 404, "MINOR_NOT_FOUND");
  }
  if (!minor.requiresParentalConsent) {
    throw new ParentalConsentError("부모 승인이 필요한 가입이 아닙니다.", 400, "NOT_MINOR_SIGNUP");
  }
  if (minor.parentalConsentAt) {
    throw new ParentalConsentError("이미 부모 승인이 완료된 계정입니다.", 409, "ALREADY_APPROVED");
  }

  const guardian = await prisma.user.findFirst({
    where: { publicHandle: handle, status: { not: "DELETED" } },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      ciHash: true
    }
  });
  if (!guardian) {
    throw new ParentalConsentError("해당 아이디의 보호자 회원을 찾을 수 없습니다.", 404, "GUARDIAN_HANDLE_NOT_FOUND");
  }
  if (guardian.id === minor.id) {
    throw new ParentalConsentError("본인을 보호자로 지정할 수 없습니다.", 400, "SELF_GUARDIAN");
  }
  if (guardian.requiresParentalConsent && !guardian.parentalConsentAt) {
    throw new ParentalConsentError("지정한 보호자도 부모 승인이 필요합니다.", 403, "GUARDIAN_PENDING");
  }
  if (minor.ciHash && guardian.ciHash && Buffer.from(minor.ciHash).equals(Buffer.from(guardian.ciHash))) {
    throw new ParentalConsentError("자녀와 동일인은 보호자가 될 수 없습니다.", 400, "SAME_CI");
  }

  await prisma.user.update({
    where: { id: minor.id },
    data: { parentalGuardianUserId: guardian.id }
  });
  await prisma.verificationLog.create({
    data: {
      userId: minor.id,
      action: "parental_consent_request",
      detail: {
        guardianUserId: guardian.id,
        guardianHandle: handle,
        at: new Date().toISOString()
      },
      outcome: "pending"
    }
  });

  await notifyGuardianParentalConsentRequest(guardian.id, minor);
  return { ok: true, guardianUserId: guardian.id };
}

/** 보호자 앱 — 승인 대기 자녀 목록 */
export async function listPendingParentalConsentsForGuardian(guardianUserId: string) {
  const rows = await prisma.user.findMany({
    where: {
      requiresParentalConsent: true,
      parentalConsentAt: null,
      parentalGuardianUserId: guardianUserId,
      status: { not: "DELETED" }
    },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return {
    pending: rows.map((r) => ({
      wardUserId: r.id,
      wardLabel: wardDisplayLabel(r),
      requestedAt: r.createdAt.toISOString()
    }))
  };
}

/** 보호자 앱 — 부모 폰에서 PASS 승인 (보호자 JWT + wardUserId) */
export async function approveParentalConsentByGuardianSession(
  guardianUserId: string,
  wardUserId: string,
  guardianImpUid: string
): Promise<{ ok: true; guardianUserId: string; familyLinkId: string }> {
  const wardId = String(wardUserId || "").trim();
  if (!wardId) {
    throw new ParentalConsentError("자녀 계정 ID가 필요합니다.", 400, "MISSING_WARD_ID");
  }

  await verifyGuardianPassCiMatchesUser(guardianUserId, guardianImpUid);

  const minor = await prisma.user.findUnique({
    where: { id: wardId },
    select: {
      id: true,
      status: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      parentalGuardianUserId: true,
      ciHash: true,
      legalName: true,
      publicHandle: true
    }
  });
  if (!minor || minor.status === "DELETED") {
    throw new ParentalConsentError("자녀 계정을 찾을 수 없습니다.", 404, "MINOR_NOT_FOUND");
  }
  if (!minor.requiresParentalConsent) {
    throw new ParentalConsentError("부모 승인이 필요한 가입이 아닙니다.", 400, "NOT_MINOR_SIGNUP");
  }
  if (minor.parentalConsentAt) {
    throw new ParentalConsentError("이미 부모 승인이 완료된 계정입니다.", 409, "ALREADY_APPROVED");
  }
  if (minor.parentalGuardianUserId && minor.parentalGuardianUserId !== guardianUserId) {
    throw new ParentalConsentError(
      "다른 보호자에게 승인 요청이 전달된 자녀입니다.",
      403,
      "GUARDIAN_NOT_ASSIGNED"
    );
  }

  const guardian = await prisma.user.findUnique({
    where: { id: guardianUserId },
    select: { id: true, legalName: true, publicHandle: true }
  });
  if (!guardian) {
    throw new ParentalConsentError("보호자 계정을 찾을 수 없습니다.", 404, "GUARDIAN_NOT_FOUND");
  }
  if (minor.id === guardian.id) {
    throw new ParentalConsentError("본인을 법정대리인으로 지정할 수 없습니다.", 400, "SELF_GUARDIAN");
  }
  if (minor.ciHash && guardian.id) {
    const g = await prisma.user.findUnique({ where: { id: guardian.id }, select: { ciHash: true } });
    if (g?.ciHash && Buffer.from(minor.ciHash).equals(Buffer.from(g.ciHash))) {
      throw new ParentalConsentError("자녀와 동일인은 법정대리인이 될 수 없습니다.", 400, "SAME_CI");
    }
  }

  return finalizeParentalConsent(minor, guardian);
}

/** 자녀 기기 — 같은 기기에서 부모 PASS 승인 */
export async function approveParentalConsentWithGuardianPass(
  minorUserId: string,
  guardianImpUid: string
): Promise<{ ok: true; guardianUserId: string; familyLinkId: string }> {
  const impUid = String(guardianImpUid || "").trim();
  if (!impUid) {
    throw new ParentalConsentError("부모 본인인증 imp_uid 가 필요합니다.", 400, "MISSING_IMP_UID");
  }

  const minor = await prisma.user.findUnique({
    where: { id: minorUserId },
    select: {
      id: true,
      status: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      ciHash: true,
      legalName: true,
      publicHandle: true
    }
  });

  if (!minor || minor.status === "DELETED") {
    throw new ParentalConsentError("자녀 계정을 찾을 수 없습니다.", 404, "MINOR_NOT_FOUND");
  }
  if (!minor.requiresParentalConsent) {
    throw new ParentalConsentError("부모 승인이 필요한 가입이 아닙니다.", 400, "NOT_MINOR_SIGNUP");
  }
  if (minor.parentalConsentAt) {
    throw new ParentalConsentError("이미 부모 승인이 완료된 계정입니다.", 409, "ALREADY_APPROVED");
  }

  const { guardian } = await resolveGuardianFromPass(impUid, minor.ciHash);
  if (guardian.id === minor.id) {
    throw new ParentalConsentError("본인을 법정대리인으로 지정할 수 없습니다.", 400, "SELF_GUARDIAN");
  }

  return finalizeParentalConsent(minor, guardian);
}

/** 미성년 가입 직후 — 대기 중인 자녀 초대가 있으면 보호자에게 승인 요청 */
export async function syncParentalConsentFromPendingChildInvites(minorUserId: string): Promise<void> {
  const minor = await prisma.user.findUnique({
    where: { id: minorUserId },
    select: {
      id: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      parentalGuardianUserId: true,
      legalName: true,
      publicHandle: true
    }
  });
  if (!minor?.requiresParentalConsent || minor.parentalConsentAt) return;

  const links = await familyProtectionDb.familyProtectionLink.findMany({
    where: {
      wardUserId: minorUserId,
      familyRelation: "child",
      status: { in: ["pending", "active"] }
    },
    select: { guardianUserId: true },
    orderBy: { createdAt: "asc" },
    take: 5
  });
  if (!links.length) return;

  const guardianUserId = links[0].guardianUserId;
  if (!minor.parentalGuardianUserId) {
    await prisma.user.update({
      where: { id: minorUserId },
      data: { parentalGuardianUserId: guardianUserId }
    });
  } else if (minor.parentalGuardianUserId !== guardianUserId) {
    return;
  }

  await notifyGuardianParentalConsentRequest(guardianUserId, minor);
}

/** 자녀 초대 후 — 미성년 자녀 계정이면 보호자에게 가입 승인 요청 */
export async function notifyParentalConsentAfterChildInvite(
  guardianUserId: string,
  wardUserId: string
): Promise<void> {
  const ward = await prisma.user.findUnique({
    where: { id: wardUserId },
    select: {
      id: true,
      requiresParentalConsent: true,
      parentalConsentAt: true,
      parentalGuardianUserId: true,
      legalName: true,
      publicHandle: true
    }
  });
  if (!ward?.requiresParentalConsent || ward.parentalConsentAt) return;

  if (!ward.parentalGuardianUserId) {
    await prisma.user.update({
      where: { id: wardUserId },
      data: { parentalGuardianUserId: guardianUserId }
    });
  } else if (ward.parentalGuardianUserId !== guardianUserId) {
    return;
  }

  await notifyGuardianParentalConsentRequest(guardianUserId, ward);
}

export { PARENTAL_CONSENT_REQUIRED_MESSAGE, isMinorForParentalConsent };
