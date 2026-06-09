import { prisma } from "../../db/client.js";
import { isRegisteredBusinessMember } from "../membership/businessMemberAccess.js";
import { findStaffLink } from "./businessStaffStore.js";

export type PosBusinessRole = "OWNER" | "STAFF" | null;

export type PosRoleContext = {
  role: PosBusinessRole;
  ownerUserId: string | null;
  canScanPos: boolean;
  canViewDashboard: boolean;
  canModifyLedger: boolean;
  wipeLocalAfterSync: boolean;
};

export async function resolvePosRoleContext(userId: string): Promise<PosRoleContext> {
  const uid = String(userId || "").trim();
  if (!uid) {
    return {
      role: null,
      ownerUserId: null,
      canScanPos: false,
      canViewDashboard: false,
      canModifyLedger: false,
      wipeLocalAfterSync: false
    };
  }

  if (await isRegisteredBusinessMember(uid)) {
    return {
      role: "OWNER",
      ownerUserId: uid,
      canScanPos: true,
      canViewDashboard: true,
      canModifyLedger: true,
      wipeLocalAfterSync: false
    };
  }

  const staffLink = await findStaffLink(uid);
  if (staffLink) {
    return {
      role: "STAFF",
      ownerUserId: staffLink.ownerUserId,
      canScanPos: staffLink.transmitEnabled !== false,
      canViewDashboard: false,
      canModifyLedger: false,
      wipeLocalAfterSync: true
    };
  }

  return {
    role: null,
    ownerUserId: null,
    canScanPos: false,
    canViewDashboard: false,
    canModifyLedger: false,
    wipeLocalAfterSync: false
  };
}

export async function resolveUserDisplayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, publicHandle: true }
  });
  return user?.legalName || user?.publicHandle || "직원";
}

export async function resolveUserIdByHandle(handle: string): Promise<string | null> {
  const h = String(handle || "").trim().replace(/^@+/, "");
  if (!h) return null;
  const user = await prisma.user.findFirst({
    where: { publicHandle: { equals: h, mode: "insensitive" } },
    select: { id: true }
  });
  return user?.id || null;
}
