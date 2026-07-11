import type { User } from "@prisma/client";
import { denyAdminAccessReasonForUser, isMasterSystemAdmin } from "./platformAccountRoles.js";
import { isSuperAdminUser } from "./superAdminAuth.js";

/** JWT 관리자 콘솔(`/api/admin/console/*`) 접근 가능 여부 */
export function isAdminConsoleUser(
  user: Pick<User, "role" | "publicHandle" | "phoneE164" | "accountStatus" | "status">
): boolean {
  if (user.status === "DELETED") return false;
  if (user.accountStatus === "suspended") return false;
  if (denyAdminAccessReasonForUser(user)) return false;
  /* 콘솔: role=admin 마스터만 (ceo 차단). SUPER_ADMIN 핸들도 허용 */
  return user.role === "admin" || isSuperAdminUser(user);
}

export function resolveAdminConsoleRole(
  user: Pick<User, "role" | "publicHandle" | "phoneE164">
): "SUPER_ADMIN" | "ADMIN" {
  if (isMasterSystemAdmin(user) || isSuperAdminUser(user)) return "SUPER_ADMIN";
  return "ADMIN";
}
