import type { EnterpriseRole } from "@prisma/client";

export const LINE_ASSIGNABLE_ROLES: EnterpriseRole[] = ["STAFF", "BUYER", "MANAGER"];

export function normalizeCartLineRole(raw?: string | null): EnterpriseRole {
  const r = String(raw || "STAFF").toUpperCase();
  if (r === "BUYER" || r === "MANAGER") return r;
  return "STAFF";
}

/** 경리·대리인은 기업당 1명 — 새 지정 시 기존 동일 역할을 STAFF로 */
export async function enforceUniqueLineRoles(
  enterpriseId: string,
  lineId: string | null,
  role: EnterpriseRole
) {
  if (role !== "BUYER" && role !== "MANAGER") return;
  const { prisma } = await import("../../db/client.js");
  const demoteWhere = {
    enterpriseId,
    enterpriseRole: role,
    ...(lineId ? { id: { not: lineId } } : {})
  };
  const toDemote = await prisma.b2BCartLine.findMany({
    where: demoteWhere,
    select: { linkedUserId: true }
  });
  await prisma.b2BCartLine.updateMany({
    where: demoteWhere,
    data: { enterpriseRole: "STAFF" }
  });
  for (const row of toDemote) {
    if (row.linkedUserId) {
      await prisma.user.update({
        where: { id: row.linkedUserId },
        data: { enterpriseRole: "STAFF" }
      });
    }
  }
}

export function roleLabelKo(role: EnterpriseRole | string) {
  switch (role) {
    case "MASTER":
      return "대표";
    case "MANAGER":
      return "대리인";
    case "BUYER":
      return "경리·구매";
    default:
      return "일반 직원";
  }
}
