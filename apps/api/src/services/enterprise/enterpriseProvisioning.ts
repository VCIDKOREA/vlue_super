import { randomBytes } from "node:crypto";
import type { EnterpriseRole } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { hashPassword } from "../../lib/passwordHash.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { normalizeCartLineRole, roleLabelKo } from "./enterpriseRoles.js";

function slugFromPhone(e164: string, idx: number) {
  const digits = e164.replace(/\D/g, "").slice(-8);
  return `line${digits}${idx}`.slice(0, 20);
}

function generateInitialPassword() {
  return `${randomBytes(3).toString("hex")}${randomBytes(2).toString("hex").toUpperCase()}!`;
}

async function ensureUniqueHandle(base: string) {
  let handle = base.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (handle.length < 3) handle = `ent${Date.now().toString(36).slice(-6)}`;
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? handle : `${handle.slice(0, 16)}${i}`;
    const clash = await prisma.user.findFirst({ where: { publicHandle: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  return `ent${randomBytes(4).toString("hex")}`;
}

export type ProvisionedCredential = {
  userId: string;
  publicHandle: string;
  assigneeName: string;
  enterpriseRole: EnterpriseRole;
  lineKind: string;
  phoneE164: string;
  initialPassword: string;
  roleLabel: string;
};

/** B2B 회선 활성화 시 대표·직원 계정 + 초기 로그인 안내 */
export async function provisionEnterpriseAccounts(enterpriseId: string, adminUserId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    include: { cartLines: { orderBy: { sortOrder: "asc" } } }
  });
  if (!ent) throw new Error("기업 계정 없음");

  await prisma.user.update({
    where: { id: adminUserId },
    data: {
      enterpriseRole: "MASTER",
      enterpriseGroupId: adminUserId,
      lineType: "MOBILE",
      enterpriseDept: "대표"
    }
  });

  const credentials: ProvisionedCredential[] = [];
  let idx = 0;

  for (const line of ent.cartLines) {
    idx += 1;
    const e164 = line.realCliPhoneE164;
    const lineType = line.lineKind === "mobile" ? "MOBILE" : "WIRED";
    const enterpriseRole = normalizeCartLineRole(line.enterpriseRole);

    let user = await prisma.user.findFirst({
      where: { phoneE164: e164 },
      select: { id: true, publicHandle: true }
    });

    const initialPassword = generateInitialPassword();
    const passwordHash = await hashPassword(initialPassword);

    if (!user) {
      const handle = await ensureUniqueHandle(slugFromPhone(e164, idx));
      user = await prisma.user.create({
        data: {
          phoneE164: e164,
          publicHandle: handle,
          legalName: line.assigneeName.trim(),
          passwordHash,
          accountStatus: "active",
          identityVerified: false,
          lineType,
          enterpriseRole,
          enterpriseGroupId: adminUserId,
          enterpriseDept: line.assigneeTitle?.trim() || null
        },
        select: { id: true, publicHandle: true }
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lineType,
          enterpriseRole,
          enterpriseGroupId: adminUserId,
          enterpriseDept: line.assigneeTitle?.trim() || undefined,
          ...(user.publicHandle ? {} : { publicHandle: await ensureUniqueHandle(slugFromPhone(e164, idx)) })
        }
      });
      const refreshed = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, publicHandle: true }
      });
      user = refreshed!;
    }

    await prisma.b2BCartLine.update({
      where: { id: line.id },
      data: { linkedUserId: user.id }
    });

    await prisma.enterpriseMemberCredential.upsert({
      where: { enterpriseId_userId: { enterpriseId: ent.id, userId: user.id } },
      create: {
        enterpriseId: ent.id,
        userId: user.id,
        publicHandle: user.publicHandle || "",
        assigneeName: line.assigneeName.trim(),
        enterpriseRole,
        lineKind: line.lineKind,
        phoneE164: e164,
        initialPassword
      },
      update: {
        assigneeName: line.assigneeName.trim(),
        enterpriseRole,
        publicHandle: user.publicHandle || "",
        initialPassword
      }
    });

    credentials.push({
      userId: user.id,
      publicHandle: user.publicHandle || "",
      assigneeName: line.assigneeName.trim(),
      enterpriseRole,
      lineKind: line.lineKind,
      phoneE164: e164,
      initialPassword,
      roleLabel: roleLabelKo(enterpriseRole)
    });
  }

  const { ensureEnterpriseGroupChatIfReady } = await import("./enterpriseGroupChatBootstrap.js");
  await ensureEnterpriseGroupChatIfReady(ent.id);

  return { enterpriseId: ent.id, lineAccounts: ent.cartLines.length, credentials };
}

export async function provisionEnterpriseMasterOnSignup(adminUserId: string, enterpriseId: string) {
  await prisma.user.update({
    where: { id: adminUserId },
    data: {
      enterpriseRole: "MASTER",
      enterpriseGroupId: adminUserId,
      lineType: "MOBILE",
      enterpriseDept: "대표"
    }
  });
}

export async function listMemberCredentialsForMaster(viewerUserId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { enterpriseRole: true, id: true, enterpriseGroupId: true }
  });
  if (!viewer || (viewer.enterpriseRole !== "MASTER" && viewer.enterpriseRole !== "MANAGER")) {
    throw new Error("직원 로그인 안내는 대표·대리인만 볼 수 있습니다.");
  }

  const masterId = viewer.enterpriseRole === "MASTER" ? viewer.id : viewer.enterpriseGroupId;
  if (!masterId) throw new Error("기업 정보 없음");

  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: masterId },
    orderBy: { updatedAt: "desc" }
  });
  if (!ent) return [];

  return prisma.enterpriseMemberCredential.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { createdAt: "asc" }
  });
}

export async function assignEnterpriseMemberRole(
  masterUserId: string,
  targetUserId: string,
  role: "MANAGER" | "BUYER" | "STAFF"
) {
  const master = await prisma.user.findUnique({
    where: { id: masterUserId },
    select: { enterpriseRole: true, id: true }
  });
  if (!master || (master.enterpriseRole !== "MASTER" && master.enterpriseRole !== "MANAGER")) {
    throw new Error("역할 지정 권한이 없습니다.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { enterpriseGroupId: true, enterpriseRole: true }
  });
  if (!target || (target.enterpriseGroupId !== masterUserId && target.enterpriseGroupId !== master.id)) {
    throw new Error("같은 기업 소속 직원만 지정할 수 있습니다.");
  }
  if (targetUserId === masterUserId) {
    throw new Error("대표 계정 역할은 변경할 수 없습니다.");
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { enterpriseRole: role }
  });
}

export async function resolveEnterpriseByPhone(phoneRaw: string) {
  const e164 = normalizeToE164KR(phoneRaw);
  if (!e164) return null;
  return prisma.user.findFirst({
    where: { phoneE164: e164 },
    select: {
      id: true,
      publicHandle: true,
      legalName: true,
      lineType: true,
      enterpriseRole: true,
      enterpriseGroupId: true,
      enterpriseDept: true
    }
  });
}
