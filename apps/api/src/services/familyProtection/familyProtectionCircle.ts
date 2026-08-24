import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";

export function relationDisplayLabel(relation: string | null | undefined): string {
  if (relation === "child") return "자녀";
  if (relation === "relative") return "가족";
  return "부모(노부모)";
}

export function isProtectionActiveRole(wardRole: string | null | undefined): boolean {
  return wardRole === "elder" || wardRole === "child";
}

type UserPick = {
  id: string;
  publicHandle: string | null;
  legalName: string | null;
  nickFeed: string | null;
};

function displayName(u: UserPick | null | undefined): string {
  if (!u) return "회원";
  return u.legalName || u.nickFeed || u.publicHandle || "회원";
}

/** 보호 이벤트 알림 — 같은 보호자 네트워크의 다른 구성원(가족·노부모·자녀) 포함 */
export async function expandFamilyAlertRecipients(
  guardianUserIds: string[],
  wardUserId: string
): Promise<string[]> {
  const recipients = new Set(guardianUserIds.filter(Boolean));
  for (const gid of guardianUserIds) {
    const members = await familyProtectionDb.familyProtectionLink.findMany({
      where: {
        guardianUserId: gid,
        status: "active",
        wardUserId: { not: wardUserId }
      },
      select: { wardUserId: true }
    });
    for (const m of members) recipients.add(String(m.wardUserId));
  }
  return [...recipients];
}

/** 구성원 확인 — 내가 속한 보호자 네트워크별 멤버 목록 */
export async function getFamilyCircleOverview(userId: string) {
  const asWardLinks = await familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId: userId, status: { in: ["pending", "active"] } },
    include: {
      guardianUser: { select: { id: true, publicHandle: true, legalName: true, nickFeed: true } }
    }
  });

  const asGuardianLinks = await familyProtectionDb.familyProtectionLink.findMany({
    where: { guardianUserId: userId, status: { in: ["pending", "active"] } },
    include: {
      wardUser: { select: { id: true, publicHandle: true, legalName: true, nickFeed: true } }
    }
  });

  const guardianIds = new Set<string>();
  for (const l of asWardLinks) guardianIds.add(String(l.guardianUserId));
  if (asGuardianLinks.length) guardianIds.add(userId);

  const networks: Array<{
    guardianUserId: string;
    guardianName: string;
    myRelation: string | null;
    myRole: string | null;
    myStatus: string | null;
    members: Array<{
      userId: string;
      name: string;
      publicHandle: string | null;
      familyRelation: string;
      wardRole: string;
      status: string;
      protectionActive: boolean;
      isMe: boolean;
    }>;
  }> = [];

  for (const gid of guardianIds) {
    const guardian =
      gid === userId
        ? await prisma.user.findUnique({
            where: { id: gid },
            select: { id: true, publicHandle: true, legalName: true, nickFeed: true }
          })
        : asWardLinks.find((l) => String(l.guardianUserId) === gid)?.guardianUser;

    const links = await familyProtectionDb.familyProtectionLink.findMany({
      where: { guardianUserId: gid, status: { in: ["pending", "active"] } },
      include: {
        wardUser: { select: { id: true, publicHandle: true, legalName: true, nickFeed: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const myWardLink = links.find((l) => String(l.wardUserId) === userId);
    const members = [
      {
        userId: gid,
        name: displayName(guardian as UserPick),
        publicHandle: guardian?.publicHandle ?? null,
        familyRelation: "guardian",
        wardRole: "guardian",
        status: "active",
        protectionActive: false,
        isMe: gid === userId
      },
      ...links.map((l) => ({
        userId: String(l.wardUserId),
        name: displayName(l.wardUser as UserPick),
        publicHandle: l.wardUser?.publicHandle ?? null,
        familyRelation: String(l.familyRelation),
        wardRole: String(l.wardRole),
        status: String(l.status),
        protectionActive: isProtectionActiveRole(String(l.wardRole)) && l.status === "active",
        isMe: String(l.wardUserId) === userId
      }))
    ];

    networks.push({
      guardianUserId: gid,
      guardianName: displayName(guardian as UserPick),
      myRelation: myWardLink ? String(myWardLink.familyRelation) : gid === userId ? "guardian" : null,
      myRole: myWardLink ? String(myWardLink.wardRole) : gid === userId ? "guardian" : null,
      myStatus: myWardLink ? String(myWardLink.status) : gid === userId ? "active" : null,
      members
    });
  }

  return { networks };
}
