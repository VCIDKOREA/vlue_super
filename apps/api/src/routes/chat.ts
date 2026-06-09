import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { userIsStrictPremium } from "../middleware/cardGate.js";
import { publishChatMessageSse } from "../services/chat/chatRealtime.js";
import { gateChatAccess } from "../middleware/membershipFeatureGate.js";

async function assertOptionalSenderCard(userId: string, senderCardId: string | null | undefined) {
  if (!senderCardId) return;
  const card = await prisma.businessCard.findUnique({ where: { id: senderCardId } });
  if (!card) throw new Error("sender_card_not_found");
  if (card.kind === "extension" || card.kind === "rep_number") {
    if (!(await userIsStrictPremium(card.userId))) {
      throw new Error("line_card_owner_not_premium");
    }
  }
  if (card.userId === userId) return;
  const mem = await prisma.cardMember.findFirst({ where: { cardId: card.id, userId } });
  if (!mem) throw new Error("sender_card_forbidden");
}

function orderedParticipants(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

async function mutualBlockSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true }
  });
  const set = new Set<string>();
  for (const r of rows) {
    const other = r.blockerId === userId ? r.blockedId : r.blockerId;
    set.add(other);
  }
  return set;
}

async function assertNotBlocked(a: string, b: string): Promise<void> {
  const hit = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a }
      ]
    },
    select: { blockerId: true }
  });
  if (hit) throw new Error("blocked");
}

export const chatRoutes = new Hono();

chatRoutes.get("/peers", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  const excluded = await mutualBlockSet(me);
  excluded.add(me);

  const users = await prisma.user.findMany({
    where: { id: { notIn: [...excluded] } },
    select: { id: true, legalName: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  return c.json({
    users: users.map((u) => ({
      id: u.id,
      displayName: u.legalName?.trim() || u.email?.trim() || "회원",
      email: u.email
    }))
  });
});

chatRoutes.post("/blocks", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  let body: { blockedUserId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  const blockedId = body.blockedUserId?.trim();
  if (!blockedId || blockedId === me) return c.json({ error: "blockedUserId 필요" }, 400);

  const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!target) return c.json({ error: "user not found" }, 404);

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: me, blockedId } },
    create: { blockerId: me, blockedId },
    update: {}
  });
  return c.json({ ok: true });
});

chatRoutes.delete("/blocks/:blockedUserId", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const blockedId = c.req.param("blockedUserId")?.trim();
  if (!blockedId) return c.json({ error: "blockedUserId 필요" }, 400);

  await prisma.userBlock.deleteMany({ where: { blockerId: me, blockedId } });
  return c.json({ ok: true });
});

chatRoutes.get("/blocks", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  const rows = await prisma.userBlock.findMany({
    where: { blockerId: me },
    select: {
      blockedId: true,
      createdAt: true,
      blocked: { select: { id: true, legalName: true } }
    }
  });
  return c.json({
    blockedUserIds: rows.map((r) => r.blockedId),
    items: rows.map((r) => ({
      userId: r.blockedId,
      displayName: r.blocked.legalName?.trim() || "회원",
      createdAt: r.createdAt.toISOString()
    }))
  });
});

chatRoutes.post("/rooms/open", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const gate = await gateChatAccess(c, me);
  if (gate) return gate;

  let body: { peerId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const peerId = body.peerId?.trim();
  if (!peerId) return c.json({ error: "peerId required" }, 400);
  if (peerId === me) return c.json({ error: "cannot open room with self" }, 400);

  try {
    await assertNotBlocked(me, peerId);
  } catch (e) {
    if (e instanceof Error && e.message === "blocked") {
      return c.json({ error: "차단된 사용자와는 대화할 수 없습니다.", code: "BLOCKED" }, 403);
    }
    throw e;
  }

  const peer = await prisma.user.findUnique({ where: { id: peerId }, select: { id: true } });
  if (!peer) return c.json({ error: "peer not found" }, 404);

  const { low, high } = orderedParticipants(me, peerId);

  const existing = await prisma.chatRoom.findFirst({
    where: { participantLow: low, participantHigh: high }
  });
  if (existing) return c.json({ roomId: existing.id });

  const room = await prisma.chatRoom.create({
    data: { participantLow: low, participantHigh: high }
  });
  return c.json({ roomId: room.id });
});

chatRoutes.get("/rooms/:roomId/messages", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const roomId = c.req.param("roomId");

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || (room.participantLow !== me && room.participantHigh !== me)) {
    return c.json({ error: "forbidden" }, 403);
  }

  const peerId = room.participantLow === me ? room.participantHigh : room.participantLow;

  const sinceRaw = c.req.query("since")?.trim();
  const afterId = c.req.query("after")?.trim();

  let afterTime: Date | null = null;
  if (afterId) {
    const anchor = await prisma.chatMessage.findFirst({
      where: { id: afterId, roomId },
      select: { createdAt: true }
    });
    if (anchor) afterTime = anchor.createdAt;
  } else if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (!Number.isNaN(d.getTime())) afterTime = d;
  }

  const rows = await prisma.chatMessage.findMany({
    where: {
      roomId,
      ...(afterTime ? { createdAt: { gt: afterTime } } : {})
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: { sender: { select: { id: true, legalName: true } } }
  });

  const readRows = await prisma.chatReadState.findMany({
    where: { roomId, userId: { in: [me, peerId] } }
  });
  const readMine = readRows.find((r) => r.userId === me);
  const readPeer = readRows.find((r) => r.userId === peerId);

  /** 상대방 last_read_message 시각 기준으로 읽음 여부 플래그 */
  let peerReadCutoff: Date | null = null;
  if (readPeer?.lastReadMessageId) {
    const mrow = await prisma.chatMessage.findFirst({
      where: { id: readPeer.lastReadMessageId },
      select: { createdAt: true }
    });
    peerReadCutoff = mrow?.createdAt ?? readPeer.lastReadAt ?? null;
  } else if (readPeer?.lastReadAt) {
    peerReadCutoff = readPeer.lastReadAt;
  }

  const messages = rows.map((m) => ({
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    senderCardId: m.senderCardId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt.toISOString(),
    senderName: m.sender?.legalName?.trim() || null,
    readByPeer: peerReadCutoff != null ? m.createdAt <= peerReadCutoff : false
  }));

  return c.json({
    messages,
    readStates: {
      self: readMine
        ? {
            lastReadMessageId: readMine.lastReadMessageId,
            lastReadAt: readMine.lastReadAt?.toISOString() ?? null
          }
        : null,
      peer: readPeer
        ? {
            lastReadMessageId: readPeer.lastReadMessageId,
            lastReadAt: readPeer.lastReadAt?.toISOString() ?? null
          }
        : null
    },
    ...(afterTime ? { resyncAnchor: afterTime.toISOString() } : {})
  });
});

chatRoutes.post("/rooms/:roomId/read", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const roomId = c.req.param("roomId");

  let body: { lastReadMessageId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  const mid = body.lastReadMessageId?.trim();
  if (!mid) return c.json({ error: "lastReadMessageId required" }, 400);

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || (room.participantLow !== me && room.participantHigh !== me)) {
    return c.json({ error: "forbidden" }, 403);
  }

  const msg = await prisma.chatMessage.findFirst({
    where: { id: mid, roomId },
    select: { createdAt: true }
  });
  if (!msg) return c.json({ error: "message not found" }, 404);

  const now = new Date();
  await prisma.chatReadState.upsert({
    where: { roomId_userId: { roomId, userId: me } },
    create: { roomId, userId: me, lastReadMessageId: mid, lastReadAt: now },
    update: {
      lastReadMessageId: mid,
      lastReadAt: now
    }
  });

  return c.json({
    ok: true,
    readState: { lastReadMessageId: mid, lastReadAt: now.toISOString() }
  });
});

chatRoutes.post("/rooms/:roomId/messages", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const gate = await gateChatAccess(c, me);
  if (gate) return gate;
  const roomId = c.req.param("roomId");

  let body: { content?: string; messageType?: "normal" | "system"; senderCardId?: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const content = body.content?.trim();
  if (!content) return c.json({ error: "content required" }, 400);

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || (room.participantLow !== me && room.participantHigh !== me)) {
    return c.json({ error: "forbidden" }, 403);
  }

  const peerId = room.participantLow === me ? room.participantHigh : room.participantLow;

  try {
    await assertNotBlocked(me, peerId);
  } catch (e) {
    if (e instanceof Error && e.message === "blocked") {
      return c.json({ error: "차단 관계에서는 메시지를 보낼 수 없습니다.", code: "BLOCKED" }, 403);
    }
    throw e;
  }

  const isSystem = body.messageType === "system";
  const senderCardId = typeof body.senderCardId === "string" && body.senderCardId.trim() ? body.senderCardId.trim() : null;
  if (!isSystem && senderCardId) {
    try {
      await assertOptionalSenderCard(me, senderCardId);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "sender_card_not_found") return c.json({ error: "명함을 찾을 수 없습니다." }, 400);
      if (code === "line_card_owner_not_premium") {
        return c.json(
          {
            error: "내선·대표 명함으로 송신하려면 카드 소유자가 프리미엄(is_premium)이어야 합니다.",
            code: "OWNER_PREMIUM_REQUIRED"
          },
          403
        );
      }
      return c.json({ error: "해당 명함으로 송신할 권한이 없습니다." }, 403);
    }
  }

  const msg = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: isSystem ? null : me,
      senderCardId: isSystem ? null : senderCardId,
      content,
      messageType: isSystem ? "system" : "normal"
    }
  });

  if (!isSystem) {
    void import("../services/fraud/fraudAnalyzeService.js").then(({ analyzeChatMessage }) =>
      analyzeChatMessage({
        roomId,
        messageId: msg.id,
        senderId: me,
        content,
        peerUserId: peerId
      })
    );
  }

  const sender = isSystem
    ? null
    : await prisma.user.findUnique({ where: { id: me }, select: { legalName: true } });
  const payload = {
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderCardId: msg.senderCardId,
    content: msg.content,
    messageType: msg.messageType,
    createdAt: msg.createdAt.toISOString(),
    senderName: sender?.legalName?.trim() || null
  };
  publishChatMessageSse({
    serverRoomId: roomId,
    participantLow: room.participantLow,
    participantHigh: room.participantHigh,
    message: payload
  });

  return c.json({ message: payload });
});
