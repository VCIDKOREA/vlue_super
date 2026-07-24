import { prisma } from "../../db/client.js";
import {
  buildViewerAccessContext,
  getProfileForViewer
} from "../follow/followService.js";
import { privacySelect } from "../follow/profileAccessControl.js";
import {
  computeCooldown,
  maxMainSlotsForTier,
  MycaseBroadcastError,
  resolveMycaseTier,
  type BroadcastPolicySnapshot,
  type MycaseTier
} from "./mycasePolicy.js";

const TITLE_MAX = 200;

export type CreateMycaseInput = {
  title: string;
  thumbnailUrl?: string | null;
  payloadJson: unknown;
  isPublic?: boolean;
  /** 생성과 동시에 메인 송출 ON (정책 검증) */
  isMainBroadcast?: boolean;
};

export type UpdateMycaseInput = {
  title?: string;
  thumbnailUrl?: string | null;
  payloadJson?: unknown;
  isPublic?: boolean;
};

function clampTitle(raw: string): string {
  const t = String(raw || "").trim().slice(0, TITLE_MAX);
  return t || "쇼케이스";
}

function clampThumb(raw: string | null | undefined): string | null {
  const s = String(raw || "").trim();
  if (!s || s.startsWith("blob:")) return null;
  /* VARCHAR(2048) 시절 잘린 data URL */
  if (s.startsWith("data:") && s.length < 3000) return null;
  return s;
}

function coverFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const style = (payload as { style?: unknown }).style;
  if (!style || typeof style !== "object") return null;
  const st = style as {
    pages?: Array<{ gallery?: { photos?: Array<{ url?: string }> }; photos?: Array<{ url?: string }> }>;
    gallery?: { photos?: Array<{ url?: string }> };
  };
  for (const page of Array.isArray(st.pages) ? st.pages : []) {
    for (const ph of page?.gallery?.photos || page?.photos || []) {
      const u = clampThumb(ph?.url);
      if (u) return u;
    }
  }
  for (const ph of st.gallery?.photos || []) {
    const u = clampThumb(ph?.url);
    if (u) return u;
  }
  return null;
}

function resolveThumbnail(thumbnailUrl: string | null | undefined, payloadJson?: unknown): string | null {
  const fromPayload = coverFromPayload(payloadJson);
  const direct = clampThumb(thumbnailUrl);
  if (direct?.startsWith("data:") && fromPayload) return fromPayload;
  return direct || fromPayload;
}

function serializeCase(row: {
  id: string;
  ownerUserId: string;
  title: string;
  thumbnailUrl: string | null;
  payloadJson: unknown;
  isPublic: boolean;
  isMainBroadcast: boolean;
  slotIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    thumbnailUrl: resolveThumbnail(row.thumbnailUrl, row.payloadJson),
    payloadJson: row.payloadJson,
    isPublic: row.isPublic,
    isMainBroadcast: row.isMainBroadcast,
    slotIndex: row.slotIndex,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function serializeGridItem(row: {
  id: string;
  ownerUserId: string;
  title: string;
  thumbnailUrl: string | null;
  payloadJson?: unknown;
  isPublic: boolean;
  isMainBroadcast: boolean;
  slotIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    thumbnailUrl: resolveThumbnail(row.thumbnailUrl, row.payloadJson),
    isPublic: row.isPublic,
    isMainBroadcast: row.isMainBroadcast,
    slotIndex: row.slotIndex,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getBroadcastPolicy(userId: string): Promise<BroadcastPolicySnapshot> {
  const [tier, user, caseMainSlots, digitalCard] = await Promise.all([
    resolveMycaseTier(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { mainBroadcastChangedAt: true }
    }),
    prisma.showcaseCase.count({
      where: { ownerUserId: userId, deletedAt: null, isMainBroadcast: true }
    }),
    prisma.digitalCard.findUnique({
      where: { userId },
      select: { id: true }
    })
  ]);

  const maxMainSlots = maxMainSlotsForTier(tier);
  /** Pro 10슬롯 = 디지털인증명함(있으면 1) + 메인 송출 쇼케이스 */
  const digitalSlot = tier === "pro" && digitalCard ? 1 : 0;
  const usedMainSlots = caseMainSlots + digitalSlot;
  const cooldown = computeCooldown(tier, user?.mainBroadcastChangedAt ?? null);

  return {
    tier,
    maxMainSlots,
    usedMainSlots,
    remainingSlots: Math.max(0, maxMainSlots - usedMainSlots),
    nextChangeAt: cooldown.nextChangeAt,
    cooldownRemainingMs: cooldown.cooldownRemainingMs,
    canChangeBroadcast: cooldown.canChangeBroadcast,
    mainBroadcastChangedAt: user?.mainBroadcastChangedAt?.toISOString() ?? null
  };
}

async function assertCanTurnBroadcastOn(
  userId: string,
  tier: MycaseTier,
  opts: { countingSelfAlreadyOn?: boolean } = {}
) {
  const policy = await getBroadcastPolicy(userId);
  const used = opts.countingSelfAlreadyOn
    ? Math.max(0, policy.usedMainSlots - 1)
    : policy.usedMainSlots;

  if (!policy.canChangeBroadcast) {
    const days = Math.ceil(policy.cooldownRemainingMs / (24 * 60 * 60 * 1000));
    throw new MycaseBroadcastError(
      "cooldown_active",
      `무료 회원은 메인 송출을 ${days}일 후 변경할 수 있습니다.`,
      403,
      {
        nextChangeAt: policy.nextChangeAt,
        cooldownRemainingMs: policy.cooldownRemainingMs,
        tier
      }
    );
  }

  if (used >= policy.maxMainSlots) {
    throw new MycaseBroadcastError(
      "slot_limit_exceeded",
      tier === "free"
        ? "무료 회원은 메인 송출 쇼케이스를 1개만 선택할 수 있습니다. 유료 회원으로 업그레이드하거나 기존 송출을 해제해주세요."
        : `유료 회원은 디지털인증명함 포함 메인 송출을 최대 ${policy.maxMainSlots}개까지 선택할 수 있습니다. 기존 송출을 해제해주세요.`,
      403,
      {
        maxMainSlots: policy.maxMainSlots,
        usedMainSlots: policy.usedMainSlots,
        tier
      }
    );
  }
}

async function nextSlotIndex(userId: string): Promise<number> {
  const max = await prisma.showcaseCase.aggregate({
    where: { ownerUserId: userId, deletedAt: null, isMainBroadcast: true },
    _max: { slotIndex: true }
  });
  return (max._max.slotIndex ?? -1) + 1;
}

async function touchMainBroadcastChangedAt(userId: string, tier: MycaseTier) {
  if (tier !== "free") return;
  await prisma.user.update({
    where: { id: userId },
    data: { mainBroadcastChangedAt: new Date() }
  });
}

export async function createMycase(userId: string, input: CreateMycaseInput) {
  const title = clampTitle(input.title);
  const payloadJson = input.payloadJson ?? {};
  const wantMain = Boolean(input.isMainBroadcast);
  const tier = await resolveMycaseTier(userId);

  if (wantMain) {
    await assertCanTurnBroadcastOn(userId, tier);
  }

  const slotIndex = wantMain ? await nextSlotIndex(userId) : null;

  const row = await prisma.showcaseCase.create({
    data: {
      ownerUserId: userId,
      title,
      thumbnailUrl: clampThumb(input.thumbnailUrl) || coverFromPayload(payloadJson),
      payloadJson: payloadJson as object,
      isPublic: input.isPublic !== false,
      isMainBroadcast: wantMain,
      slotIndex
    }
  });

  if (wantMain) {
    await touchMainBroadcastChangedAt(userId, tier);
  }

  return serializeCase(row);
}

export async function updateMycase(userId: string, caseId: string, input: UpdateMycaseInput) {
  const existing = await prisma.showcaseCase.findFirst({
    where: { id: caseId, ownerUserId: userId, deletedAt: null }
  });
  if (!existing) {
    throw new MycaseBroadcastError("not_found", "마이케이스를 찾을 수 없습니다.", 404);
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = clampTitle(input.title);
  if (input.thumbnailUrl !== undefined) {
    data.thumbnailUrl = clampThumb(input.thumbnailUrl);
  }
  if (input.payloadJson !== undefined) data.payloadJson = input.payloadJson as object;
  if (input.isPublic !== undefined) data.isPublic = Boolean(input.isPublic);

  /** 내용 수정은 덮어쓰기 대신 새 아카이브로 남기려면 createMycase 사용.
   *  메타/공개여부/썸네일만 PATCH. payloadJson 전달 시 해당 행만 갱신(실수 방지용). */
  const row = await prisma.showcaseCase.update({
    where: { id: caseId },
    data
  });
  return serializeCase(row);
}

/**
 * 쇼케이스 편집본을 새 아카이브 게시물로 누적 저장.
 * (기존 행을 덮어쓰지 않음)
 * promoteToMain=true 이면 새 게시물을 메인 송출로 올리고,
 * 슬롯이 가득하면 기존 메인(가장 오래된 슬롯)을 내려 자리를 만든다.
 * (블루 쇼케이스 「적용」용 — 쿨다운 없이 송출 내용만 교체)
 */
export async function archiveShowcaseSnapshot(
  userId: string,
  input: CreateMycaseInput & {
    supersedesCaseId?: string | null;
    promoteToMain?: boolean;
  }
) {
  const promote = Boolean(input.promoteToMain);
  const created = await createMycase(userId, {
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    payloadJson: {
      ...(typeof input.payloadJson === "object" && input.payloadJson
        ? (input.payloadJson as object)
        : {}),
      supersedesCaseId: input.supersedesCaseId || null,
      archivedAt: new Date().toISOString()
    },
    isPublic: input.isPublic,
    isMainBroadcast: false
  });

  if (!promote) return created;

  const tier = await resolveMycaseTier(userId);
  const maxSlots = maxMainSlotsForTier(tier);
  const digitalCard =
    tier === "pro"
      ? await prisma.digitalCard.findUnique({ where: { userId }, select: { id: true } })
      : null;
  const digitalSlot = digitalCard ? 1 : 0;
  const mains = await prisma.showcaseCase.findMany({
    where: { ownerUserId: userId, deletedAt: null, isMainBroadcast: true },
    orderBy: [{ slotIndex: "asc" }, { updatedAt: "asc" }],
    select: { id: true, slotIndex: true }
  });

  /** 명함 슬롯을 제외한 쇼케이스 메인 한도 */
  const maxCaseSlots = Math.max(0, maxSlots - digitalSlot);
  if (mains.length >= maxCaseSlots) {
    const demoteIds = mains.slice(0, mains.length - maxCaseSlots + 1).map((m) => m.id);
    if (demoteIds.length) {
      await prisma.showcaseCase.updateMany({
        where: { id: { in: demoteIds }, ownerUserId: userId },
        data: { isMainBroadcast: false, slotIndex: null }
      });
    }
  }

  const slotIndex = await nextSlotIndex(userId);
  const row = await prisma.showcaseCase.update({
    where: { id: created.id },
    data: { isMainBroadcast: true, slotIndex }
  });

  return serializeCase(row);
}

export async function softDeleteMycase(userId: string, caseId: string) {
  const existing = await prisma.showcaseCase.findFirst({
    where: { id: caseId, ownerUserId: userId, deletedAt: null }
  });
  if (!existing) {
    throw new MycaseBroadcastError("not_found", "마이케이스를 찾을 수 없습니다.", 404);
  }

  const wasMain = existing.isMainBroadcast;
  const tier = await resolveMycaseTier(userId);

  await prisma.showcaseCase.update({
    where: { id: caseId },
    data: {
      deletedAt: new Date(),
      isMainBroadcast: false,
      slotIndex: null
    }
  });

  if (wasMain) {
    await touchMainBroadcastChangedAt(userId, tier);
  }

  return { ok: true as const, id: caseId };
}

export async function setMainBroadcast(userId: string, caseId: string, enabled: boolean) {
  const existing = await prisma.showcaseCase.findFirst({
    where: { id: caseId, ownerUserId: userId, deletedAt: null }
  });
  if (!existing) {
    throw new MycaseBroadcastError("not_found", "마이케이스를 찾을 수 없습니다.", 404);
  }

  if (Boolean(existing.isMainBroadcast) === Boolean(enabled)) {
    return {
      item: serializeCase(existing),
      policy: await getBroadcastPolicy(userId)
    };
  }

  const tier = await resolveMycaseTier(userId);

  if (enabled) {
    await assertCanTurnBroadcastOn(userId, tier);
    const slotIndex = await nextSlotIndex(userId);
    const row = await prisma.showcaseCase.update({
      where: { id: caseId },
      data: { isMainBroadcast: true, slotIndex }
    });
    await touchMainBroadcastChangedAt(userId, tier);
    return { item: serializeCase(row), policy: await getBroadcastPolicy(userId) };
  }

  // OFF — 무료도 쿨다운 적용 (변경으로 간주)
  const cooldown = computeCooldown(
    tier,
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { mainBroadcastChangedAt: true }
      })
    )?.mainBroadcastChangedAt
  );
  if (!cooldown.canChangeBroadcast) {
    const days = Math.ceil(cooldown.cooldownRemainingMs / (24 * 60 * 60 * 1000));
    throw new MycaseBroadcastError(
      "cooldown_active",
      `무료 회원은 메인 송출을 ${days}일 후 변경할 수 있습니다.`,
      403,
      {
        nextChangeAt: cooldown.nextChangeAt,
        cooldownRemainingMs: cooldown.cooldownRemainingMs,
        tier
      }
    );
  }

  const row = await prisma.showcaseCase.update({
    where: { id: caseId },
    data: { isMainBroadcast: false, slotIndex: null }
  });
  await touchMainBroadcastChangedAt(userId, tier);
  return { item: serializeCase(row), policy: await getBroadcastPolicy(userId) };
}

export async function listMycaseMine(userId: string, limit = 24, cursor?: string) {
  const take = Math.min(48, Math.max(1, limit));
  const rows = await prisma.showcaseCase.findMany({
    where: {
      ownerUserId: userId,
      deletedAt: null,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
    },
    orderBy: [{ isMainBroadcast: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    select: {
      id: true,
      ownerUserId: true,
      title: true,
      thumbnailUrl: true,
      payloadJson: true,
      isPublic: true,
      isMainBroadcast: true,
      slotIndex: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() : null;

  return {
    items: page.map(serializeGridItem),
    nextCursor,
    policy: await getBroadcastPolicy(userId)
  };
}

/**
 * 통화 송출용 메인 케이스 — slotIndex 오름차순 1순위 (+ 전체 목록)
 */
export async function getLiveMainBroadcast(userId: string) {
  const rows = await prisma.showcaseCase.findMany({
    where: { ownerUserId: userId, deletedAt: null, isMainBroadcast: true },
    orderBy: [{ slotIndex: "asc" }, { updatedAt: "desc" }],
    take: 20
  });
  const items = rows.map(serializeCase);
  return {
    item: items[0] || null,
    items,
    policy: await getBroadcastPolicy(userId)
  };
}

/** 타인이 케이스함 열람 가능 여부 — 비공개 계정은 활성 팔로워만 */
export async function canViewerOpenCaseArchive(
  viewerId: string | null,
  ownerUserId: string
): Promise<{ allowed: boolean; reason?: string; isShowcasePrivate: boolean }> {
  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { ...privacySelect, status: true }
  });
  if (!owner || owner.status !== "ACTIVE") {
    return { allowed: false, reason: "user_not_found", isShowcasePrivate: false };
  }

  const ctx = await buildViewerAccessContext(viewerId, ownerUserId);
  if (ctx.isOwner) return { allowed: true, isShowcasePrivate: owner.isShowcasePrivate };

  if (owner.isShowcasePrivate && !ctx.isActiveFollower) {
    return {
      allowed: false,
      reason: "private_followers_only",
      isShowcasePrivate: true
    };
  }

  return { allowed: true, isShowcasePrivate: owner.isShowcasePrivate };
}

export async function listMycaseForViewer(
  viewerId: string | null,
  ownerUserId: string,
  limit = 24,
  cursor?: string
) {
  const access = await canViewerOpenCaseArchive(viewerId, ownerUserId);
  const profileBundle = await getProfileForViewer(viewerId, ownerUserId);
  if (!profileBundle) {
    return {
      ok: false as const,
      error: "user_not_found",
      status: 404 as const
    };
  }

  const mainBroadcast = access.allowed
    ? await prisma.showcaseCase.findMany({
        where: {
          ownerUserId,
          deletedAt: null,
          isMainBroadcast: true,
          isPublic: true
        },
        orderBy: [{ slotIndex: "asc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          ownerUserId: true,
          title: true,
          thumbnailUrl: true,
          payloadJson: true,
          isPublic: true,
          isMainBroadcast: true,
          slotIndex: true,
          createdAt: true,
          updatedAt: true
        }
      })
    : [];

  if (!access.allowed) {
    return {
      ok: true as const,
      accessDenied: true as const,
      reason: access.reason,
      isShowcasePrivate: access.isShowcasePrivate,
      profile: profileBundle,
      mainBroadcast: [],
      items: [],
      nextCursor: null
    };
  }

  const take = Math.min(48, Math.max(1, limit));
  const rows = await prisma.showcaseCase.findMany({
    where: {
      ownerUserId,
      deletedAt: null,
      isPublic: true,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
    },
    orderBy: [{ isMainBroadcast: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    select: {
      id: true,
      ownerUserId: true,
      title: true,
      thumbnailUrl: true,
      payloadJson: true,
      isPublic: true,
      isMainBroadcast: true,
      slotIndex: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.createdAt.toISOString() : null;

  return {
    ok: true as const,
    accessDenied: false as const,
    reason: null,
    isShowcasePrivate: access.isShowcasePrivate,
    profile: profileBundle,
    mainBroadcast: mainBroadcast.map(serializeGridItem),
    items: page.map(serializeGridItem),
    nextCursor
  };
}

export async function getMycaseDetail(viewerId: string | null, caseId: string) {
  const id = String(caseId || "").trim();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    throw new MycaseBroadcastError("not_found", "마이케이스를 찾을 수 없습니다.", 404);
  }

  const row = await prisma.showcaseCase.findFirst({
    where: { id, deletedAt: null }
  });
  if (!row) {
    throw new MycaseBroadcastError("not_found", "마이케이스를 찾을 수 없습니다.", 404);
  }

  const ctx = await buildViewerAccessContext(viewerId, row.ownerUserId);
  if (ctx.isOwner) {
    return { item: serializeCase(row), isOwner: true };
  }

  if (!row.isPublic) {
    throw new MycaseBroadcastError("forbidden", "비공개 마이케이스입니다.", 403);
  }

  const access = await canViewerOpenCaseArchive(viewerId, row.ownerUserId);
  if (!access.allowed) {
    throw new MycaseBroadcastError(
      "forbidden",
      "비공개 계정의 케이스함은 팔로워만 볼 수 있습니다.",
      403,
      { reason: access.reason }
    );
  }

  return { item: serializeCase(row), isOwner: false };
}
