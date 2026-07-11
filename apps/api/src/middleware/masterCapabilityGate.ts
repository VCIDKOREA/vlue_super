import type { Context, Next } from "hono";
import {
  hasMasterCapability,
  type MasterCapabilityKey,
  type PlatformUserRef
} from "../services/admin/platformAccountRoles.js";

type UserBag =
  | "hqUser"
  | "adminConsoleUser";

/**
 * HQ / Admin Console 컨텍스트의 사용자가 마스터 전용 기능을 쓸 수 있는지 검사.
 * requireSuperAdminBearer 또는 requireAdminConsoleBearer 이후에 체이닝.
 */
export function requireMasterCapability(capability: MasterCapabilityKey, userBag: UserBag = "hqUser") {
  return async (c: Context, next: Next) => {
    const user = c.get(userBag) as PlatformUserRef | undefined;
    if (!hasMasterCapability(user, capability)) {
      return c.json(
        {
          error: "마스터 관리자(admin) 전용 권한입니다.",
          code: "MASTER_CAPABILITY_REQUIRED",
          capability
        },
        403
      );
    }
    return next();
  };
}
