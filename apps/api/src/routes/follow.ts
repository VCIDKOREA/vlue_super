import { Hono } from "hono";
import { resolveRequestUserId } from "../lib/authContext.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  acceptFollowRequest,
  getFollowCounts,
  getFollowSettings,
  getFollowState,
  getProfileForViewer,
  listFollowers,
  listFollowing,
  listPendingFollowInbox,
  rejectFollowRequest,
  toggleFollow,
  updateFollowSettings
} from "../services/follow/followService.js";

export const followRoutes = new Hono();

/** 팔로우 토글 — 즉시 active 또는 pending(승인제) */
followRoutes.post("/toggle", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  let body: { targetUserId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const targetUserId = String(body.targetUserId || "").trim();
  if (!targetUserId) return c.json({ error: "targetUserId required" }, 400);

  const result = await toggleFollow(me, targetUserId);
  if (!result.ok) {
    return c.json({ error: result.error }, result.status as 400 | 403 | 404 | 409);
  }

  return c.json({
    ok: true,
    action: result.action,
    follow: {
      id: result.follow.id,
      status: result.follow.status,
      followerId: result.follow.followerId,
      followingId: result.follow.followingId,
      updatedAt: result.follow.updatedAt.toISOString()
    },
    state: result.state
  });
});

/** 특정 유저와의 팔로우 관계·카운트 */
followRoutes.get("/state/:targetUserId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const targetUserId = String(c.req.param("targetUserId") || "").trim();
  if (!targetUserId) return c.json({ error: "targetUserId required" }, 400);

  const state = await getFollowState(viewerId, targetUserId);
  if (!state) return c.json({ error: "user_not_found" }, 404);
  return c.json({ ok: true, state });
});

/** 팔로워 목록 */
followRoutes.get("/followers/:userId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const userId = String(c.req.param("userId") || "").trim();
  const limit = Number(c.req.query("limit") || 50);
  const cursor = c.req.query("cursor") || undefined;

  const data = await listFollowers(userId, viewerId, limit, cursor);
  const counts = await getFollowCounts(userId);
  return c.json({ ok: true, ...data, counts });
});

/** 팔로잉 목록 */
followRoutes.get("/following/:userId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const userId = String(c.req.param("userId") || "").trim();
  const limit = Number(c.req.query("limit") || 50);
  const cursor = c.req.query("cursor") || undefined;

  const data = await listFollowing(userId, viewerId, limit, cursor);
  const counts = await getFollowCounts(userId);
  return c.json({ ok: true, ...data, counts });
});

/** 팔로워/팔로잉 수만 조회 */
followRoutes.get("/counts/:userId", async (c) => {
  const userId = String(c.req.param("userId") || "").trim();
  const counts = await getFollowCounts(userId);
  return c.json({ ok: true, counts });
});

/** 대기 중 팔로우 요청 수신함 */
followRoutes.get("/requests/inbox", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const items = await listPendingFollowInbox(me);
  return c.json({ ok: true, items, pendingCount: items.length });
});

/** 팔로우 요청 승인 */
followRoutes.post("/requests/:id/accept", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const followId = String(c.req.param("id") || "").trim();
  const result = await acceptFollowRequest(me, followId);
  if (!result.ok) return c.json({ error: result.error }, result.status as 403 | 404 | 409);
  return c.json({
    ok: true,
    follow: {
      id: result.follow.id,
      status: result.follow.status,
      followerId: result.follow.followerId,
      followingId: result.follow.followingId
    },
    state: result.state
  });
});

/** 팔로우 요청 거절 */
followRoutes.post("/requests/:id/reject", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const followId = String(c.req.param("id") || "").trim();
  const result = await rejectFollowRequest(me, followId);
  if (!result.ok) return c.json({ error: result.error }, result.status as 404 | 409);
  return c.json({
    ok: true,
    follow: {
      id: result.follow.id,
      status: result.follow.status
    }
  });
});

/** 팔로우·쇼케이스 공개 설정 조회 */
followRoutes.get("/settings", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const settings = await getFollowSettings(me);
  return c.json({ ok: true, settings });
});

/** 팔로우·쇼케이스 공개 설정 저장 */
followRoutes.put("/settings", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const settings = await updateFollowSettings(me, {
    isPrivateFollow: typeof body.isPrivateFollow === "boolean" ? body.isPrivateFollow : undefined,
    isShowcasePrivate: typeof body.isShowcasePrivate === "boolean" ? body.isShowcasePrivate : undefined,
    isPhoneFollowersAllowed:
      typeof body.isPhoneFollowersAllowed === "boolean" ? body.isPhoneFollowersAllowed : undefined,
    isNameFollowersAllowed:
      typeof body.isNameFollowersAllowed === "boolean" ? body.isNameFollowersAllowed : undefined,
    isOrgFollowersAllowed:
      typeof body.isOrgFollowersAllowed === "boolean" ? body.isOrgFollowersAllowed : undefined,
    isIdFollowersAllowed:
      typeof body.isIdFollowersAllowed === "boolean" ? body.isIdFollowersAllowed : undefined
  });

  return c.json({ ok: true, settings });
});

/** @handle → 유저 조회 (댓글 멘션) */
followRoutes.get("/handle/:handle", async (c) => {
  const raw = String(c.req.param("handle") || "")
    .replace(/^@+/, "")
    .trim();
  if (!raw) return c.json({ ok: false, error: "handle required" }, 400);

  const { prisma } = await import("../db/client.js");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { publicHandle: raw },
        { publicHandle: raw.toLowerCase() },
        { publicHandle: { equals: raw, mode: "insensitive" } }
      ],
      status: "ACTIVE"
    },
    select: { id: true, publicHandle: true, legalName: true }
  });
  if (!user) return c.json({ ok: false, error: "user_not_found" }, 404);
  return c.json({
    ok: true,
    user: {
      id: user.id,
      handle: user.publicHandle || "",
      name: user.legalName || user.publicHandle || ""
    }
  });
});

/** 접근 제어가 적용된 프로필·쇼케이스 조회 */
followRoutes.get("/profile/:userId", async (c) => {
  const viewerId = await resolveRequestUserId(c);
  const targetUserId = String(c.req.param("userId") || "").trim();
  const payload = await getProfileForViewer(viewerId, targetUserId);
  if (!payload) return c.json({ error: "user_not_found" }, 404);
  return c.json({ ok: true, ...payload });
});
