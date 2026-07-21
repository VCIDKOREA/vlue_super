import type { UserFollowStatus } from "@prisma/client";
import { prisma } from "../../db/client.js";
import {
  maskProfileForViewer,
  privacySelect,
  type MaskableProfile,
  type UserPrivacyRow,
  type ViewerAccessContext
} from "./profileAccessControl.js";

export type FollowRelation =
  | "none"
  | "following"
  | "followed_by"
  | "mutual"
  | "pending_out"
  | "pending_in";

export type FollowStatePayload = {
  relation: FollowRelation;
  /** UI 라벨 — 맞팔로우 / 팔로잉 / 팔로우 / 요청중 등 */
  label: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isMutual: boolean;
  isPendingOut: boolean;
  isPendingIn: boolean;
  followId: string | null;
  incomingFollowId: string | null;
  counts: {
    followers: number;
    following: number;
  };
  target: {
    userId: string;
    isPrivateFollow: boolean;
  };
};

const ACTIVE: UserFollowStatus = "active";
const PENDING: UserFollowStatus = "pending";

function relationLabel(relation: FollowRelation): string {
  switch (relation) {
    case "mutual":
      return "맞팔로우";
    case "following":
      return "팔로잉";
    case "pending_out":
      return "요청중";
    case "pending_in":
      return "요청 받음";
    case "followed_by":
      return "팔로우";
    default:
      return "팔로우";
  }
}

async function isBlocked(a: string, b: string): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a }
      ]
    },
    select: { blockerId: true }
  });
  return Boolean(row);
}

async function getActiveFollowRow(followerId: string, followingId: string) {
  return prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId, followingId } }
  });
}

export async function getFollowCounts(userId: string) {
  try {
    const [followers, following] = await Promise.all([
      prisma.userFollow.count({ where: { followingId: userId, status: ACTIVE } }),
      prisma.userFollow.count({ where: { followerId: userId, status: ACTIVE } })
    ]);
    return { followers, following };
  } catch (e) {
    /* 마이그레이션 전 로컬 DB 등 — 카운트만 0으로 폴백 */
    const code = (e as { code?: string })?.code;
    if (code === "P2021" || code === "P2022") {
      return { followers: 0, following: 0 };
    }
    throw e;
  }
}

export async function buildViewerAccessContext(
  viewerId: string | null,
  ownerId: string
): Promise<ViewerAccessContext> {
  const isOwner = Boolean(viewerId && viewerId === ownerId);
  if (!viewerId || isOwner) {
    return {
      viewerId,
      ownerId,
      isOwner,
      isActiveFollower: isOwner,
      isMutualFollow: isOwner
    };
  }

  const [outbound, inbound] = await Promise.all([
    getActiveFollowRow(viewerId, ownerId),
    getActiveFollowRow(ownerId, viewerId)
  ]);

  const isActiveFollower = outbound?.status === ACTIVE;
  const isFollowedBy = inbound?.status === ACTIVE;

  return {
    viewerId,
    ownerId,
    isOwner: false,
    isActiveFollower,
    isMutualFollow: isActiveFollower && isFollowedBy
  };
}

function resolveRelation(
  outbound: { id: string; status: UserFollowStatus } | null,
  inbound: { id: string; status: UserFollowStatus } | null
): FollowRelation {
  const outActive = outbound?.status === ACTIVE;
  const inActive = inbound?.status === ACTIVE;
  const outPending = outbound?.status === PENDING;
  const inPending = inbound?.status === PENDING;

  if (outActive && inActive) return "mutual";
  if (outActive) return "following";
  if (inActive) return "followed_by";
  if (outPending) return "pending_out";
  if (inPending) return "pending_in";
  return "none";
}

export async function getFollowState(viewerId: string | null, targetUserId: string): Promise<FollowStatePayload | null> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isPrivateFollow: true, status: true }
  });
  if (!target || target.status !== "ACTIVE") return null;

  const [outbound, inbound, counts] = await Promise.all([
    viewerId ? getActiveFollowRow(viewerId, targetUserId) : Promise.resolve(null),
    viewerId ? getActiveFollowRow(targetUserId, viewerId) : Promise.resolve(null),
    getFollowCounts(targetUserId)
  ]);

  const relation = resolveRelation(outbound, inbound);

  return {
    relation,
    label: relationLabel(relation),
    isFollowing: relation === "following" || relation === "mutual",
    isFollowedBy: relation === "followed_by" || relation === "mutual",
    isMutual: relation === "mutual",
    isPendingOut: relation === "pending_out",
    isPendingIn: relation === "pending_in",
    followId: outbound?.id ?? null,
    incomingFollowId: inbound?.status === PENDING ? inbound.id : null,
    counts,
    target: {
      userId: target.id,
      isPrivateFollow: Boolean(target.isPrivateFollow)
    }
  };
}

export async function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    return { ok: false as const, error: "self_follow", status: 400 };
  }

  const target = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, isPrivateFollow: true, status: true }
  });
  if (!target || target.status !== "ACTIVE") {
    return { ok: false as const, error: "user_not_found", status: 404 };
  }

  if (await isBlocked(followerId, followingId)) {
    return { ok: false as const, error: "blocked", status: 403 };
  }

  const existing = await getActiveFollowRow(followerId, followingId);

  if (existing) {
    if (existing.status === ACTIVE || existing.status === PENDING) {
      const updated = await prisma.userFollow.update({
        where: { id: existing.id },
        data: { status: "cancelled" }
      });
      const state = await getFollowState(followerId, followingId);
      return {
        ok: true as const,
        action: "unfollowed" as const,
        follow: updated,
        state
      };
    }

    if (existing.status === "rejected" || existing.status === "cancelled") {
      const nextStatus: UserFollowStatus = target.isPrivateFollow ? PENDING : ACTIVE;
      const updated = await prisma.userFollow.update({
        where: { id: existing.id },
        data: { status: nextStatus }
      });
      const state = await getFollowState(followerId, followingId);
      return {
        ok: true as const,
        action: nextStatus === ACTIVE ? ("followed" as const) : ("requested" as const),
        follow: updated,
        state
      };
    }
  }

  const nextStatus: UserFollowStatus = target.isPrivateFollow ? PENDING : ACTIVE;
  const created = await prisma.userFollow.create({
    data: {
      followerId,
      followingId,
      status: nextStatus
    }
  });
  const state = await getFollowState(followerId, followingId);
  return {
    ok: true as const,
    action: nextStatus === ACTIVE ? ("followed" as const) : ("requested" as const),
    follow: created,
    state
  };
}

export async function acceptFollowRequest(userId: string, followId: string) {
  const row = await prisma.userFollow.findUnique({ where: { id: followId } });
  if (!row || row.followingId !== userId) {
    return { ok: false as const, error: "not_found", status: 404 };
  }
  if (row.status !== PENDING) {
    return { ok: false as const, error: "not_pending", status: 409 };
  }
  if (await isBlocked(userId, row.followerId)) {
    return { ok: false as const, error: "blocked", status: 403 };
  }

  const updated = await prisma.userFollow.update({
    where: { id: followId },
    data: { status: ACTIVE }
  });
  const state = await getFollowState(userId, row.followerId);
  return { ok: true as const, follow: updated, state };
}

export async function rejectFollowRequest(userId: string, followId: string) {
  const row = await prisma.userFollow.findUnique({ where: { id: followId } });
  if (!row || row.followingId !== userId) {
    return { ok: false as const, error: "not_found", status: 404 };
  }
  if (row.status !== PENDING) {
    return { ok: false as const, error: "not_pending", status: 409 };
  }

  const updated = await prisma.userFollow.update({
    where: { id: followId },
    data: { status: "rejected" }
  });
  return { ok: true as const, follow: updated };
}

type FollowListUser = {
  userId: string;
  displayName: string;
  publicHandle: string | null;
  followId: string;
  followedAt: string;
  relation: FollowRelation;
  relationLabel: string;
};

async function mapFollowListUser(
  viewerId: string | null,
  edge: { id: string; createdAt: Date; followerId: string; followingId: string },
  peerId: string
): Promise<FollowListUser> {
  const user = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, legalName: true, publicHandle: true, email: true }
  });
  const state = viewerId ? await getFollowState(viewerId, peerId) : null;
  const displayName =
    user?.legalName?.trim() ||
    user?.publicHandle?.replace(/^@/, "") ||
    user?.email?.split("@")[0] ||
    "VLUE 회원";

  return {
    userId: peerId,
    displayName,
    publicHandle: user?.publicHandle ?? null,
    followId: edge.id,
    followedAt: edge.createdAt.toISOString(),
    relation: state?.relation ?? "none",
    relationLabel: state?.label ?? "팔로우"
  };
}

export async function listFollowers(userId: string, viewerId: string | null, limit = 50, cursor?: string) {
  const rows = await prisma.userFollow.findMany({
    where: {
      followingId: userId,
      status: ACTIVE,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100)
  });

  const items: FollowListUser[] = [];
  for (const row of rows) {
    items.push(await mapFollowListUser(viewerId, row, row.followerId));
  }

  return {
    items,
    nextCursor: rows.length ? rows[rows.length - 1].createdAt.toISOString() : null
  };
}

export async function listFollowing(userId: string, viewerId: string | null, limit = 50, cursor?: string) {
  const rows = await prisma.userFollow.findMany({
    where: {
      followerId: userId,
      status: ACTIVE,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100)
  });

  const items: FollowListUser[] = [];
  for (const row of rows) {
    items.push(await mapFollowListUser(viewerId, row, row.followingId));
  }

  return {
    items,
    nextCursor: rows.length ? rows[rows.length - 1].createdAt.toISOString() : null
  };
}

export async function listPendingFollowInbox(userId: string) {
  const rows = await prisma.userFollow.findMany({
    where: { followingId: userId, status: PENDING },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      follower: {
        select: { id: true, legalName: true, publicHandle: true, email: true }
      }
    }
  });

  return rows.map((r) => ({
    id: r.id,
    followerId: r.followerId,
    displayName:
      r.follower.legalName?.trim() ||
      r.follower.publicHandle?.replace(/^@/, "") ||
      r.follower.email?.split("@")[0] ||
      "VLUE 회원",
    publicHandle: r.follower.publicHandle,
    status: r.status,
    createdAt: r.createdAt.toISOString()
  }));
}

export type FollowSettingsPatch = {
  isPrivateFollow?: boolean;
  isShowcasePrivate?: boolean;
  isPhoneFollowersAllowed?: boolean;
  isNameFollowersAllowed?: boolean;
  isOrgFollowersAllowed?: boolean;
  isIdFollowersAllowed?: boolean;
};

export async function getFollowSettings(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPrivateFollow: true,
      isShowcasePrivate: true,
      isPhoneFollowersAllowed: true,
      isNameFollowersAllowed: true,
      isOrgFollowersAllowed: true,
      isIdFollowersAllowed: true,
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true
    }
  });
}

export async function updateFollowSettings(userId: string, patch: FollowSettingsPatch) {
  const data: Record<string, boolean> = {};
  for (const key of [
    "isPrivateFollow",
    "isShowcasePrivate",
    "isPhoneFollowersAllowed",
    "isNameFollowersAllowed",
    "isOrgFollowersAllowed",
    "isIdFollowersAllowed"
  ] as const) {
    if (typeof patch[key] === "boolean") data[key] = patch[key]!;
  }
  if (!Object.keys(data).length) return getFollowSettings(userId);
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      isPrivateFollow: true,
      isShowcasePrivate: true,
      isPhoneFollowersAllowed: true,
      isNameFollowersAllowed: true,
      isOrgFollowersAllowed: true,
      isIdFollowersAllowed: true,
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true
    }
  });
}

export async function getProfileForViewer(viewerId: string | null, targetUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      ...privacySelect,
      legalName: true,
      phoneE164: true,
      publicHandle: true,
      status: true,
      businessProfile: { select: { companyName: true, jobTitle: true } }
    }
  });
  if (!user || user.status !== "ACTIVE") return null;

  const ctx = await buildViewerAccessContext(viewerId, targetUserId);
  const raw: MaskableProfile = {
    displayName: user.legalName,
    legalName: user.legalName,
    phoneE164: user.phoneE164,
    publicHandle: user.publicHandle,
    companyName: user.businessProfile?.companyName,
    jobTitle: user.businessProfile?.jobTitle
  };

  const masked = maskProfileForViewer(user as UserPrivacyRow, raw, ctx);
  const followState = await getFollowState(viewerId, targetUserId);

  return {
    userId: targetUserId,
    profile: masked,
    follow: followState
  };
}
