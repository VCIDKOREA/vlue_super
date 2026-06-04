import { prisma } from "../../db/client.js";
import type { VluerGrade } from "./vluerGradeTypes.js";

/** @deprecated 3-2-1 활동 티어 폐기 — vluerGrade(일반/인증/파트너/공식) 사용 */

export async function ensureSignupVluerProfile(userId: string) {
  return prisma.userVluerProfile.upsert({
    where: { userId },
    create: {
      userId,
      vluerGrade: "general",
      tierCode: "general",
      activityTier: null,
      canActAsVluer: true,
      isEligibleForVluerSettlement: true
    },
    update: {
      vluerGrade: "general",
      tierCode: "general",
      activityTier: null
    }
  });
}

/** 하위 호환 — activity-tier/upgrade 대신 /vluer/upgrade 사용 */
export async function upgradeVluerActivityTier(
  userId: string,
  _target: number,
  _opts?: { stayOnTier3?: boolean }
) {
  const profile = await prisma.userVluerProfile.findUnique({ where: { userId } });
  const grade = (profile?.vluerGrade || "general") as VluerGrade;
  return {
    upgraded: false,
    deprecated: true,
    message: "활동 티어(3-2-1)는 종료되었습니다. 마이페이지「VLUER 업그레이드」를 이용해 주세요.",
    vluerGrade: grade
  };
}
