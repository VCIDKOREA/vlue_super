import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { prisma } from "../db/client.js";
import { verifyPassword } from "../lib/passwordHash.js";
import {
  issueTokenPair,
  listOtherActiveMobileAppDevices,
  revokeOtherMobileAppSessions
} from "./authSessions.js";
import { assertLineTypeAllowsClient, detectClientKind, type ClientKind } from "../middleware/enterpriseAccess.js";
import { isDeviceAutoApproveHandle, isVlueSeedTestHandle } from "../lib/testAccounts.js";
import { upsertEnterpriseDraft } from "./b2b/cartEngine.js";
import { resolveLoginMembershipTier } from "./membership/platformCeoPremium.js";
import {
  detectAuthPlatform,
  mobileAppDeviceLabel,
  requestClientIp,
  requestGeoLabel,
  sessionClientKind,
  type AuthPlatform
} from "../lib/authPlatform.js";
import {
  EMAIL_AUTH_SUPPORT,
  EMAIL_OTP_TTL_SEC,
  maskEmail,
  putLoginGateTicket,
  resolveUserNotifyEmail,
  sendEmailAuthCode
} from "./email/emailAuthCodeService.js";

export type { ClientKind };
export { detectClientKind };

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

type LoginUserRow = {
  id: string;
  legalName: string | null;
  publicHandle: string | null;
  accountStatus: string;
  passwordHash: string | null;
  phoneE164: string | null;
  lineType: string;
  status: string;
};

export type LoginResult =
  | {
      status: "ok";
      userId: string;
      legalName: string;
      publicHandle: string;
      accountStatus: string;
      phoneE164: string | null;
      membershipTier: string;
      accessToken: string;
      refreshToken: string;
      accessExpiresInSec: number;
      enterpriseRole: string;
      lineType: string;
      deviceToken: string;
    }
  | {
      status: "device_pending";
      deviceToken: string;
      message: string;
      pendingDeviceId: string;
    }
  | {
      status: "device_conflict";
      deviceToken: string;
      activeDeviceLabel: string;
      activeDevices: { label: string }[];
      message: string;
    }
  | {
      status: "email_code_required";
      ticket: string;
      maskedEmail: string;
      expiresInSec: number;
      message: string;
      supportEmail: string;
      deviceToken: string;
    }
  | {
      status: "email_unavailable";
      message: string;
      supportEmail: string;
    };

async function issueLoginOk(
  user: LoginUserRow,
  loginId: string,
  deviceToken: string,
  c: Context,
  platform: AuthPlatform
): Promise<Extract<LoginResult, { status: "ok" }>> {
  const pair = await issueTokenPair(
    user.id,
    { header: (n) => c.req.header(n) },
    {
      platform,
      deviceToken,
      clientKind: sessionClientKind(platform, c),
      geoLabel: requestGeoLabel({ header: (n) => c.req.header(n) })
    }
  );
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enterpriseRole: true, lineType: true, publicHandle: true }
  });
  const handle = full?.publicHandle || user.publicHandle || loginId;
  const membershipTier = await resolveLoginMembershipTier(user.id, handle);
  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      accountStatus: true,
      phoneE164: true,
      legalName: true,
      identityVerified: true
    }
  });
  return {
    status: "ok",
    userId: user.id,
    legalName: refreshed?.legalName || user.legalName || "",
    publicHandle: handle,
    accountStatus: refreshed?.accountStatus || user.accountStatus,
    phoneE164: refreshed?.phoneE164 ?? user.phoneE164,
    membershipTier,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    accessExpiresInSec: pair.accessExpiresInSec,
    enterpriseRole: full?.enterpriseRole || "NONE",
    lineType: full?.lineType || "NONE",
    deviceToken
  };
}

async function upsertTrackedDevice(opts: {
  userId: string;
  deviceToken: string;
  c: Context;
  platform: AuthPlatform;
  verified: boolean;
  label: string;
}) {
  const req = { header: (n: string) => opts.c.req.header(n) };
  const clientKind = detectClientKind(opts.c);
  return prisma.userDevice.upsert({
    where: { userId_deviceToken: { userId: opts.userId, deviceToken: opts.deviceToken } },
    create: {
      userId: opts.userId,
      deviceToken: opts.deviceToken,
      isVerified: opts.verified,
      verifiedAt: opts.verified ? new Date() : null,
      userAgent: req.header("user-agent")?.slice(0, 512) || null,
      lastIp: requestClientIp(req),
      geoLabel: requestGeoLabel(req),
      clientKind,
      platform: opts.platform,
      label: opts.label
    },
    update: {
      isVerified: opts.verified,
      verifiedAt: opts.verified ? new Date() : null,
      userAgent: req.header("user-agent")?.slice(0, 512) || null,
      lastIp: requestClientIp(req),
      geoLabel: requestGeoLabel(req),
      clientKind,
      platform: opts.platform,
      label: opts.label
    }
  });
}

export async function completeAppLoginFromGate(
  userId: string,
  loginId: string,
  deviceToken: string,
  c: Context
): Promise<Extract<LoginResult, { status: "ok" }>> {
  const user = (await prisma.user.findUnique({ where: { id: userId } })) as LoginUserRow | null;
  if (!user) throw new Error("계정을 찾을 수 없습니다.");
  const label = mobileAppDeviceLabel({ header: (n) => c.req.header(n) });
  await upsertTrackedDevice({
    userId,
    deviceToken,
    c,
    platform: "app",
    verified: true,
    label
  });
  await revokeOtherMobileAppSessions(userId, deviceToken);
  return issueLoginOk(user, loginId, deviceToken, c, "app");
}

export async function loginWithCredentials(
  loginId: string,
  password: string,
  deviceTokenInput: string | null | undefined,
  c: Context,
  platformHint?: string | null,
  forceLogoutOther = false
): Promise<LoginResult> {
  const loginIdNorm = String(loginId || "").trim().toLowerCase().replace(/^@/, "");
  const user = (await prisma.user.findFirst({
    where: loginIdNorm.includes("@")
      ? {
          OR: [{ publicHandle: loginIdNorm }, { email: loginIdNorm }]
        }
      : { publicHandle: loginIdNorm }
  })) as LoginUserRow | null;

  if (!user?.passwordHash) {
    throw new Error("비밀번호가 설정되지 않았거나 아이디가 올바르지 않습니다.");
  }
  if (user.status === "DELETED") {
    throw new Error("탈퇴한 계정입니다. 재가입하려면 본인인증부터 다시 진행해 주세요.");
  }
  /**
   * 부모 승인 로그인 게이트 폐지.
   * 과거 정책으로 requiresParentalConsent 만 켜진 계정은 로그인 시 해제.
   */
  const consentGate = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      requiresParentalConsent: true,
      parentalConsentAt: true,
      accountStatus: true,
      businessProfile: { select: { isBusiness: true, businessRegistrationNo: true } }
    }
  });
  if (consentGate?.requiresParentalConsent && !consentGate.parentalConsentAt) {
    const isBizPending = Boolean(
      consentGate.businessProfile?.isBusiness ||
        String(consentGate.businessProfile?.businessRegistrationNo || "").trim()
    );
    const healData: {
      requiresParentalConsent: boolean;
      accountStatus?: "active";
      pendingApprovalAt?: null;
    } = { requiresParentalConsent: false };
    if (consentGate.accountStatus === "pending_approval" && !isBizPending) {
      healData.accountStatus = "active";
      healData.pendingApprovalAt = null;
    }
    await prisma.user.update({ where: { id: user.id }, data: healData });
    console.warn("[auth] cleared legacy parental-consent gate (minors may login)", {
      userId: user.id
    });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const clientKind = detectClientKind(c);
  assertLineTypeAllowsClient(user.lineType as "NONE" | "WIRED" | "MOBILE", clientKind);
  const platform = detectAuthPlatform({ header: (n) => c.req.header(n) }, platformHint);
  const appLabel = mobileAppDeviceLabel({ header: (n) => c.req.header(n) });

  /**
   * QA 시드 계정: test_b2b 는 "대표(MASTER)"로 테스트할 수 있게 서버에서 자동 승격
   * - enterpriseGroupId = 본인
   * - enterprise draft 계정 자동 생성 → /api/b2b/enterprise/me 가 null이 되지 않게
   */
  if (loginIdNorm === "test_b2b" && isVlueSeedTestHandle(loginIdNorm)) {
    console.log("[seed-test] promote test_b2b to MASTER", { userId: user.id });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        enterpriseRole: "MASTER",
        enterpriseGroupId: user.id,
        enterpriseDept: "대표",
        lineType: "MOBILE"
      }
    });
    await upsertEnterpriseDraft(user.id, {
      companyName: "테스트 B2B 기업",
      masterDisplayNumber: "1588-0000",
      carrier: "LGUPLUS",
      billingCycle: "monthly"
    });
  }

  let deviceToken = String(deviceTokenInput || "").trim();
  if (!deviceToken) deviceToken = generateDeviceToken();

  const existingDevice = await prisma.userDevice.findUnique({
    where: { userId_deviceToken: { userId: user.id, deviceToken } }
  });

  /* 웹(www.vlue.kr) — 중복 로그인 허용, IP·위치·기기 기록만 */
  if (platform === "web") {
    await upsertTrackedDevice({
      userId: user.id,
      deviceToken,
      c,
      platform: "web",
      verified: true,
      label: clientKind === "mobile" ? "웹(모바일)" : "웹(PC)"
    });
    return issueLoginOk(user, loginId, deviceToken, c, "web");
  }

  /* 휴대기기 앱(Android/iOS) — 다른 앱 기기 활성 시 확인 후 단일 세션 */
  const otherMobile = await listOtherActiveMobileAppDevices(user.id, deviceToken);
  if (otherMobile.length > 0 && !forceLogoutOther) {
    const activeDeviceLabel = otherMobile[0]?.label || "다른 모바일 기기";
    return {
      status: "device_conflict",
      deviceToken,
      activeDeviceLabel,
      activeDevices: otherMobile.map((d) => ({ label: d.label })),
      message: `다른 기기에서 접속 중입니다. (${activeDeviceLabel}) 로그아웃 하시겠습니까?`
    };
  }
  if (forceLogoutOther) {
    await revokeOtherMobileAppSessions(user.id, deviceToken);
  }

  /* 이미 이 기기면 로그인 */
  if (existingDevice?.isVerified) {
    await upsertTrackedDevice({
      userId: user.id,
      deviceToken,
      c,
      platform: "app",
      verified: true,
      label: existingDevice.label || appLabel
    });
    await revokeOtherMobileAppSessions(user.id, deviceToken);
    return issueLoginOk(user, loginId, deviceToken, c, "app");
  }

  const firstAppDevice =
    (await prisma.userDevice.count({
      where: { userId: user.id, isVerified: true, platform: "app" }
    })) === 0;

  if (isDeviceAutoApproveHandle(loginId) || (firstAppDevice && !(await resolveUserNotifyEmail(user.id)))) {
    await upsertTrackedDevice({
      userId: user.id,
      deviceToken,
      c,
      platform: "app",
      verified: true,
      label: appLabel
    });
    await revokeOtherMobileAppSessions(user.id, deviceToken);
    return issueLoginOk(user, loginId, deviceToken, c, "app");
  }

  const notifyEmail = await resolveUserNotifyEmail(user.id);
  if (!notifyEmail) {
    return {
      status: "email_unavailable",
      supportEmail: "support@vlue.kr",
      message: `새 기기 로그인을 확인하려면 가입 이메일이 필요합니다. ${EMAIL_AUTH_SUPPORT}`
    };
  }

  const ticket = await putLoginGateTicket({
    userId: user.id,
    loginId: loginIdNorm,
    deviceToken
  });
  await sendEmailAuthCode({ purpose: "login_device", emailRaw: notifyEmail });
  await upsertTrackedDevice({
    userId: user.id,
    deviceToken,
    c,
    platform: "app",
    verified: false,
    label: `${appLabel} (인증 대기)`
  });

  return {
    status: "email_code_required",
    ticket,
    deviceToken,
    maskedEmail: maskEmail(notifyEmail),
    expiresInSec: EMAIL_OTP_TTL_SEC,
    supportEmail: "support@vlue.kr",
    message: `새 기기에서 로그인하려면 ${maskEmail(notifyEmail)} 로 보낸 인증번호를 입력해 주세요. ${EMAIL_AUTH_SUPPORT}`
  };
}

/** MASTER/MANAGER — 미승인 기기 허용 */
export async function approvePendingDevice(approverUserId: string, pendingDeviceId: string) {
  const approver = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { enterpriseRole: true, enterpriseGroupId: true, id: true }
  });
  if (!approver) throw new Error("승인 권한이 없습니다.");

  const canApprove =
    approver.enterpriseRole === "MASTER" ||
    approver.enterpriseRole === "MANAGER" ||
    approver.enterpriseRole === "NONE";

  if (!canApprove && approver.enterpriseRole !== "BUYER") {
    throw new Error("기기 승인 권한이 없습니다.");
  }

  const device = await prisma.userDevice.findUnique({
    where: { id: pendingDeviceId },
    include: { user: { select: { id: true, enterpriseGroupId: true, enterpriseRole: true } } }
  });
  if (!device) throw new Error("기기를 찾을 수 없습니다.");

  if (approver.enterpriseRole !== "NONE") {
    const sameGroup =
      device.user.id === approver.id ||
      device.user.enterpriseGroupId === approver.enterpriseGroupId ||
      device.user.enterpriseGroupId === approver.id ||
      device.user.id === approver.enterpriseGroupId;
    if (!sameGroup) throw new Error("같은 기업 소속 기기만 승인할 수 있습니다.");
  } else if (device.userId !== approverUserId) {
    throw new Error("본인 계정의 기기만 승인할 수 있습니다.");
  }

  return prisma.userDevice.update({
    where: { id: pendingDeviceId },
    data: { isVerified: true, verifiedAt: new Date() }
  });
}

export async function listPendingDevicesForApprover(approverUserId: string) {
  const approver = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { id: true, enterpriseRole: true, enterpriseGroupId: true }
  });
  if (!approver) return [];

  const groupMasterId =
    approver.enterpriseRole === "MASTER" ? approver.id : approver.enterpriseGroupId;

  if (groupMasterId && approver.enterpriseRole !== "NONE") {
    const memberIds = await prisma.user.findMany({
      where: {
        OR: [{ id: groupMasterId }, { enterpriseGroupId: groupMasterId }]
      },
      select: { id: true }
    });
    return prisma.userDevice.findMany({
      where: {
        userId: { in: memberIds.map((m) => m.id) },
        isVerified: false
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  return prisma.userDevice.findMany({
    where: { userId: approverUserId, isVerified: false },
    orderBy: { createdAt: "desc" }
  });
}
