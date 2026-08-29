import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendAdminBroadcastPushBatch, getFcmServerDiagnostics } from "../fcmNotificationService.js";

const PAID_TIERS = new Set(["paid", "standard", "premium", "b2b"]);
const MAX_SEND = 5000;

export const ADMIN_BROADCAST_AUDIENCES = [
  "all",
  "free",
  "paid",
  "business",
  "parent_with_child",
  "child_with_elder_parent",
  "minor_child"
] as const;

export type AdminBroadcastAudience = (typeof ADMIN_BROADCAST_AUDIENCES)[number];

export const ADMIN_BROADCAST_AUDIENCE_LABELS: Record<AdminBroadcastAudience, string> = {
  all: "전체",
  free: "무료 회원",
  paid: "유료 회원",
  business: "비즈니스",
  parent_with_child: "자녀를 둔 부모",
  child_with_elder_parent: "노년 부모를 둔 자녀",
  minor_child: "미성년 자녀"
};

const ACTIVE_USER_FILTER = {
  status: { not: "DELETED" as const },
  accountStatus: "active" as const
};

function isPaidSnapshot(tier: string | null | undefined): boolean {
  return Boolean(tier && PAID_TIERS.has(String(tier)));
}

async function listPaidUserIds(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: ACTIVE_USER_FILTER,
    select: {
      id: true,
      digitalCard: { select: { membershipTierSnapshot: true } },
      subscriptions: {
        where: { status: "active", cycleEndAt: { gt: new Date() } },
        select: { id: true },
        take: 1
      }
    }
  });
  const set = new Set<string>();
  for (const row of rows) {
    if (isPaidSnapshot(row.digitalCard?.membershipTierSnapshot) || row.subscriptions.length > 0) {
      set.add(row.id);
    }
  }
  return set;
}

async function listBusinessUserIds(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: {
      ...ACTIVE_USER_FILTER,
      OR: [
        { businessProfile: { isBusiness: true } },
        { isCompanyVerified: true },
        { enterpriseRole: { not: "NONE" } },
        { corporateMembership: { isNot: null } },
        { b2bEnterprisesAdministered: { some: {} } }
      ]
    },
    select: { id: true }
  });
  return new Set(rows.map((r) => r.id));
}

async function listFamilyGuardianIds(wardRole: "child" | "elder"): Promise<Set<string>> {
  const rows = await prisma.familyProtectionLink.findMany({
    where: { status: "active", wardRole },
    select: { guardianUserId: true },
    distinct: ["guardianUserId"]
  });
  const ids = rows.map((r) => r.guardianUserId);
  if (!ids.length) return new Set();
  const active = await prisma.user.findMany({
    where: { id: { in: ids }, ...ACTIVE_USER_FILTER },
    select: { id: true }
  });
  return new Set(active.map((r) => r.id));
}

async function listMinorChildUserIds(): Promise<Set<string>> {
  const wardRows = await prisma.familyProtectionLink.findMany({
    where: { status: "active", wardRole: "child" },
    select: { wardUserId: true },
    distinct: ["wardUserId"]
  });
  const wardIds = wardRows.map((r) => r.wardUserId);
  const rows = await prisma.user.findMany({
    where: {
      ...ACTIVE_USER_FILTER,
      OR: [
        { requiresParentalConsent: true },
        { parentalGuardianUserId: { not: null } },
        ...(wardIds.length ? [{ id: { in: wardIds } }] : [])
      ]
    },
    select: { id: true }
  });
  return new Set(rows.map((r) => r.id));
}

export async function resolveAdminBroadcastUserIds(
  audience: AdminBroadcastAudience
): Promise<string[]> {
  if (!ADMIN_BROADCAST_AUDIENCES.includes(audience)) {
    throw new Error("지원하지 않는 대상 그룹입니다.");
  }

  if (audience === "all") {
    const rows = await prisma.user.findMany({
      where: ACTIVE_USER_FILTER,
      select: { id: true }
    });
    return rows.map((r) => r.id);
  }

  if (audience === "paid") {
    return [...(await listPaidUserIds())];
  }

  if (audience === "free") {
    const paid = await listPaidUserIds();
    const rows = await prisma.user.findMany({
      where: ACTIVE_USER_FILTER,
      select: { id: true }
    });
    return rows.map((r) => r.id).filter((id) => !paid.has(id));
  }

  if (audience === "business") {
    return [...(await listBusinessUserIds())];
  }

  if (audience === "parent_with_child") {
    return [...(await listFamilyGuardianIds("child"))];
  }

  if (audience === "child_with_elder_parent") {
    return [...(await listFamilyGuardianIds("elder"))];
  }

  return [...(await listMinorChildUserIds())];
}

export async function getAdminBroadcastAudienceCounts(): Promise<
  Array<{ id: AdminBroadcastAudience; label: string; count: number }>
> {
  const [allUsers, paid, business, parentWithChild, childWithElderParent, minorChild] =
    await Promise.all([
      prisma.user.findMany({ where: ACTIVE_USER_FILTER, select: { id: true } }),
      listPaidUserIds(),
      listBusinessUserIds(),
      listFamilyGuardianIds("child"),
      listFamilyGuardianIds("elder"),
      listMinorChildUserIds()
    ]);
  const allCount = allUsers.length;
  const paidCount = paid.size;
  const freeCount = allCount - paidCount;

  return [
    { id: "all", label: ADMIN_BROADCAST_AUDIENCE_LABELS.all, count: allCount },
    { id: "free", label: ADMIN_BROADCAST_AUDIENCE_LABELS.free, count: freeCount },
    { id: "paid", label: ADMIN_BROADCAST_AUDIENCE_LABELS.paid, count: paidCount },
    {
      id: "business",
      label: ADMIN_BROADCAST_AUDIENCE_LABELS.business,
      count: business.size
    },
    {
      id: "parent_with_child",
      label: ADMIN_BROADCAST_AUDIENCE_LABELS.parent_with_child,
      count: parentWithChild.size
    },
    {
      id: "child_with_elder_parent",
      label: ADMIN_BROADCAST_AUDIENCE_LABELS.child_with_elder_parent,
      count: childWithElderParent.size
    },
    {
      id: "minor_child",
      label: ADMIN_BROADCAST_AUDIENCE_LABELS.minor_child,
      count: minorChild.size
    }
  ];
}

export async function sendAdminMemberBroadcast(opts: {
  audience: AdminBroadcastAudience;
  title: string;
  body: string;
  category?: string;
  adminUserId?: string | null;
}) {
  const title = String(opts.title || "").trim().slice(0, 120);
  const body = String(opts.body || "").trim().slice(0, 1200);
  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!body) throw new Error("내용을 입력해 주세요.");

  const userIds = await resolveAdminBroadcastUserIds(opts.audience);
  if (!userIds.length) {
    return {
      ok: true,
      audience: opts.audience,
      targeted: 0,
      inboxSaved: 0,
      pushSent: 0,
      pushFailed: 0,
      pushUsersWithTokens: 0,
      pushUsersWithoutTokens: 0,
      pushSkipReason: null,
      truncated: false
    };
  }

  const targeted = userIds.length;
  const truncated = targeted > MAX_SEND;
  const sendIds = userIds.slice(0, MAX_SEND);
  const category = String(opts.category || "공지").slice(0, 12);
  const adminUserId = opts.adminUserId ? String(opts.adminUserId) : null;

  let inboxSaved = 0;
  const chunkSize = 100;
  for (let i = 0; i < sendIds.length; i += chunkSize) {
    const chunk = sendIds.slice(i, i + chunkSize);
    const result = await prisma.ownerNotification.createMany({
      data: chunk.map((ownerUserId) => ({
        ownerUserId,
        actorUserId: adminUserId,
        title,
        body,
        payloadJson: {
          type: "vlue-admin-broadcast",
          audience: opts.audience,
          category
        }
      }))
    });
    inboxSaved += result.count;
  }

  let pushSent = 0;
  let pushFailed = 0;
  let pushUsersWithTokens = 0;
  let pushUsersWithoutTokens = 0;
  let pushSkipReason: string | null = null;
  const payload = {
    type: "vlue-admin-broadcast",
    audience: opts.audience,
    category,
    title,
    body
  };

  for (const userId of sendIds) {
    ssePublish(userId, payload);
  }

  const push = await sendAdminBroadcastPushBatch(sendIds, title, body, payload);
  pushSent = push.sent;
  pushFailed = push.failed;
  pushUsersWithTokens = push.usersWithTokens;
  pushUsersWithoutTokens = push.usersWithoutTokens;
  if (push.skipped && push.reason) {
    pushSkipReason =
      push.reason === "fcm_not_configured"
        ? (await getFcmServerDiagnostics()).detail || push.reason
        : push.reason;
  }

  return {
    ok: true,
    audience: opts.audience,
    audienceLabel: ADMIN_BROADCAST_AUDIENCE_LABELS[opts.audience],
    targeted,
    inboxSaved,
    pushSent,
    pushFailed,
    pushUsersWithTokens,
    pushUsersWithoutTokens,
    pushSkipReason,
    truncated,
    maxSend: MAX_SEND
  };
}
