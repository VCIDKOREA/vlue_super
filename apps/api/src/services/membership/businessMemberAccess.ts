import { prisma } from "../../db/client.js";

/** 사업자 등록·승인(active) 사용자만 POS 매출/장부 기능 허용 */
export async function isRegisteredBusinessMember(userId: string): Promise<boolean> {
  const uid = String(userId || "").trim();
  if (!uid) return false;
  const profile = await prisma.userBusinessProfile.findUnique({
    where: { userId: uid },
    select: {
      isBusiness: true,
      businessRegistrationNo: true,
      user: { select: { accountStatus: true } }
    }
  });
  if (!profile?.isBusiness) return false;
  if (profile.user.accountStatus !== "active") return false;
  const reg = String(profile.businessRegistrationNo || "").replace(/\D/g, "");
  return reg.length === 10;
}
