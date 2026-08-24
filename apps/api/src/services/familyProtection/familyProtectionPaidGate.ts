import { prisma } from "../../db/client.js";
import { isPlatformCeoHandle } from "../admin/platformAccountRoles.js";

const PAID_TIERS = new Set(["paid", "standard", "premium", "b2b"]);

/** 유료(스탠다드/프리미엄 명함 또는 활성 B2C 구독) 회원만 가족 초대 가능 */
export async function canRegisterFamilyMembers(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      publicHandle: true,
      digitalCard: { select: { membershipTierSnapshot: true } },
      subscriptions: {
        where: { status: "active", cycleEndAt: { gt: new Date() } },
        select: { id: true },
        take: 1
      }
    }
  });
  if (!user) {
    return {
      ok: false,
      reason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명) 유료 멤버십 전환 후 이용해 주세요."
    };
  }
  if (isPlatformCeoHandle(user.publicHandle)) return { ok: true };
  const snap = user.digitalCard?.membershipTierSnapshot;
  if (snap && PAID_TIERS.has(String(snap))) return { ok: true };
  if (user.subscriptions.length > 0) return { ok: true };

  return {
    ok: false,
    reason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명) 유료 멤버십 전환 후 이용해 주세요."
  };
}
