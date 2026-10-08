import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { prisma } from "../../db/client.js";
import { issueTokenPair } from "../authSessions.js";
import { protectionSlotInfo } from "./protectionGroupService.js";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class ProtectionInviteError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "PROTECTION_INVITE_FAILED") {
    super(message);
    this.name = "ProtectionInviteError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeInviteCode(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function randomInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

function randomHandle(prefix: string): string {
  return `${prefix}${randomBytes(4).toString("hex")}`.slice(0, 20);
}

async function ensureOwnedGroup(ownerId: string) {
  const existing = await prisma.protectionGroup.findUnique({ where: { ownerId } });
  if (existing) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.protectionGroup.create({
        data: {
          ownerId,
          maxMembers: 4,
          extraSlots: 0,
          inviteCode: randomInviteCode()
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("Unique constraint")) throw err;
      const raced = await prisma.protectionGroup.findUnique({ where: { ownerId } });
      if (raced) return raced;
    }
  }
  throw new ProtectionInviteError("초대 코드를 만들지 못했습니다. 다시 시도해 주세요.", 500, "INVITE_CODE_FAILED");
}

async function assertOwnerCanInvite(ownerId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      status: true,
      identityVerified: true,
      familyRole: true,
      legalName: true,
      publicHandle: true
    }
  });
  if (!owner || owner.status === "DELETED") {
    throw new ProtectionInviteError("보호자 계정을 찾을 수 없습니다.", 404, "OWNER_NOT_FOUND");
  }
  if (owner.familyRole === "KIDS") {
    throw new ProtectionInviteError("자녀 계정에서는 초대 코드를 만들 수 없습니다.", 403, "KIDS_CANNOT_INVITE");
  }
  if (!owner.identityVerified) {
    throw new ProtectionInviteError("본인인증 후 초대를 만들 수 있습니다.", 403, "OWNER_NOT_VERIFIED");
  }
  return owner;
}

function slotRemaining(group: { maxMembers: number; extraSlots: number }, memberCount: number) {
  return protectionSlotInfo(group, memberCount, false).remaining;
}

/** 부모 앱 — 법정대리인 동의 후 자녀용 6자리 코드. 그룹이 없으면 만든다. */
export async function issueProtectionInvite(ownerId: string, guardianConsent: boolean) {
  if (!guardianConsent) {
    throw new ProtectionInviteError("법정대리인 동의가 필요합니다.", 400, "GUARDIAN_CONSENT_REQUIRED");
  }
  const owner = await assertOwnerCanInvite(ownerId);
  const group = await ensureOwnedGroup(owner.id);
  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  return {
    inviteCode: group.inviteCode,
    ownerName: owner.legalName || (owner.publicHandle ? `@${owner.publicHandle}` : "보호자"),
    slots: protectionSlotInfo(group, memberCount, false)
  };
}

async function joinOwnedGroup(input: {
  inviteCode: string;
  userId: string;
  wardRole: "child" | "elder";
  familyRelation: "child" | "parent";
}) {
  const code = normalizeInviteCode(input.inviteCode);
  if (code.length !== 6) {
    throw new ProtectionInviteError("6자리 초대 코드를 입력해 주세요.", 400, "INVITE_CODE_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.protectionGroup.findUnique({ where: { inviteCode: code } });
    if (!group) {
      throw new ProtectionInviteError("초대 코드를 찾을 수 없습니다.", 404, "INVITE_NOT_FOUND");
    }
    if (group.ownerId === input.userId) {
      throw new ProtectionInviteError("본인 그룹에는 가입할 수 없습니다.", 400, "INVITE_SELF");
    }

    const already = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: input.userId } }
    });
    const memberCount = await tx.groupMember.count({ where: { groupId: group.id } });
    if (!already && slotRemaining(group, memberCount) < 1) {
      throw new ProtectionInviteError("가족 보호 인원이 가득 찼습니다.", 403, "FAMILY_SLOT_LIMIT");
    }

    const member = already
      ? await tx.groupMember.update({
          where: { id: already.id },
          data: { memberType: "OWNED_MEMBER", isLocationSharing: true }
        })
      : await tx.groupMember.create({
          data: {
            groupId: group.id,
            userId: input.userId,
            memberType: "OWNED_MEMBER",
            isLocationSharing: true
          }
        });

    const now = new Date();
    await tx.familyProtectionLink.upsert({
      where: {
        guardianUserId_wardUserId: { guardianUserId: group.ownerId, wardUserId: input.userId }
      },
      create: {
        guardianUserId: group.ownerId,
        wardUserId: input.userId,
        wardRole: input.wardRole,
        familyRelation: input.familyRelation,
        status: "active",
        wardAcceptedAt: now
      },
      update: {
        wardRole: input.wardRole,
        familyRelation: input.familyRelation,
        status: "active",
        wardAcceptedAt: now
      }
    });

    return { group, member };
  });
}

/** 만 14세 미만 — PASS 없이 초대 코드로 자녀 계정 생성 후 부모 그룹에 등록. */
export async function redeemKidsInvite(
  input: { inviteCode: string; nickname: string },
  req: { header: (name: string) => string | undefined }
) {
  const nickname = String(input.nickname || "").trim().slice(0, 20);
  if (nickname.length < 1) {
    throw new ProtectionInviteError("닉네임을 입력해 주세요.", 400, "KIDS_NAME_REQUIRED");
  }
  const code = normalizeInviteCode(input.inviteCode);
  const preview = await prisma.protectionGroup.findUnique({
    where: { inviteCode: code },
    select: { ownerId: true }
  });
  if (!preview) {
    throw new ProtectionInviteError("초대 코드를 찾을 수 없습니다.", 404, "INVITE_NOT_FOUND");
  }

  let publicHandle = randomHandle("kid");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await prisma.user.findUnique({ where: { publicHandle }, select: { id: true } });
    if (!taken) break;
    publicHandle = randomHandle("kid");
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      publicHandle,
      nickFeed: nickname,
      familyRole: "KIDS",
      signupMethod: "kids_invite",
      accountStatus: "active",
      status: "ACTIVE",
      identityVerified: false,
      requiresParentalConsent: true,
      parentalConsentAt: now,
      parentalGuardianUserId: preview.ownerId,
      isFirstJoin: true
    },
    select: { id: true, publicHandle: true, familyRole: true, nickFeed: true }
  });

  try {
    await joinOwnedGroup({
      inviteCode: code,
      userId: user.id,
      wardRole: "child",
      familyRelation: "child"
    });
  } catch (err) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    throw err;
  }

  const tokens = await issueTokenPair(user.id, req);
  return {
    ok: true,
    userId: user.id,
    publicHandle: user.publicHandle,
    role: user.familyRole,
    nickname: user.nickFeed,
    ...tokens
  };
}

/** 노년 부모 — 본인인증·약관 동의 후 자녀 그룹에 자동 등록. */
export async function redeemElderInvite(userId: string, inviteCode: string, termsAccepted: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      identityVerified: true,
      familyRole: true,
      termsAcceptedAt: true
    }
  });
  if (!user || user.status === "DELETED") {
    throw new ProtectionInviteError("계정을 찾을 수 없습니다.", 404, "USER_NOT_FOUND");
  }
  if (user.familyRole === "KIDS") {
    throw new ProtectionInviteError("자녀 계정은 이 초대를 사용할 수 없습니다.", 403, "KIDS_ELDER_INVITE");
  }
  if (!user.identityVerified) {
    throw new ProtectionInviteError("본인인증 후 가족 그룹에 연결됩니다.", 403, "IDENTITY_REQUIRED");
  }
  if (!termsAccepted && !user.termsAcceptedAt) {
    throw new ProtectionInviteError("약관 동의가 필요합니다.", 400, "TERMS_REQUIRED");
  }
  if (termsAccepted && !user.termsAcceptedAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: new Date(), termsVersionAccepted: "elder-invite" }
    });
  }

  const joined = await joinOwnedGroup({
    inviteCode,
    userId,
    wardRole: "elder",
    familyRelation: "parent"
  });
  return {
    ok: true,
    groupId: joined.group.id,
    ownerId: joined.group.ownerId,
    inviteCode: joined.group.inviteCode
  };
}
