import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { ssePublish } from "../realtime/sseHub.js";
import { sendShowcaseSocialPushToUser } from "../services/fcmNotificationService.js";

const MAX_CONTACTS = 500;

function displayKRPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) {
    const local = `0${d.slice(2)}`;
    if (local.length === 11) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
    return local;
  }
  return e164;
}

function userDisplayName(u: {
  legalName: string | null;
  publicHandle: string | null;
  email: string | null;
}): string {
  return (
    u.legalName?.trim() ||
    u.publicHandle?.replace(/^@/, "") ||
    u.email?.split("@")[0] ||
    "VLUE 회원"
  );
}

export const contactRoutes = new Hono();

/** 연락처 동기화 동의 기록 (클라이언트 플래그 보조) */
contactRoutes.post("/consent", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  return c.json({ ok: true, userId: me, consentedAt: new Date().toISOString() });
});

/**
 * 주소록 번호 일괄 매칭 — VLUE 가입자 / 미가입자 분리
 * body: { contacts: [{ name?: string, phone?: string }] }
 */
contactRoutes.post("/match", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  let body: { contacts?: Array<{ name?: string; phone?: string }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const raw = Array.isArray(body.contacts) ? body.contacts.slice(0, MAX_CONTACTS) : [];
  const entries: { name: string; phoneE164: string }[] = [];
  const seen = new Set<string>();

  for (const row of raw) {
    const phoneE164 = normalizeToE164KR(String(row.phone || ""));
    if (!phoneE164 || seen.has(phoneE164)) continue;
    seen.add(phoneE164);
    entries.push({
      name: String(row.name || "").trim() || "연락처",
      phoneE164
    });
  }

  if (!entries.length) {
    return c.json({ registered: [], unregistered: [], matchedCount: 0 });
  }

  const phones = entries.map((e) => e.phoneE164);
  const users = await prisma.user.findMany({
    where: { phoneE164: { in: phones } },
    select: {
      id: true,
      phoneE164: true,
      legalName: true,
      publicHandle: true,
      email: true
    }
  });

  const userByPhone = new Map(
    users.filter((u) => u.phoneE164).map((u) => [u.phoneE164 as string, u])
  );

  const friendRows = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [{ fromUserId: me }, { toUserId: me }]
    },
    select: { fromUserId: true, toUserId: true }
  });
  const friendIds = new Set<string>();
  for (const fr of friendRows) {
    friendIds.add(fr.fromUserId === me ? fr.toUserId : fr.fromUserId);
  }

  const pendingRows = await prisma.friendRequest.findMany({
    where: {
      status: "pending",
      OR: [{ fromUserId: me }, { toUserId: me }]
    },
    select: { fromUserId: true, toUserId: true }
  });
  const pendingSent = new Set(pendingRows.filter((r) => r.fromUserId === me).map((r) => r.toUserId));
  const pendingReceived = new Set(pendingRows.filter((r) => r.toUserId === me).map((r) => r.fromUserId));

  const registered: Array<{
    contactName: string;
    phoneE164: string;
    userId: string;
    displayName: string;
    publicHandle: string | null;
    isFriend: boolean;
    friendRequestPending: "sent" | "received" | null;
  }> = [];
  const unregistered: Array<{
    contactName: string;
    phoneE164: string;
    phoneDisplay: string;
  }> = [];

  for (const entry of entries) {
    const user = userByPhone.get(entry.phoneE164);
    if (user && user.id !== me) {
      registered.push({
        contactName: entry.name,
        phoneE164: entry.phoneE164,
        userId: user.id,
        displayName: userDisplayName(user),
        publicHandle: user.publicHandle,
        isFriend: friendIds.has(user.id),
        friendRequestPending: pendingSent.has(user.id)
          ? "sent"
          : pendingReceived.has(user.id)
            ? "received"
            : null
      });
    } else if (!user) {
      unregistered.push({
        contactName: entry.name,
        phoneE164: entry.phoneE164,
        phoneDisplay: displayKRPhone(entry.phoneE164)
      });
    }
  }

  return c.json({
    registered,
    unregistered,
    matchedCount: registered.length + unregistered.length
  });
});

/** 주소록에서 발견한 VLUE 회원에게 친구 신청 */
contactRoutes.post("/friend-request", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  let body: { toUserId?: string; message?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const toUserId = body.toUserId?.trim();
  if (!toUserId) return c.json({ error: "toUserId required" }, 400);
  if (toUserId === me) return c.json({ error: "cannot request self" }, 400);

  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) return c.json({ error: "user not found" }, 404);

  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { legalName: true, email: true, publicHandle: true }
  });
  const snapshot = userDisplayName(meUser || { legalName: null, email: null, publicHandle: null }).slice(
    0,
    120
  );

  const existing = await prisma.friendRequest.findFirst({
    where: {
      fromUserId: me,
      toUserId,
      status: { in: ["pending", "accepted"] }
    }
  });
  if (existing) {
    return c.json(
      { error: existing.status === "accepted" ? "already_friend" : "already_pending", id: existing.id },
      409
    );
  }

  const created = await prisma.friendRequest.create({
    data: {
      fromUserId: me,
      toUserId,
      applicantLegalNameSnapshot: snapshot,
      isApplicantBusiness: false,
      purposeChecklist: ["networking", "mailtalk"],
      purposeText: body.message?.trim() || "주소록에서 친구 신청",
      status: "pending"
    }
  });

  /* 수신자 알림함(SSE+FCM) + OwnerNotification — 실패해도 신청 결과는 유지 */
  const title = "친구 신청";
  const bodyText = `${snapshot}님이 친구 신청을 보냈습니다.`;
  try {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId: toUserId,
        actorUserId: me,
        title,
        body: bodyText
      }
    });
  } catch (err) {
    console.warn("[contacts] friend_request ownerNotification_failed", err);
  }
  try {
    ssePublish(toUserId, {
      type: "vlue-friend-request",
      title,
      body: bodyText,
      message: bodyText,
      actorUserId: me,
      actorName: snapshot,
      requestId: created.id,
      at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[contacts] friend_request sse_failed", err);
  }
  void sendShowcaseSocialPushToUser(toUserId, title, bodyText, {
    type: "vlue-friend-request",
    actorUserId: me,
    actorName: snapshot,
    requestId: created.id
  }).catch((err) => {
    console.warn("[contacts] friend_request fcm_failed", err);
  });

  return c.json({
    id: created.id,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  });
});

/** 보낸/받은 친구 신청 목록 (FriendRequest) */
contactRoutes.get("/friend-requests", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  const rows = await prisma.friendRequest.findMany({
    where: {
      status: "pending",
      OR: [{ fromUserId: me }, { toUserId: me }]
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      status: true,
      purposeText: true,
      applicantLegalNameSnapshot: true,
      createdAt: true,
      fromUser: {
        select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
      },
      toUser: {
        select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
      }
    }
  });

  const mapRow = (fr: (typeof rows)[number], direction: "sent" | "received") => {
    const peer = direction === "sent" ? fr.toUser : fr.fromUser;
    return {
      id: fr.id,
      status: fr.status,
      direction,
      fromUserId: fr.fromUserId,
      toUserId: fr.toUserId,
      fromName:
        direction === "received"
          ? fr.applicantLegalNameSnapshot || userDisplayName(peer)
          : userDisplayName(fr.fromUser),
      toUserName: userDisplayName(fr.toUser),
      fromUserName: userDisplayName(fr.fromUser),
      peerName: userDisplayName(peer),
      peerHandle: peer.publicHandle,
      message: fr.purposeText || "",
      createdAt: fr.createdAt.toISOString()
    };
  };

  const sent = rows.filter((r) => r.fromUserId === me).map((r) => mapRow(r, "sent"));
  const received = rows.filter((r) => r.toUserId === me).map((r) => mapRow(r, "received"));

  return c.json({ ok: true, sent, received });
});

function orderedPair(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

/** 받은 친구 신청 수락 — FriendRequest accepted + 1:1 채팅방 확보 */
contactRoutes.post("/friend-requests/:id/accept", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const id = c.req.param("id");

  const fr = await prisma.friendRequest.findUnique({
    where: { id },
    include: {
      fromUser: { select: { id: true, legalName: true, publicHandle: true, email: true } }
    }
  });
  if (!fr) return c.json({ error: "not_found" }, 404);
  if (fr.toUserId !== me) return c.json({ error: "forbidden" }, 403);
  if (fr.status !== "pending") {
    return c.json({ error: "not_pending", status: fr.status }, 400);
  }

  const pair = orderedPair(fr.fromUserId, fr.toUserId);
  const fromName = fr.applicantLegalNameSnapshot || userDisplayName(fr.fromUser);

  const { roomId } = await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id },
      data: { status: "accepted" }
    });

    // 반대 방향 pending 있으면 정리
    await tx.friendRequest.updateMany({
      where: {
        fromUserId: me,
        toUserId: fr.fromUserId,
        status: "pending"
      },
      data: { status: "cancelled" }
    });

    let room = await tx.chatRoom.findFirst({
      where: { participantLow: pair.low, participantHigh: pair.high }
    });
    if (!room) {
      room = await tx.chatRoom.create({
        data: { participantLow: pair.low, participantHigh: pair.high }
      });
    }

    await tx.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: null,
        content: "친구가 되었습니다. 대화를 시작할 수 있습니다.",
        messageType: "system"
      }
    });

    return { roomId: room.id };
  });

  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { legalName: true, publicHandle: true, email: true }
  });
  const accepterName = userDisplayName(
    meUser || { legalName: null, publicHandle: null, email: null }
  );
  const title = "친구 수락";
  const notifyBody = `${accepterName}님이 친구 신청을 수락했습니다.`;

  try {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId: fr.fromUserId,
        actorUserId: me,
        title,
        body: notifyBody
      }
    });
  } catch (err) {
    console.warn("[contacts] friend_accept ownerNotification_failed", err);
  }
  try {
    ssePublish(fr.fromUserId, {
      type: "vlue-friend-accepted",
      title,
      body: notifyBody,
      message: notifyBody,
      actorUserId: me,
      actorName: accepterName,
      requestId: id,
      at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[contacts] friend_accept sse_failed", err);
  }
  void sendShowcaseSocialPushToUser(fr.fromUserId, title, notifyBody, {
    type: "vlue-friend-accepted",
    actorUserId: me,
    actorName: accepterName,
    requestId: id
  }).catch((err) => {
    console.warn("[contacts] friend_accept fcm_failed", err);
  });

  return c.json({
    ok: true,
    id,
    status: "accepted",
    roomId,
    fromUserId: fr.fromUserId,
    fromUserName: fromName
  });
});

/** 받은 친구 신청 거절 */
contactRoutes.post("/friend-requests/:id/reject", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const id = c.req.param("id");

  const fr = await prisma.friendRequest.findUnique({ where: { id } });
  if (!fr) return c.json({ error: "not_found" }, 404);
  if (fr.toUserId !== me) return c.json({ error: "forbidden" }, 403);
  if (fr.status !== "pending") {
    return c.json({ error: "not_pending", status: fr.status }, 400);
  }

  await prisma.friendRequest.update({
    where: { id },
    data: { status: "rejected" }
  });

  return c.json({ ok: true, id, status: "rejected" });
});
