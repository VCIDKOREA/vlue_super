import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { prisma } from "../db/client.js";
import { verifyPassword } from "../lib/passwordHash.js";
import { issueTokenPair } from "./authSessions.js";
import { assertLineTypeAllowsClient, detectClientKind, type ClientKind } from "../middleware/enterpriseAccess.js";
import { PARENTAL_CONSENT_PENDING_LOGIN_MESSAGE } from "@vlue/shared/policy/minor-signup";
import { isVlueSeedTestHandle } from "../lib/testAccounts.js";
import { upsertEnterpriseDraft } from "./b2b/cartEngine.js";

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
    };

async function issueLoginOk(
  user: LoginUserRow,
  loginId: string,
  deviceToken: string,
  c: Context
): Promise<Extract<LoginResult, { status: "ok" }>> {
  const pair = await issueTokenPair(user.id, { header: (n) => c.req.header(n) });
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enterpriseRole: true, lineType: true }
  });
  return {
    status: "ok",
    userId: user.id,
    legalName: user.legalName || "",
    publicHandle: user.publicHandle || loginId,
    accountStatus: user.accountStatus,
    phoneE164: user.phoneE164,
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    accessExpiresInSec: pair.accessExpiresInSec,
    enterpriseRole: full?.enterpriseRole || "NONE",
    lineType: full?.lineType || "NONE",
    deviceToken
  };
}

export async function loginWithCredentials(
  loginId: string,
  password: string,
  deviceTokenInput: string | null | undefined,
  c: Context
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
  const consentGate = await prisma.user.findUnique({
    where: { id: user.id },
    select: { requiresParentalConsent: true, parentalConsentAt: true }
  });
  if (consentGate?.requiresParentalConsent && !consentGate.parentalConsentAt) {
    throw new Error(PARENTAL_CONSENT_PENDING_LOGIN_MESSAGE);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const clientKind = detectClientKind(c);
  assertLineTypeAllowsClient(user.lineType as "NONE" | "WIRED" | "MOBILE", clientKind);

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

  if (existingDevice?.isVerified) {
    await prisma.userDevice.update({
      where: { id: existingDevice.id },
      data: {
        userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
        lastIp: c.req.header("x-forwarded-for")?.split(",")[0]?.trim()?.slice(0, 45) || null,
        clientKind
      }
    });
    return issueLoginOk(user, loginId, deviceToken, c);
  }

  const verifiedCount = await prisma.userDevice.count({
    where: { userId: user.id, isVerified: true }
  });

  if (verifiedCount === 0) {
    const first = await prisma.userDevice.upsert({
      where: { userId_deviceToken: { userId: user.id, deviceToken } },
      create: {
        userId: user.id,
        deviceToken,
        isVerified: true,
        verifiedAt: new Date(),
        userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
        lastIp: c.req.header("x-forwarded-for")?.split(",")[0]?.trim()?.slice(0, 45) || null,
        clientKind,
        label: clientKind === "mobile" ? "휴대폰" : "PC"
      },
      update: {
        isVerified: true,
        verifiedAt: new Date(),
        clientKind
      }
    });
    return issueLoginOk(user, loginId, first.deviceToken, c);
  }

  /** 시드 테스트 계정은 QA용으로 신규 기기도 즉시 승인 */
  if (isVlueSeedTestHandle(loginId)) {
    const approved = await prisma.userDevice.upsert({
      where: { userId_deviceToken: { userId: user.id, deviceToken } },
      create: {
        userId: user.id,
        deviceToken,
        isVerified: true,
        verifiedAt: new Date(),
        userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
        lastIp: c.req.header("x-forwarded-for")?.split(",")[0]?.trim()?.slice(0, 45) || null,
        clientKind,
        label: clientKind === "mobile" ? "휴대폰 (테스트)" : "PC (테스트)"
      },
      update: {
        isVerified: true,
        verifiedAt: new Date(),
        userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
        clientKind
      }
    });
    return issueLoginOk(user, loginId, approved.deviceToken, c);
  }

  const pending = await prisma.userDevice.upsert({
    where: { userId_deviceToken: { userId: user.id, deviceToken } },
    create: {
      userId: user.id,
      deviceToken,
      isVerified: false,
      userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
      lastIp: c.req.header("x-forwarded-for")?.split(",")[0]?.trim()?.slice(0, 45) || null,
      clientKind,
      label: `${clientKind === "mobile" ? "모바일" : "PC"} (승인 대기)`
    },
    update: {
      userAgent: c.req.header("user-agent")?.slice(0, 512) || null,
      clientKind
    }
  });

  return {
    status: "device_pending",
    deviceToken: pending.deviceToken,
    pendingDeviceId: pending.id,
    message:
      "이 PC(기기)는 아직 승인되지 않았습니다. 이미 로그인된 휴대폰·PC에서 [기기 승인]을 완료한 뒤 다시 로그인해 주세요."
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
