import type { User } from "@prisma/client";
import {
  denyAdminAccessReasonForUser,
  isMasterSystemAdmin,
  isPlatformCeoHandle,
  masterAdminHandles
} from "./platformAccountRoles.js";

/**
 * HQ SUPER_ADMIN / 통합 시스템 관제 권한.
 * - 고정 마스터 계정 `admin` (role=admin)
 * - 또는 SUPER_ADMIN_HANDLES / ADMIN_MASTER_PHONE_E164
 * - 대표 개인 `ceo` 는 제외
 */
export function isSuperAdminUser(user: Pick<User, "role" | "publicHandle" | "phoneE164">): boolean {
  if (isPlatformCeoHandle(user.publicHandle)) return false;

  if (isMasterSystemAdmin(user)) return true;

  /* 레거시: role=admin 이지만 핸들이 화이트리스트에 있는 경우만 (기본 admin) */
  if (user.role === "admin" && masterAdminHandles().includes(
    String(user.publicHandle || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "")
  )) {
    return true;
  }

  const masterPhone = String(process.env.ADMIN_MASTER_PHONE_E164 || "").trim();
  if (masterPhone && user.phoneE164 === masterPhone && !isPlatformCeoHandle(user.publicHandle)) {
    return true;
  }

  return false;
}

export { denyAdminAccessReasonForUser };
