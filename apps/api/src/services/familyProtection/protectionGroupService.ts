import type { FamilyAccountRole, GroupMemberType } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { pushFamilyProtectionFcmToGuardians } from "./familyProtectionFcmPush.js";

const memberUserSelect = {
  id: true,
  publicHandle: true,
  legalName: true,
  nickFeed: true,
  familyRole: true
} as const;

type MemberUser = {
  id: string;
  publicHandle: string | null;
  legalName: string | null;
  nickFeed: string | null;
  familyRole: FamilyAccountRole;
};

function displayName(user: MemberUser | null | undefined): string {
  if (!user) return "회원";
  return user.legalName || user.nickFeed || user.publicHandle || "회원";
}

export type ProtectionSlotInfo = {
  maxMembers: number;
  extraSlots: number;
  /** maxMembers + extraSlots. 그룹장 본인 포함. */
  capacity: number;
  used: number;
  remaining: number;
};

export function protectionSlotInfo(
  group: { maxMembers: number; extraSlots: number },
  memberRows: number,
  ownerAlreadyCounted: boolean
): ProtectionSlotInfo {
  const maxMembers = group.maxMembers;
  const extraSlots = group.extraSlots;
  const capacity = maxMembers + extraSlots;
  const used = memberRows + (ownerAlreadyCounted ? 0 : 1);
  return {
    maxMembers,
    extraSlots,
    capacity,
    used,
    remaining: Math.max(0, capacity - used)
  };
}

function toMemberView(row: {
  id: string;
  userId: string;
  memberType: GroupMemberType;
  isLocationSharing: boolean;
  user: MemberUser;
}) {
  return {
    id: row.id,
    userId: row.userId,
    name: displayName(row.user),
    publicHandle: row.user.publicHandle,
    role: row.user.familyRole,
    memberType: row.memberType,
    isLocationSharing: row.isLocationSharing
  };
}

/** 내가 그룹장인 보호 그룹. 없으면 null. 슬롯은 maxMembers + extraSlots. */
export async function getMyOwnedGroup(ownerId: string) {
  const group = await prisma.protectionGroup.findUnique({
    where: { ownerId },
    include: {
      members: {
        include: { user: { select: memberUserSelect } },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!group) return null;

  const ownerInMembers = group.members.some((member) => member.userId === ownerId);
  return {
    id: group.id,
    ownerId: group.ownerId,
    inviteCode: group.inviteCode,
    slots: protectionSlotInfo(group, group.members.length, ownerInMembers),
    members: group.members.map(toMemberView)
  };
}

/** 나를 케어하는 그룹. 보호 대상(OWNED_MEMBER)으로 들어간 그룹. 내가 그룹장인 그룹은 제외. */
export async function getJoinedGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
      memberType: "OWNED_MEMBER",
      group: { ownerId: { not: userId } }
    },
    include: {
      group: {
        include: {
          owner: { select: memberUserSelect },
          members: {
            include: { user: { select: memberUserSelect } },
            orderBy: { createdAt: "asc" }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return memberships.map((membership) => {
    const ownerInMembers = membership.group.members.some(
      (member) => member.userId === membership.group.ownerId
    );
    return {
      id: membership.group.id,
      ownerId: membership.group.ownerId,
      ownerName: displayName(membership.group.owner),
      inviteCode: membership.group.inviteCode,
      myMembership: {
        id: membership.id,
        memberType: membership.memberType,
        isLocationSharing: membership.isLocationSharing
      },
      slots: protectionSlotInfo(
        membership.group,
        membership.group.members.length,
        ownerInMembers
      ),
      members: membership.group.members.map(toMemberView)
    };
  });
}

/** 보호 대상 탭 — 내 위치 공유 토글. 내가 멤버인 그룹에만 반영. */
export async function setJoinedLocationSharing(userId: string, enabled: boolean) {
  const rows = await prisma.groupMember.findMany({
    where: {
      userId,
      memberType: "OWNED_MEMBER",
      group: { ownerId: { not: userId } }
    },
    select: { id: true }
  });
  const result = await prisma.groupMember.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { isLocationSharing: enabled }
  });
  return { ok: true, updated: result.count, isLocationSharing: enabled };
}

/** 슬롯 추가. 1명당 월 2,500원 결제 확인 후 extraSlots를 늘린다. */
export async function purchaseExtraSlots(ownerId: string, count: number) {
  const add = Math.min(20, Math.max(1, Math.floor(Number(count) || 1)));
  const group = await prisma.protectionGroup.findUnique({ where: { ownerId } });
  if (!group) {
    return { error: "보호 그룹이 없습니다. 가족보호에서 초대 코드를 먼저 만들어 주세요.", code: "NO_GROUP" as const };
  }
  const updated = await prisma.protectionGroup.update({
    where: { id: group.id },
    data: { extraSlots: { increment: add } }
  });
  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  return {
    ok: true,
    added: add,
    monthlyKrw: add * 2500,
    slots: protectionSlotInfo(updated, memberCount, false)
  };
}

/** One-Tap SOS — 나를 보호하는 그룹장에게 알림. */
export async function sendProtectionSos(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: {
      userId,
      memberType: "OWNED_MEMBER",
      group: { ownerId: { not: userId } }
    },
    select: { group: { select: { ownerId: true } } }
  });
  const ownerIds = [...new Set(memberships.map((row) => row.group.ownerId))];
  if (!ownerIds.length) {
    return { ok: false, error: "나를 보호하는 가족이 없습니다.", code: "NO_GUARDIAN" as const };
  }
  const title = "[긴급] VLUÉ SOS";
  const body = "보호 대상이 응급 호출을 보냈습니다. 위치를 확인해 주세요.";
  await prisma.ownerNotification.createMany({
    data: ownerIds.map((ownerUserId) => ({
      ownerUserId,
      actorUserId: userId,
      title,
      body
    }))
  });
  void pushFamilyProtectionFcmToGuardians(ownerIds, title, body, { kind: "sos", wardUserId: userId });
  return { ok: true, notified: ownerIds.length };
}
