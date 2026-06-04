import type { Context, Next } from "hono";
import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { extractHashtagsFromBody, normalizeFeedTag } from "../lib/feedHashtags.js";
import { resolveScopedCardForViewer, type FeedAppMode } from "../services/feedScope.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import {
  assertCardFeedWriteAccess,
  cardActor,
  requireUserHeader,
  type CardFeedWriteDenyReason
} from "../middleware/cardGate.js";

export const feedRoutes = new Hono();

function parseMetaExpiresAt(metaJson: unknown): Date | null {
  if (!metaJson || typeof metaJson !== "object") return null;
  const raw = (metaJson as { expiresAt?: unknown }).expiresAt;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function cleanupExpiredFeedPosts(cardId?: string) {
  const now = Date.now();
  const rows = await prisma.cardFeedPost.findMany({
    where: cardId ? { cardId } : undefined,
    select: { id: true, metaJson: true },
    take: 400
  });
  const expiredIds = rows
    .filter((r) => {
      const expiresAt = parseMetaExpiresAt(r.metaJson);
      return expiresAt ? expiresAt.getTime() <= now : false;
    })
    .map((r) => r.id);
  if (!expiredIds.length) return 0;
  const result = await prisma.cardFeedPost.deleteMany({ where: { id: { in: expiredIds } } });
  return result.count;
}

function jsonFeedWriteDenied(reason: CardFeedWriteDenyReason): {
  status: 400 | 403 | 404;
  body: Record<string, unknown>;
} {
  switch (reason) {
    case "not_found":
      return { status: 404, body: { error: "카드 없음" } };
    case "not_verified":
      return { status: 400, body: { error: "승인되지 않은 명함" } };
    case "owner_not_premium":
      return {
        status: 403,
        body: {
          error:
            "내선·대표 명함 피드는 카드 소유자가 프리미엄(is_premium, DigitalCard 스냅샷)일 때만 사용할 수 있습니다.",
          code: "OWNER_PREMIUM_REQUIRED"
        }
      };
    default:
      return {
        status: 403,
        body: {
          error: "피드 작성 권한 없음 — 카드 소유자 또는 MANAGER 멤버만 가능합니다.",
          code: "FEED_FORBIDDEN"
        }
      };
  }
}

/** 본문 파싱 + cardGate(assertCardFeedWriteAccess) — POST /posts 전용 */
async function requireFeedPostWriteGate(c: Context, next: Next) {
  const me = c.get("vlueUserId") as string | undefined;
  if (!me) return c.json({ error: "인증이 필요합니다." }, 401);

  const body = (await c.req.json().catch(() => ({}))) as {
    cardId?: string;
    title?: string;
    body?: string;
    expiresAt?: string;
  };
  c.set("feedPostJson", body);

  const cardId = body.cardId?.trim();
  const text = String(body.body || "").trim();
  if (!cardId || !text) return c.json({ error: "cardId, body 필요" }, 400);

  const auth = await assertCardFeedWriteAccess(me, cardId);
  if (!auth.ok) {
    const { status: st, body: errBody } = jsonFeedWriteDenied(auth.reason);
    return c.json(errBody, st);
  }
  await next();
}

/** §7 — card_id 기준 피드 조회 — 공개 본문, 작성자 메타는 멤버에게만 */
feedRoutes.get("/posts", async (c) => {
  const cardId = c.req.query("cardId")?.trim();
  if (!cardId) return c.json({ error: "cardId 필요" }, 400);

  await cleanupExpiredFeedPosts(cardId);

  const viewerId = (await resolveRequestUserId(c)) ?? null;
  let memberView = false;
  if (viewerId) {
    const actor = await cardActor(viewerId, cardId);
    memberView = actor !== "none";
  }

  const rows = await prisma.cardFeedPost.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { id: true, publicHandle: true, nickFeed: true } }
    }
  });

  return c.json({
    posts: rows.map((p: (typeof rows)[number]) => {
      const publicFields = {
        id: p.id,
        cardId: p.cardId,
        title: p.title,
        body: p.body,
        createdAt: p.createdAt.toISOString()
      };
      if (!memberView) return publicFields;
      return {
        ...publicFields,
        metaJson: p.metaJson,
        authorUserId: p.authorUserId,
        authorHandle: p.author.publicHandle,
        authorNickFeed: p.author.nickFeed
      };
    })
  });
});

/** §7 — cardGate: 소유자/MANAGER + 내선·대표 시 소유자 프리미엄 */
feedRoutes.post("/posts", requireUserHeader, requireFeedPostWriteGate, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = c.get("feedPostJson") as { cardId: string; title?: string; body?: string; expiresAt?: string };
  const cardId = body.cardId!.trim();
  const text = String(body.body || "").trim();
  const expiresAtRaw = typeof body.expiresAt === "string" ? body.expiresAt.trim() : "";
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return c.json({ error: "expiresAt 형식이 올바르지 않습니다." }, 400);
  }
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return c.json({ error: "이미 만료된 시간입니다." }, 400);
  }

  const post = await prisma.cardFeedPost.create({
    data: {
      cardId,
      authorUserId: me,
      title: body.title?.trim() || null,
      body: text,
      metaJson: {
        internalAuthorUserId: me,
        expiresAt: expiresAt ? expiresAt.toISOString() : null
      }
    }
  });

  const tags = extractHashtagsFromBody(text);
  if (tags.length > 0) {
    await prisma.feedPostHashtag.createMany({
      data: tags.map((tag) => ({ postId: post.id, tag })),
      skipDuplicates: true
    });
  }

  return c.json({
    id: post.id,
    cardId: post.cardId,
    authorUserId: post.authorUserId,
    createdAt: post.createdAt.toISOString()
  });
});

feedRoutes.delete("/posts/:postId", requireUserHeader, async (c) => {
  await cleanupExpiredFeedPosts();
  const me = c.get("vlueUserId")!;
  const postId = c.req.param("postId");
  if (!postId) return c.json({ error: "bad request" }, 400);

  const post = await prisma.cardFeedPost.findUnique({ where: { id: postId } });
  if (!post) return c.json({ error: "not found" }, 404);

  const auth = await assertCardFeedWriteAccess(me, post.cardId);
  if (!auth.ok) {
    const { status: st, body } = jsonFeedWriteDenied(auth.reason);
    return c.json(body, st);
  }

  await prisma.cardFeedPost.delete({ where: { id: postId } });
  return c.json({ ok: true });
});

/** 해시태그 피드 검색 — 모드(개인/직장내선)별 카드 스코프 내에서만 */
feedRoutes.get("/search", async (c) => {
  await cleanupExpiredFeedPosts();
  const tagRaw = c.req.query("tag")?.trim();
  if (!tagRaw) return c.json({ error: "tag 쿼리 파라미터가 필요합니다." }, 400);

  const tag = normalizeFeedTag(tagRaw);
  if (!tag) return c.json({ error: "유효한 해시태그가 아닙니다." }, 400);

  const viewerId = await resolveRequestUserId(c);
  if (!viewerId) return c.json({ error: "인증이 필요합니다." }, 401);

  const modeHeader = (c.req.header("X-VLUE-App-Mode") || "personal").toLowerCase();
  const mode: FeedAppMode = modeHeader === "office" ? "office" : "personal";
  const activeCard = c.req.header("X-VLUE-Active-Card-Id")?.trim() || null;

  const scope = await resolveScopedCardForViewer(viewerId, mode, activeCard);
  if (!scope.ok) {
    return c.json({ error: scope.error, tag, posts: [], scope: mode }, scope.status);
  }

  const memberView = (await cardActor(viewerId, scope.cardId)) !== "none";

  const rows = await prisma.feedPostHashtag.findMany({
    where: {
      tag,
      post: { cardId: scope.cardId }
    },
    orderBy: { post: { createdAt: "desc" } },
    take: 80,
    include: {
      post: {
        include: {
          author: { select: { id: true, publicHandle: true, nickFeed: true } }
        }
      }
    }
  });

  const posts = rows.map((r) => {
    const p = r.post;
    const publicFields = {
      id: p.id,
      cardId: p.cardId,
      title: p.title,
      body: p.body,
      createdAt: p.createdAt.toISOString()
    };
    if (!memberView) return publicFields;
    return {
      ...publicFields,
      metaJson: p.metaJson,
      authorUserId: p.authorUserId,
      authorHandle: p.author.publicHandle,
      authorNickFeed: p.author.nickFeed
    };
  });

  return c.json({
    tag,
    scope: mode,
    cardId: scope.cardId,
    posts
  });
});
