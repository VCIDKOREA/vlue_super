import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { resolveUserPolicy, type UserPolicyTier } from "./userPolicyManager.js";

export type BadgePolicyResult = {
  active: boolean;
  tier: UserPolicyTier | null;
  userId: string | null;
  phoneE164: string | null;
};

async function resolveForUserRow(
  user: { id: string; phoneE164: string | null; status: string } | null
): Promise<BadgePolicyResult> {
  if (!user || user.status !== "ACTIVE" || !user.phoneE164) {
    return { active: false, tier: null, userId: user?.id || null, phoneE164: user?.phoneE164 || null };
  }
  const policy = await resolveUserPolicy(user.id);
  return {
    active: policy.cyanBadgeActive,
    tier: policy.tier,
    userId: user.id,
    phoneE164: user.phoneE164
  };
}

/**
 * 시안블루 인증마크의 유일한 판정 진입점.
 * 공공데이터·본인인증 is_verified는 사용하지 않고 VLUE DB 전화번호의 현재 구독/가족 상태만 본다.
 */
export async function resolveBadgePolicyByPhone(phoneRaw: string): Promise<BadgePolicyResult> {
  const phoneE164 = normalizeToE164KR(phoneRaw);
  if (!phoneE164) return { active: false, tier: null, userId: null, phoneE164: null };
  const user = await prisma.user.findUnique({
    where: { phoneE164 },
    select: { id: true, phoneE164: true, status: true }
  });
  return resolveForUserRow(user);
}

export async function resolveBadgePolicyByUserId(userId: string): Promise<BadgePolicyResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phoneE164: true, status: true }
  });
  return resolveForUserRow(user);
}

export async function hasOfficialCyanBadge(userId: string): Promise<boolean> {
  return (await resolveBadgePolicyByUserId(userId)).active;
}
