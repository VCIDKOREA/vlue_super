/**
 * V2 쇼케이스 소셜 — 좋아요·댓글
 */
import { prisma } from "../../db/client.js";

const COMMENT_MAX = 1000;
const COMMENT_RATE_WINDOW_MS = 60_000;
const COMMENT_RATE_LIMIT = 8;

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
      include: {
        author: {
          select: {
            id: true,
            publicHandle: true,
            legalName: true
          }
        }
      }
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
      author: {
        id: c.author.id,
        handle: c.author.publicHandle || "",
        name: c.author.legalName || c.author.publicHandle || "회원"
      }
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

  const likeCount = await prisma.showcaseReaction.count({
    where: { ownerUserId: opts.ownerUserId, type: "like", slideId }
  });

  return { likedByMe: !existing, likeCount };
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
    include: {
      author: { select: { id: true, publicHandle: true, legalName: true } }
    }
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    parentId: c.parentId || null,
    createdAt: c.createdAt.toISOString(),
    author: {
      id: c.author.id,
      handle: c.author.publicHandle || "",
      name: c.author.legalName || c.author.publicHandle || "회원"
    }
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

  if (parentId) {
    const parent = await prisma.showcaseComment.findFirst({
      where: {
        id: parentId,
        ownerUserId: opts.ownerUserId,
        slideId,
        deletedAt: null
      },
      select: { id: true, parentId: true }
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
  }

  const row = await prisma.showcaseComment.create({
    data: {
      ownerUserId: opts.ownerUserId,
      authorUserId: opts.authorUserId,
      slideId,
      body,
      parentId
    },
    include: {
      author: { select: { id: true, publicHandle: true, legalName: true } }
    }
  });

  return {
    ok: true as const,
    comment: {
      id: row.id,
      body: row.body,
      parentId: row.parentId || null,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.author.id,
        handle: row.author.publicHandle || "",
        name: row.author.legalName || row.author.publicHandle || "회원"
      }
    }
  };
}
