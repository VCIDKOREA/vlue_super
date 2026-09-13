import { prisma } from "../../db/client.js";
import { isPlatformCeoHandle } from "../admin/platformAccountRoles.js";
import { isSelfPaidMember } from "../membership/paidMemberGate.js";

/** 유료(스탠다드/프리미엄 명함·활성 B2C 구독·B2B) 회원만 가족 초대 가능 — isSelfPaidMember 와 동일 기준 */
export async function canRegisterFamilyMembers(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicHandle: true }
  });
  if (!user) {
    return {
      ok: false,
      reason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명) 유료 멤버십 전환 후 이용해 주세요."
    };
  }
  if (isPlatformCeoHandle(user.publicHandle)) return { ok: true };

  const paid = await isSelfPaidMember(userId);
  if (paid.ok) return { ok: true };

  return {
    ok: false,
    reason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명) 유료 멤버십 전환 후 이용해 주세요."
  };
}
