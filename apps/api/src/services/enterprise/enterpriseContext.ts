import type { EnterpriseRole, LineType } from "@prisma/client";
import { prisma } from "../../db/client.js";

export type EnterpriseUserContext = {
  userId: string;
  lineType: LineType;
  enterpriseRole: EnterpriseRole;
  enterpriseGroupId: string | null;
  enterpriseDept: string | null;
  enterpriseId: string | null;
  companyName: string | null;
};

export const ENTERPRISE_PURCHASE_ROLES: EnterpriseRole[] = ["MASTER", "MANAGER", "BUYER"];

export function canEnterprisePurchase(role: EnterpriseRole): boolean {
  return ENTERPRISE_PURCHASE_ROLES.includes(role);
}

export function isEnterpriseStaff(role: EnterpriseRole): boolean {
  return role === "STAFF";
}

export async function loadEnterpriseUserContext(userId: string): Promise<EnterpriseUserContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      lineType: true,
      enterpriseRole: true,
      enterpriseGroupId: true,
      enterpriseDept: true
    }
  });
  if (!user) return null;

  let enterpriseId: string | null = null;
  let companyName: string | null = null;

  if (user.enterpriseRole === "MASTER") {
    const ent = await prisma.b2BEnterpriseAccount.findFirst({
      where: { adminUserId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true }
    });
    enterpriseId = ent?.id ?? null;
    companyName = ent?.companyName ?? null;
  } else if (user.enterpriseGroupId) {
    const ent = await prisma.b2BEnterpriseAccount.findFirst({
      where: { adminUserId: user.enterpriseGroupId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true }
    });
    enterpriseId = ent?.id ?? null;
    companyName = ent?.companyName ?? null;
  }

  return {
    userId: user.id,
    lineType: user.lineType,
    enterpriseRole: user.enterpriseRole,
    enterpriseGroupId: user.enterpriseGroupId,
    enterpriseDept: user.enterpriseDept,
    enterpriseId,
    companyName
  };
}

export async function requireEnterpriseContext(userId: string) {
  const ctx = await loadEnterpriseUserContext(userId);
  if (!ctx || ctx.enterpriseRole === "NONE" || !ctx.enterpriseGroupId) {
    throw new Error("기업 단체 소속 계정이 아닙니다.");
  }
  return ctx;
}
