/**
 * V2 쇼케이스 소셜 — 좋아요·댓글 (+ FCM 푸시)
 */
import { prisma } from "../../db/client.js";
import { sendShowcaseSocialPushToUser } from "../fcmNotificationService.js";

const COMMENT_MAX = 1000;
const COMMENT_RATE_WINDOW_MS = 60_000;
const COMMENT_RATE_LIMIT = 8;
const PUSH_BODY_MAX = 120;

const commentBuckets = new Map<string, number[]>();

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

function photoFromExportSnap(snap: unknown): string {
  if (!snap || typeof snap !== "object") return "";
  const o = snap as Record<string, unknown>;
  return String(o.photoUrl || o.image_url || o.imageUrl || "").trim();
}

function activityNameFromExportSnap(snap: unknown): string {
  if (!snap || typeof snap !== "object") return "";
  const o = snap as Record<string, unknown>;
  return String(o.activityName || o.activityDisplayName || o.nickname || "").trim();
}

const authorSelect = {
  id: true,
  publicHandle: true,
  legalName: true,
  digitalCard: { select: { exportSnapshotJson: true } }
} as const;

function serializeAuthor(author: {
  id: string;
  publicHandle: string | null;
  legalName: string | null;
  digitalCard?: { exportSnapshotJson: unknown } | null;
}) {
  const snap = author.digitalCard?.exportSnapshotJson;
  const activity = activityNameFromExportSnap(snap);
  return {
    id: author.id,
    handle: author.publicHandle || "",
    name: activity || author.legalName || author.publicHandle || "회원",
    avatarUrl: photoFromExportSnap(snap)
  };
}

async function resolveActorLabel(userId: string): Promise<string> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: authorSelect
    });
    if (!u) return "회원";
    return serializeAuthor(u).name;
  } catch {
    return "회원";
  }
}

function clipPushBody(text: string): string {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= PUSH_BODY_MAX) return s;
  return `${s.slice(0, PUSH_BODY_MAX - 1)}…`;
}

/** 실패해도 좋아요/댓글 API에 영향 없음 */
function fireShowcasePush(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): void {
  if (!userId) return;
  void sendShowcaseSocialPushToUser(userId, title, clipPushBody(body), data).catch((err) => {
    console.warn("[showcase-social] fcm_push_failed", { userId, err });
  });
}

export async function getShowcaseSocialSummary(opts: {
  ownerUserId: string;
  actorUserId?: string | null;
  slideId?: string | null;
}) {
  const slideId = slideKey(opts.slideId);
  const whereLike = { ownerUserId: opts.ownerUserId, type: "like", slideId };

  const [likeCount, likedByMe, comments] = await Promise.all([
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

  return {
    likeCount,
    likedByMe,
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      parentId: c.parentId || null,
      createdAt: c.createdAt.toISOString(),
      author: serializeAuthor(c.author)
    }))
  };
}

export async function toggleShowcaseLike(opts: {
  ownerUserId: string;
  actorUserId: string;
  slideId?: string | null;
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

  if (existing) {
    await prisma.showcaseReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.showcaseReaction.create({ data: key });
  }

  const likedByMe = !existing;
  const likeCount = await prisma.showcaseReaction.count({
    where: { ownerUserId: opts.ownerUserId, type: "like", slideId }
  });

  /* 좋아요 시에만 푸시 — 취소·본인 좋아요는 제외 */
  if (likedByMe && opts.ownerUserId !== opts.actorUserId) {
    void resolveActorLabel(opts.actorUserId).then((actorName) => {
      fireShowcasePush(opts.ownerUserId, "새 좋아요", `${actorName}님이 회원님의 쇼케이스를 좋아합니다.`, {
        type: "vlue-showcase-like",
        ownerUserId: opts.ownerUserId,
        actorUserId: opts.actorUserId,
        slideId,
        likeCount: String(likeCount)
      });
    });
  }

  return { likedByMe, likeCount };
}

export async function listShowcaseComments(opts: {
  ownerUserId: string;
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
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    parentId: c.parentId || null,
    createdAt: c.createdAt.toISOString(),
    author: serializeAuthor(c.author)
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

  const author = serializeAuthor(row.author);
  const preview = clipPushBody(body);
  const pushBase = {
    type: parentId ? "vlue-showcase-comment-reply" : "vlue-showcase-comment",
    ownerUserId: opts.ownerUserId,
    actorUserId: opts.authorUserId,
    slideId,
    commentId: row.id,
    parentId: parentId || ""
  };

  /* 쇼케이스 주인에게 알림 (본인 댓글 제외) */
  if (opts.ownerUserId !== opts.authorUserId) {
    fireShowcasePush(
      opts.ownerUserId,
      parentId ? "새 답글" : "새 댓글",
      parentId
        ? `${author.name}님이 회원님의 쇼케이스에 답글을 남겼습니다. ${preview}`
        : `${author.name}님이 댓글을 남겼습니다. ${preview}`,
      pushBase
    );
  }

  /* 원댓글 작성자에게 답글 알림 (본인·이미 주인으로 보낸 경우 제외) */
  if (
    parentAuthorUserId &&
    parentAuthorUserId !== opts.authorUserId &&
    parentAuthorUserId !== opts.ownerUserId
  ) {
    fireShowcasePush(
      parentAuthorUserId,
      "새 답글",
      `${author.name}님이 회원님의 댓글에 답글을 남겼습니다. ${preview}`,
      { ...pushBase, type: "vlue-showcase-comment-reply" }
    );
  }

  return {
    ok: true as const,
    comment: {
      id: row.id,
      body: row.body,
      parentId: row.parentId || null,
      createdAt: row.createdAt.toISOString(),
      author
    }
  };
}
