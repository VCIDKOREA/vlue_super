/**
 * V2 쇼케이스 소셜 — 좋아요·댓글 (+ FCM 푸시 · 알림함)
 */
import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendShowcaseSocialPushToUser } from "../fcmNotificationService.js";

const COMMENT_MAX = 1000;
const COMMENT_RATE_WINDOW_MS = 60_000;
const COMMENT_RATE_LIMIT = 8;
const SHARE_RATE_WINDOW_MS = 60_000;
const SHARE_RATE_LIMIT = 4;
const PUSH_BODY_MAX = 120;

const commentBuckets = new Map<string, number[]>();
const shareBuckets = new Map<string, number[]>();

function slideKey(slideId?: string | null) {
  return String(slideId || "").trim().slice(0, 80);
}

function assertCommentRate(userId: string): boolean {
  const now = Date.now();
  const prev = (commentBuckets.get(userId) || []).filter((t) => now - t < COMMENT_RATE_WINDOW_MS);
  if (prev.length >= COMMENT_RATE_LIMIT) {
    commentBuckets.set(userId, prev);
    return false;
  }
  prev.push(now);
  commentBuckets.set(userId, prev);
  return true;
}

const authorSelect = {
  id: true,
  publicHandle: true,
  legalName: true
} as const;

async function loadAuthorLite(userIds: string[]): Promise<Map<string, { activityName: string; avatarUrl: string }>> {
  const map = new Map<string, { activityName: string; avatarUrl: string }>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return map;
  const rows = await prisma.$queryRaw<
    Array<{ user_id: string; activity_name: string | null; photo_url: string | null }>
  >`
    SELECT
      user_id,
      NULLIF(TRIM(export_snapshot_json->>'activityName'), '') AS activity_name,
      NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url
    FROM digital_cards
    WHERE user_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
  `;
  for (const r of rows) {
    const photo = String(r.photo_url || "").trim();
    map.set(r.user_id, {
      activityName: String(r.activity_name || "").trim(),
      avatarUrl: photo && !photo.startsWith("data:") && !photo.startsWith("blob:") ? photo : ""
    });
  }
  return map;
}

function serializeAuthor(
  author: {
    id: string;
    publicHandle: string | null;
    legalName: string | null;
  },
  lite?: { activityName: string; avatarUrl: string } | null
) {
  const activity = lite?.activityName || "";
  return {
    id: author.id,
    handle: author.publicHandle || "",
    name: activity || author.legalName || author.publicHandle || "회원",
    avatarUrl: lite?.avatarUrl || ""
  };
}

async function resolveActorProfile(userId: string): Promise<{ name: string; handle: string }> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: authorSelect
    });
    if (!u) return { name: "회원", handle: "" };
    const lite = await loadAuthorLite([userId]);
    const author = serializeAuthor(u, lite.get(userId));
    const handle = String(author.handle || "").replace(/^@+/, "").trim();
    return {
      name: String(author.name || handle || "회원").trim(),
      handle
    };
  } catch {
    return { name: "회원", handle: "" };
  }
}

function actorAtLabel(profile: { name: string; handle: string }): string {
  const handle = String(profile.handle || "").replace(/^@+/, "").trim();
  if (handle) return `@${handle}`;
  return String(profile.name || "회원").trim();
}

function showcaseActorData(
  actorUserId: string | null | undefined,
  profile: { name: string; handle: string },
  extra: Record<string, unknown> = {}
) {
  const handle = String(profile.handle || "").replace(/^@+/, "").trim();
  return {
    ...extra,
    actorUserId: actorUserId || "",
    actorHandle: handle,
    actorName: String(profile.name || handle || "회원").trim()
  };
}

function clipPushBody(text: string): string {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= PUSH_BODY_MAX) return s;
  return `${s.slice(0, PUSH_BODY_MAX - 1)}…`;
}

function assertShareRate(userId: string, ownerUserId: string): boolean {
  const key = `${userId}:${ownerUserId}`;
  const now = Date.now();
  const prev = (shareBuckets.get(key) || []).filter((t) => now - t < SHARE_RATE_WINDOW_MS);
  if (prev.length >= SHARE_RATE_LIMIT) {
    shareBuckets.set(key, prev);
    return false;
  }
  prev.push(now);
  shareBuckets.set(key, prev);
  return true;
}

/** 실패해도 좋아요/댓글 API에 영향 없음 */
function fireShowcasePush(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): void {
  if (!userId) return;
  const clipped = clipPushBody(body);
  void sendShowcaseSocialPushToUser(userId, title, clipped, {
    ...data,
    title,
    body: clipped
  }).catch((err) => {
    console.warn("[showcase-social] fcm_push_failed", { userId, err });
  });
}

/** OwnerNotification + SSE + FCM — 알림함에 쌓이도록 */
function deliverShowcaseSocialNotice(opts: {
  recipientUserId: string;
  actorUserId?: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
}): void {
  const recipientUserId = String(opts.recipientUserId || "").trim();
  if (!recipientUserId) return;
  const title = String(opts.title || "").slice(0, 120);
  const body = clipPushBody(opts.body);
  void (async () => {
    let notificationId = "";
    try {
      const row = await prisma.ownerNotification.create({
        data: {
          ownerUserId: recipientUserId,
          actorUserId: opts.actorUserId || null,
          title,
          body,
          payloadJson: opts.data as Prisma.InputJsonValue
        }
      });
      notificationId = row.id;
    } catch (err) {
      console.warn("[showcase-social] inbox_persist_failed", { recipientUserId, err });
    }
    const payload = {
      ...opts.data,
      type: String(opts.data?.type || "vlue-showcase-social"),
      title,
      body,
      notificationId
    };
    try {
      ssePublish(recipientUserId, payload);
    } catch (err) {
      console.warn("[showcase-social] sse_failed", { recipientUserId, err });
    }
    fireShowcasePush(recipientUserId, title, body, payload);
  })();
}

export async function getShowcaseSocialSummary(opts: {
  ownerUserId: string;
  actorUserId?: string | null;
  slideId?: string | null;
}) {
  const slideId = slideKey(opts.slideId);
  const whereLike = { ownerUserId: opts.ownerUserId, type: "like", slideId };

  const [likeCount, likedByMe, recentLike, comments] = await Promise.all([
    prisma.showcaseReaction.count({ where: whereLike }),
    opts.actorUserId
      ? prisma.showcaseReaction
          .findUnique({
            where: {
              ownerUserId_actorUserId_type_slideId: {
                ownerUserId: opts.ownerUserId,
                actorUserId: opts.actorUserId,
                type: "like",
                slideId
              }
            }
          })
          .then((r) => Boolean(r))
      : Promise.resolve(false),
    prisma.showcaseReaction.findFirst({
      where: whereLike,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: authorSelect } }
    }),
    prisma.showcaseComment.findMany({
      where: {
        ownerUserId: opts.ownerUserId,
        slideId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: authorSelect } }
    })
  ]);

  const authorLites = await loadAuthorLite([
    ...comments.map((c) => c.author.id),
    ...(recentLike ? [recentLike.actorUserId] : [])
  ]);

  return {
    likeCount,
    likedByMe,
    recentLiker: recentLike
      ? serializeAuthor(recentLike.actor, authorLites.get(recentLike.actorUserId))
      : null,
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      parentId: c.parentId || null,
      createdAt: c.createdAt.toISOString(),
      mine: Boolean(opts.actorUserId && c.authorUserId === opts.actorUserId),
      author: serializeAuthor(c.author, authorLites.get(c.author.id))
    }))
  };
}

export async function listShowcaseLikes(opts: {
  ownerUserId: string;
  slideId?: string | null;
  limit?: number;
}) {
  const slideId = slideKey(opts.slideId);
  const limit = Math.min(100, Math.max(1, opts.limit || 50));
  const rows = await prisma.showcaseReaction.findMany({
    where: { ownerUserId: opts.ownerUserId, type: "like", slideId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: authorSelect } }
  });
  const authorLites = await loadAuthorLite(rows.map((r) => r.actorUserId));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    author: serializeAuthor(r.actor, authorLites.get(r.actorUserId))
  }));
}

function showcaseSlideLabel(contentOrdinal?: number | null): string {
  const n = Math.floor(Number(contentOrdinal) || 0);
  if (n > 0) return `쇼케이스 ${n}번`;
  return "쇼케이스";
}

export async function toggleShowcaseLike(opts: {
  ownerUserId: string;
  actorUserId: string;
  slideId?: string | null;
  liked?: boolean | null;
  contentOrdinal?: number | null;
}) {
  const slideId = slideKey(opts.slideId);
  const key = {
    ownerUserId: opts.ownerUserId,
    actorUserId: opts.actorUserId,
    type: "like",
    slideId
  };

  const existing = await prisma.showcaseReaction.findUnique({
    where: { ownerUserId_actorUserId_type_slideId: key }
  });

  const wantLiked = typeof opts.liked === "boolean" ? opts.liked : !existing;
  let likedByMe = Boolean(existing);

  if (wantLiked && !existing) {
    await prisma.showcaseReaction.create({ data: key });
    likedByMe = true;
  } else if (!wantLiked && existing) {
    await prisma.showcaseReaction.delete({ where: { id: existing.id } });
    likedByMe = false;
  }

  const likeCount = await prisma.showcaseReaction.count({
    where: { ownerUserId: opts.ownerUserId, type: "like", slideId }
  });

  /* 새로 좋아요 시에만 알림 — 취소·본인·이미 좋아요는 제외 */
  if (likedByMe && !existing && opts.ownerUserId !== opts.actorUserId) {
    void resolveActorProfile(opts.actorUserId).then((actor) => {
      const at = actorAtLabel(actor);
      const contentOrdinal = Math.max(0, Math.floor(Number(opts.contentOrdinal) || 0));
      const slideLabel = showcaseSlideLabel(contentOrdinal);
      deliverShowcaseSocialNotice({
        recipientUserId: opts.ownerUserId,
        actorUserId: opts.actorUserId,
        title: "새 좋아요",
        body:
          contentOrdinal > 0
            ? `${at}님이 회원님의 ${slideLabel}을 좋아합니다.`
            : `${at}님이 회원님의 쇼케이스를 좋아합니다.`,
        data: showcaseActorData(opts.actorUserId, actor, {
          type: "vlue-showcase-like",
          ownerUserId: opts.ownerUserId,
          slideId,
          contentOrdinal: contentOrdinal > 0 ? String(contentOrdinal) : "",
          slideLabel,
          likeCount: String(likeCount)
        })
      });
    });
  }

  return { likedByMe, likeCount };
}

export async function listShowcaseComments(opts: {
  ownerUserId: string;
  actorUserId?: string | null;
  slideId?: string | null;
  limit?: number;
}) {
  const slideId = slideKey(opts.slideId);
  const limit = Math.min(100, Math.max(1, opts.limit || 50));
  const rows = await prisma.showcaseComment.findMany({
    where: { ownerUserId: opts.ownerUserId, slideId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: authorSelect } }
  });
  const authorLites = await loadAuthorLite(rows.map((c) => c.author.id));
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    parentId: c.parentId || null,
    createdAt: c.createdAt.toISOString(),
    mine: Boolean(opts.actorUserId && c.authorUserId === opts.actorUserId),
    author: serializeAuthor(c.author, authorLites.get(c.author.id))
  }));
}

export async function createShowcaseComment(opts: {
  ownerUserId: string;
  authorUserId: string;
  body: string;
  slideId?: string | null;
  parentId?: string | null;
}) {
  const body = String(opts.body || "").trim().slice(0, COMMENT_MAX);
  if (!body) return { ok: false as const, error: "댓글 내용을 입력해 주세요.", status: 400 as const };
  if (!assertCommentRate(opts.authorUserId)) {
    return { ok: false as const, error: "댓글을 너무 자주 남겼습니다. 잠시 후 다시 시도해 주세요.", status: 429 as const };
  }

  const slideId = slideKey(opts.slideId);
  const parentId = String(opts.parentId || "").trim() || null;
  let parentAuthorUserId: string | null = null;

  if (parentId) {
    const parent = await prisma.showcaseComment.findFirst({
      where: {
        id: parentId,
        ownerUserId: opts.ownerUserId,
        slideId,
        deletedAt: null
      },
      select: { id: true, parentId: true, authorUserId: true }
    });
    if (!parent) {
      return { ok: false as const, error: "답글 대상 댓글을 찾을 수 없습니다.", status: 404 as const };
    }
    if (parent.parentId) {
      return {
        ok: false as const,
        error: "답글에는 다시 답글을 달 수 없습니다. 원댓글에 답글해 주세요.",
        status: 400 as const
      };
    }
    parentAuthorUserId = parent.authorUserId;
  }

  const row = await prisma.showcaseComment.create({
    data: {
      ownerUserId: opts.ownerUserId,
      authorUserId: opts.authorUserId,
      slideId,
      body,
      parentId
    },
    include: { author: { select: authorSelect } }
  });

  const authorLite = await loadAuthorLite([row.author.id]);
  const author = serializeAuthor(row.author, authorLite.get(row.author.id));
  const preview = clipPushBody(body);
  const actorProfile = {
    name: String(author.name || "").trim() || "회원",
    handle: String(author.handle || "").replace(/^@+/, "").trim()
  };
  const at = actorAtLabel(actorProfile);
  const pushBase = showcaseActorData(opts.authorUserId, actorProfile, {
    type: parentId ? "vlue-showcase-comment-reply" : "vlue-showcase-comment",
    ownerUserId: opts.ownerUserId,
    slideId,
    commentId: row.id,
    parentId: parentId || ""
  });

  /* 쇼케이스 주인에게 알림 (본인 댓글 제외) */
  if (opts.ownerUserId !== opts.authorUserId) {
    deliverShowcaseSocialNotice({
      recipientUserId: opts.ownerUserId,
      actorUserId: opts.authorUserId,
      title: parentId ? "새 답글" : "새 댓글",
      body: parentId
        ? `${at}님이 회원님의 쇼케이스에 답글을 남겼습니다. ${preview}`
        : `${at}님이 댓글을 남겼습니다. ${preview}`,
      data: pushBase
    });
  }

  /* 원댓글 작성자에게 답글 알림 (본인·이미 주인으로 보낸 경우 제외) */
  if (
    parentAuthorUserId &&
    parentAuthorUserId !== opts.authorUserId &&
    parentAuthorUserId !== opts.ownerUserId
  ) {
    deliverShowcaseSocialNotice({
      recipientUserId: parentAuthorUserId,
      actorUserId: opts.authorUserId,
      title: "새 답글",
      body: `${at}님이 회원님의 댓글에 답글을 남겼습니다. ${preview}`,
      data: { ...pushBase, type: "vlue-showcase-comment-reply" }
    });
  }

  return {
    ok: true as const,
    comment: {
      id: row.id,
      body: row.body,
      parentId: row.parentId || null,
      createdAt: row.createdAt.toISOString(),
      mine: true,
      author
    }
  };
}

export async function updateShowcaseComment(opts: {
  ownerUserId: string;
  authorUserId: string;
  commentId: string;
  body: string;
}) {
  const body = String(opts.body || "").trim().slice(0, COMMENT_MAX);
  if (!body) return { ok: false as const, error: "댓글 내용을 입력해 주세요.", status: 400 as const };
  const commentId = String(opts.commentId || "").trim();
  if (!commentId) return { ok: false as const, error: "댓글을 찾을 수 없습니다.", status: 404 as const };

  const existing = await prisma.showcaseComment.findFirst({
    where: {
      id: commentId,
      ownerUserId: opts.ownerUserId,
      authorUserId: opts.authorUserId,
      deletedAt: null
    },
    include: { author: { select: authorSelect } }
  });
  if (!existing) {
    return { ok: false as const, error: "본인 댓글만 수정할 수 있습니다.", status: 403 as const };
  }

  const row = await prisma.showcaseComment.update({
    where: { id: existing.id },
    data: { body },
    include: { author: { select: authorSelect } }
  });
  const authorLite = await loadAuthorLite([row.author.id]);
  return {
    ok: true as const,
    comment: {
      id: row.id,
      body: row.body,
      parentId: row.parentId || null,
      createdAt: row.createdAt.toISOString(),
      mine: true,
      author: serializeAuthor(row.author, authorLite.get(row.author.id))
    }
  };
}

export async function deleteShowcaseComment(opts: {
  ownerUserId: string;
  authorUserId: string;
  commentId: string;
}) {
  const commentId = String(opts.commentId || "").trim();
  if (!commentId) return { ok: false as const, error: "댓글을 찾을 수 없습니다.", status: 404 as const };

  const existing = await prisma.showcaseComment.findFirst({
    where: {
      id: commentId,
      ownerUserId: opts.ownerUserId,
      authorUserId: opts.authorUserId,
      deletedAt: null
    },
    select: { id: true }
  });
  if (!existing) {
    return { ok: false as const, error: "본인 댓글만 삭제할 수 있습니다.", status: 403 as const };
  }

  const now = new Date();
  await prisma.showcaseComment.updateMany({
    where: {
      OR: [{ id: existing.id }, { parentId: existing.id }],
      deletedAt: null
    },
    data: { deletedAt: now }
  });
  return { ok: true as const };
}

export async function recordShowcaseShare(opts: {
  ownerUserId: string;
  actorUserId: string;
  slideId?: string | null;
}) {
  if (opts.ownerUserId === opts.actorUserId) {
    return { ok: true as const, notified: false };
  }
  if (!assertShareRate(opts.actorUserId, opts.ownerUserId)) {
    return { ok: true as const, notified: false };
  }
  const actor = await resolveActorProfile(opts.actorUserId);
  const at = actorAtLabel(actor);
  deliverShowcaseSocialNotice({
    recipientUserId: opts.ownerUserId,
    actorUserId: opts.actorUserId,
    title: "새 공유",
    body: `${at}님이 회원님의 쇼케이스를 공유했습니다.`,
    data: showcaseActorData(opts.actorUserId, actor, {
      type: "vlue-showcase-share",
      ownerUserId: opts.ownerUserId,
      slideId: slideKey(opts.slideId)
    })
  });
  return { ok: true as const, notified: true };
}
