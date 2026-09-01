import type { UserFollowStatus } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendShowcaseSocialPushToUser } from "../fcmNotificationService.js";
import {
  maskProfileForViewer,
  privacySelect,
  type MaskableProfile,
  type UserPrivacyRow,
  type ViewerAccessContext
} from "./profileAccessControl.js";
import {
  directoryFieldAllowed,
  resolveDirectoryAddress,
  resolveDirectoryPhone,
  type DccExposurePurpose
} from "../dcc/dccExposure.js";

async function resolveFollowActorLabel(userId: string): Promise<string> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { legalName: true, publicHandle: true, email: true }
    });
    if (!u) return "회원";
    return (
      String(u.legalName || "").trim() ||
      String(u.publicHandle || "")
        .replace(/^@/, "")
        .trim() ||
      String(u.email || "")
        .split("@")[0]
        .trim() ||
      "회원"
    );
  } catch {
    return "회원";
  }
}

/** 팔로우·팔로우 요청 알림 (FCM + SSE). 실패해도 API 결과에 영향 없음 */
function fireFollowNotify(
  targetUserId: string,
  payload: {
    type: "vlue-follow" | "vlue-follow-request" | "vlue-follow-accepted";
    title: string;
    body: string;
    actorUserId: string;
    followId?: string | null;
  }
): void {
  if (!targetUserId || targetUserId === payload.actorUserId) return;
  const data = {
    type: payload.type,
    actorUserId: payload.actorUserId,
    followId: payload.followId || ""
  };
  try {
    ssePublish(targetUserId, {
      ...data,
      title: payload.title,
      message: payload.body,
      body: payload.body
    });
  } catch (err) {
    console.warn("[follow] sse_notify_failed", { targetUserId, err });
  }
  void sendShowcaseSocialPushToUser(targetUserId, payload.title, payload.body, data).catch((err) => {
    console.warn("[follow] fcm_notify_failed", { targetUserId, err });
  });
}

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
      void resolveFollowActorLabel(followerId).then((actorName) => {
        if (nextStatus === ACTIVE) {
          fireFollowNotify(followingId, {
            type: "vlue-follow",
            title: "새 팔로워",
            body: `${actorName}님이 회원님을 팔로우하기 시작했습니다.`,
            actorUserId: followerId,
            followId: updated.id
          });
        } else {
          fireFollowNotify(followingId, {
            type: "vlue-follow-request",
            title: "팔로우 요청",
            body: `${actorName}님이 팔로우를 요청했습니다.`,
            actorUserId: followerId,
            followId: updated.id
          });
        }
      });
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
  void resolveFollowActorLabel(followerId).then((actorName) => {
    if (nextStatus === ACTIVE) {
      fireFollowNotify(followingId, {
        type: "vlue-follow",
        title: "새 팔로워",
        body: `${actorName}님이 회원님을 팔로우하기 시작했습니다.`,
        actorUserId: followerId,
        followId: created.id
      });
    } else {
      fireFollowNotify(followingId, {
        type: "vlue-follow-request",
        title: "팔로우 요청",
        body: `${actorName}님이 팔로우를 요청했습니다.`,
        actorUserId: followerId,
        followId: created.id
      });
    }
  });
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
  void resolveFollowActorLabel(userId).then((accepterName) => {
    fireFollowNotify(row.followerId, {
      type: "vlue-follow-accepted",
      title: "팔로우 수락",
      body: `${accepterName}님이 팔로우 요청을 수락했습니다.`,
      actorUserId: userId,
      followId: updated.id
    });
  });
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
  photoUrl: string | null;
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
    select: { id: true, legalName: true, publicHandle: true, email: true, digitalCard: { select: { id: true } } }
  });
  const state = viewerId ? await getFollowState(viewerId, peerId) : null;
  const displayName =
    user?.legalName?.trim() ||
    user?.publicHandle?.replace(/^@/, "") ||
    user?.email?.split("@")[0] ||
    "VLUE 회원";

  let photoUrl: string | null = null;
  if (user?.digitalCard) {
    const snapRows = await prisma.$queryRaw<Array<{ photo_url: string | null }>>`
      SELECT NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url
      FROM digital_cards
      WHERE user_id = ${peerId}::uuid
      LIMIT 1
    `;
    const raw = String(snapRows[0]?.photo_url || "").trim();
    if (raw.startsWith("http://") || raw.startsWith("https://")) photoUrl = raw;
  }

  return {
    userId: peerId,
    displayName,
    publicHandle: user?.publicHandle ?? null,
    photoUrl,
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
  isAddressFollowersAllowed?: boolean;
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
      isAddressFollowersAllowed: true,
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true,
      isAddressSearchAllowed: true,
      dccExposureConfigured: true
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
    "isIdFollowersAllowed",
    "isAddressFollowersAllowed"
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
      isAddressFollowersAllowed: true,
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true,
      isAddressSearchAllowed: true,
      dccExposureConfigured: true
    }
  });
}

async function isAcceptedFriend(viewerId: string, ownerId: string): Promise<boolean> {
  const row = await prisma.friendRequest.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: viewerId, toUserId: ownerId },
        { fromUserId: ownerId, toUserId: viewerId }
      ]
    },
    select: { id: true }
  });
  return Boolean(row);
}

export async function getProfileForViewer(
  viewerId: string | null,
  targetUserId: string,
  opts?: { purpose?: DccExposurePurpose }
) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      ...privacySelect,
      legalName: true,
      phoneE164: true,
      publicHandle: true,
      email: true,
      status: true,
      businessProfile: { select: { companyName: true, jobTitle: true } },
      digitalCard: {
        select: { membershipTierSnapshot: true, issuedAt: true }
      },
      subscriptions: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { cycleEndAt: true, cycleStartAt: true, plan: true }
      }
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

  /* 전체 exportSnapshotJson SELECT 금지 — 필요한 짧은 필드만 JSON path */
  const snapRows = user.digitalCard
    ? await prisma.$queryRaw<
        Array<{
          name: string | null;
          display_name: string | null;
          organization: string | null;
          company_name: string | null;
          title: string | null;
          department: string | null;
          email: string | null;
          website: string | null;
          fax: string | null;
          address: string | null;
          activity_name: string | null;
          photo_url: string | null;
          title_photo_url: string | null;
          logo_url: string | null;
          photo_focus: string | null;
          no_title_photo: boolean | null;
          company_intro: string | null;
          custom_back_text: string | null;
        }>
      >`
        SELECT
          NULLIF(TRIM(export_snapshot_json->>'name'), '') AS name,
          NULLIF(TRIM(export_snapshot_json->>'displayName'), '') AS display_name,
          NULLIF(TRIM(export_snapshot_json->>'organization'), '') AS organization,
          NULLIF(TRIM(export_snapshot_json->>'companyName'), '') AS company_name,
          NULLIF(TRIM(export_snapshot_json->>'title'), '') AS title,
          NULLIF(TRIM(export_snapshot_json->>'department'), '') AS department,
          NULLIF(TRIM(export_snapshot_json->>'email'), '') AS email,
          NULLIF(TRIM(export_snapshot_json->>'website'), '') AS website,
          NULLIF(TRIM(export_snapshot_json->>'fax'), '') AS fax,
          NULLIF(TRIM(export_snapshot_json->>'address'), '') AS address,
          NULLIF(TRIM(export_snapshot_json->>'activityName'), '') AS activity_name,
          NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url,
          NULLIF(TRIM(export_snapshot_json->>'titlePhotoUrl'), '') AS title_photo_url,
          NULLIF(TRIM(export_snapshot_json->>'logoUrl'), '') AS logo_url,
          NULLIF(TRIM(export_snapshot_json->>'photoFocus'), '') AS photo_focus,
          CASE
            WHEN export_snapshot_json ? 'noTitlePhoto'
              THEN (export_snapshot_json->>'noTitlePhoto')::boolean
            ELSE NULL
          END AS no_title_photo,
          NULLIF(TRIM(export_snapshot_json->>'companyIntro'), '') AS company_intro,
          NULLIF(TRIM(export_snapshot_json->>'customBackText'), '') AS custom_back_text
        FROM digital_cards
        WHERE user_id = ${targetUserId}::uuid
        LIMIT 1
      `
    : [];
  const s = snapRows[0];
  const httpOnly = (v: string | null | undefined) => {
    const t = String(v || "").trim();
    if (!t || t.startsWith("data:") || t.startsWith("blob:")) return "";
    return t;
  };
  const photoUrl = httpOnly(s?.photo_url);
  const titlePhotoUrl = httpOnly(s?.title_photo_url);
  const logoUrl = httpOnly(s?.logo_url);
  const photoFocus = String(s?.photo_focus || "").trim();
  const noTitlePhoto = Boolean(s?.no_title_photo);
  const sub = user.subscriptions?.[0] || null;

  const purpose: DccExposurePurpose = opts?.purpose === "search" || opts?.purpose === "follow" ? opts.purpose : "full";
  const isFriend =
    Boolean(viewerId) && !ctx.isOwner && (purpose === "search" || purpose === "follow")
      ? await isAcceptedFriend(viewerId as string, targetUserId)
      : false;
  const fullAccess = ctx.isOwner || isFriend || purpose === "full";

  let exportAddress = String(s?.address || "").trim();
  let phoneDisplay = String(user.phoneE164 || "").trim();
  let phoneVisible = Boolean(phoneDisplay);
  let phoneDialEnabled = phoneVisible;
  let addressVisible = Boolean(exportAddress);

  if (!fullAccess && (purpose === "search" || purpose === "follow")) {
    const flags = {
      isPhoneSearchAllowed: Boolean((user as UserPrivacyRow).isPhoneSearchAllowed),
      isAddressSearchAllowed: Boolean((user as UserPrivacyRow).isAddressSearchAllowed),
      isPhoneFollowersAllowed: Boolean((user as UserPrivacyRow).isPhoneFollowersAllowed),
      isAddressFollowersAllowed: Boolean((user as UserPrivacyRow).isAddressFollowersAllowed)
    };
    const phoneAllowed = directoryFieldAllowed(flags, "phone", purpose, ctx.isActiveFollower);
    const addressAllowed = directoryFieldAllowed(flags, "address", purpose, ctx.isActiveFollower);
    const phoneDir = resolveDirectoryPhone({
      rawPhone: String(user.phoneE164 || "").trim(),
      allowed: phoneAllowed,
      fullAccess: false
    });
    const addrDir = resolveDirectoryAddress({
      rawAddress: exportAddress,
      allowed: addressAllowed,
      fullAccess: false
    });
    phoneDisplay = phoneDir.phone;
    phoneVisible = phoneDir.phoneVisible;
    phoneDialEnabled = phoneDir.phoneDialEnabled;
    exportAddress = addrDir.address;
    addressVisible = addrDir.addressVisible;
  }

  const rawName = String(user.legalName || s?.name || s?.display_name || "").trim();

  /** 디지털 인증명함 송출 스냅샷 — 검색/팔로우는 주소만 마스킹. 통화(full)는 원본 */
  const cardExport = s
    ? {
        name: String(s.name || s.display_name || rawName || "").trim(),
        organization: String(s.organization || s.company_name || "").trim(),
        title: String(s.title || "").trim(),
        department: String(s.department || "").trim(),
        email: String(s.email || user.email || "").trim(),
        website: String(s.website || "").trim(),
        fax: String(s.fax || "").trim(),
        address: exportAddress,
        activityName: String(s.activity_name || "").trim(),
        photoUrl,
        titlePhotoUrl,
        noTitlePhoto,
        logoUrl,
        photoFocus,
        companyIntro: String(s?.company_intro || "").trim(),
        customBackText: String(s?.custom_back_text || "").trim()
      }
    : null;

  return {
    userId: targetUserId,
    profile: {
      ...masked,
      displayName: purpose === "full" ? masked.displayName : rawName || masked.displayName,
      nameVisible: purpose === "full" ? masked.nameVisible : Boolean(rawName),
      phoneE164: phoneVisible ? phoneDisplay : "",
      phoneDisplay,
      phoneVisible,
      phoneDialEnabled,
      address: exportAddress,
      addressVisible,
      email: String(s?.email || user.email || "").trim() || undefined,
      photoUrl: photoUrl || undefined,
      membershipTier: user.digitalCard?.membershipTierSnapshot || undefined
    },
    follow: followState,
    digitalCardIssued: Boolean(user.digitalCard),
    membershipTier: user.digitalCard?.membershipTierSnapshot || "free",
    vlueVerifiedBadge: await (async () => {
      const { hasVlueVerifiedBadge } = await import("../membership/vlueVerifiedBadgeService.js");
      return hasVlueVerifiedBadge(targetUserId);
    })(),
    photoUrl,
    cardExport,
    authCycleEndAt: sub?.cycleEndAt ? sub.cycleEndAt.toISOString() : null,
    authPaidAt: sub?.cycleStartAt ? sub.cycleStartAt.toISOString() : null,
    cardIssuedAt: user.digitalCard?.issuedAt ? user.digitalCard.issuedAt.toISOString() : null
  };
}
