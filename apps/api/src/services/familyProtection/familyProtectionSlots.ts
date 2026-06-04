import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { canRegisterFamilyMembers } from "./familyProtectionPaidGate.js";

/** 본인(보호자) 1 + 가족 3 = 1:3 · 총 4명 */
export const FAMILY_BASE_MAX_MEMBERS = 4;
/** 추가 인원 패키지(추가 요금) 시 최대 8명 (유료 2계정×4명 마케팅 정합) */
export const FAMILY_EXTENDED_MAX_MEMBERS = 8;

export type FamilyProtectionSlotSnapshot = {
  guardianCount: number;
  wardCount: number;
  memberCount: number;
  baseMaxMembers: number;
  extendedMaxMembers: number;
  maxMembers: number;
  extraMemberPackActive: boolean;
  canInvite: boolean;
  isAtBaseLimit: boolean;
  needsExtension: boolean;
  isAtExtendedLimit: boolean;
  blockReason: string | null;
  blockCode: string | null;
  isPaid: boolean;
};

async function countGuardianWards(guardianUserId: string): Promise<number> {
  return familyProtectionDb.familyProtectionLink.count({
    where: {
      guardianUserId,
      status: { in: ["pending", "active"] }
    }
  });
}

async function hasExtraMemberPack(guardianUserId: string): Promise<boolean> {
  try {
    const row = await familyProtectionDb.familyProtectionSettings.findUnique({
      where: { userId: guardianUserId },
      select: { extraMemberPackActive: true }
    });
    return Boolean(row?.extraMemberPackActive);
  } catch {
    return false;
  }
}

/** 가족 보호 인원 현황 (보호자 기준) */
export async function getFamilyProtectionSlots(guardianUserId: string): Promise<FamilyProtectionSlotSnapshot> {
  const paid = await canRegisterFamilyMembers(guardianUserId);
  const wardCount = await countGuardianWards(guardianUserId);
  const guardianCount = 1;
  const memberCount = guardianCount + wardCount;
  const extraMemberPackActive = paid.ok ? await hasExtraMemberPack(guardianUserId) : false;
  const maxMembers = extraMemberPackActive ? FAMILY_EXTENDED_MAX_MEMBERS : FAMILY_BASE_MAX_MEMBERS;

  if (!paid.ok) {
    return {
      guardianCount,
      wardCount,
      memberCount,
      baseMaxMembers: FAMILY_BASE_MAX_MEMBERS,
      extendedMaxMembers: FAMILY_EXTENDED_MAX_MEMBERS,
      maxMembers: 0,
      extraMemberPackActive: false,
      canInvite: false,
      isAtBaseLimit: false,
      needsExtension: false,
      isAtExtendedLimit: false,
      blockReason: "일반 회원은 가족 보호 초대를 이용할 수 없습니다. (0명)",
      blockCode: "FAMILY_FREE_TIER",
      isPaid: false
    };
  }

  const isAtBaseLimit = memberCount >= FAMILY_BASE_MAX_MEMBERS;
  const isAtExtendedLimit = memberCount >= FAMILY_EXTENDED_MAX_MEMBERS;
  const needsExtension = isAtBaseLimit && !extraMemberPackActive && memberCount < FAMILY_EXTENDED_MAX_MEMBERS;

  let canInvite = memberCount < maxMembers;
  let blockReason: string | null = null;
  let blockCode: string | null = null;

  if (isAtExtendedLimit) {
    canInvite = false;
    blockReason = `가족 보호 인원이 최대(${FAMILY_EXTENDED_MAX_MEMBERS}명)에 도달했습니다.`;
    blockCode = "FAMILY_SLOT_MAX";
  } else if (needsExtension) {
    canInvite = false;
    blockReason =
      "가족 보호 인원 한도(4명)를 초과했습니다. 추가 요금 결제가 필요합니다.";
    blockCode = "FAMILY_SLOT_NEEDS_EXTENSION";
  } else if (!canInvite && isAtBaseLimit) {
    blockReason =
      "가족 보호 인원 한도(4명)를 초과했습니다. 추가 요금 결제가 필요합니다.";
    blockCode = "FAMILY_SLOT_LIMIT";
  }

  return {
    guardianCount,
    wardCount,
    memberCount,
    baseMaxMembers: FAMILY_BASE_MAX_MEMBERS,
    extendedMaxMembers: FAMILY_EXTENDED_MAX_MEMBERS,
    maxMembers,
    extraMemberPackActive,
    canInvite,
    isAtBaseLimit,
    needsExtension,
    isAtExtendedLimit,
    blockReason,
    blockCode,
    isPaid: true
  };
}

/** 초대 1건 추가 시 슬롯 여유 확인 (기존 동일 가족 재초대는 슬롯 미소모) */
export async function assertCanInviteFamilyMember(
  guardianUserId: string,
  wardUserId: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const existing = await familyProtectionDb.familyProtectionLink.findUnique({
    where: {
      guardianUserId_wardUserId: { guardianUserId, wardUserId }
    },
    select: { status: true }
  });
  if (existing && existing.status !== "revoked") {
    return { ok: true };
  }

  const slots = await getFamilyProtectionSlots(guardianUserId);
  if (slots.canInvite) return { ok: true };

  return {
    ok: false,
    error: slots.blockReason || "가족 초대가 제한되었습니다.",
    code: slots.blockCode || "FAMILY_SLOT_LIMIT"
  };
}
