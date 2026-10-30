import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { normalizeToE164KR, phoneMatchVariants } from "../lib/phoneE164.js";
import { ssePublish } from "../realtime/sseHub.js";
import { sendShowcaseSocialPushToUser } from "../services/fcmNotificationService.js";

const MAX_CONTACTS = 2000;

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

  const truncated = Array.isArray(body.contacts) && body.contacts.length > MAX_CONTACTS;
  const raw = Array.isArray(body.contacts) ? body.contacts.slice(0, MAX_CONTACTS) : [];
  const entries: { name: string; phoneE164: string; variants: string[] }[] = [];
  const seen = new Set<string>();
  const allVariants = new Set<string>();

  for (const row of raw) {
    const phoneRaw = String(row.phone || "");
    const phoneE164 = normalizeToE164KR(phoneRaw);
    if (!phoneE164 || seen.has(phoneE164)) continue;
    seen.add(phoneE164);
    const variants = phoneMatchVariants(phoneRaw);
    variants.forEach((v) => allVariants.add(v));
    entries.push({
      name: String(row.name || "").trim() || "연락처",
      phoneE164,
      variants
    });
  }

  if (!entries.length) {
    return c.json({
      registered: [],
      unregistered: [],
      matchedCount: 0,
      scannedCount: raw.length,
      truncated: Boolean(truncated)
    });
  }

  const users = await prisma.user.findMany({
    where: { phoneE164: { in: [...allVariants] } },
    select: {
      id: true,
      phoneE164: true,
      legalName: true,
      publicHandle: true,
      vlueProfileNickname: true,
      email: true
    }
  });

  const userByVariant = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    if (!u.phoneE164) continue;
    for (const v of phoneMatchVariants(u.phoneE164)) {
      if (!userByVariant.has(v)) userByVariant.set(v, u);
    }
  }

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
    phoneDisplay: string;
    userId: string;
    displayName: string;
    publicHandle: string | null;
    nickname: string | null;
    isFriend: boolean;
    friendStatus: "none" | "pending" | "accepted" | "received";
    friendRequestPending: "sent" | "received" | null;
  }> = [];
  const unregistered: Array<{
    contactName: string;
    phoneE164: string;
    phoneDisplay: string;
  }> = [];

  for (const entry of entries) {
    let user: (typeof users)[number] | undefined;
    for (const v of entry.variants) {
      user = userByVariant.get(v);
      if (user) break;
    }
    if (user && user.id !== me) {
      const isFriend = friendIds.has(user.id);
      const pending = pendingSent.has(user.id)
        ? ("sent" as const)
        : pendingReceived.has(user.id)
          ? ("received" as const)
          : null;
      registered.push({
        contactName: entry.name,
        phoneE164: entry.phoneE164,
        phoneDisplay: displayKRPhone(entry.phoneE164),
        userId: user.id,
        displayName:
          user.vlueProfileNickname?.trim() ||
          userDisplayName(user),
        publicHandle: user.publicHandle,
        nickname: user.vlueProfileNickname || null,
        isFriend,
        friendStatus: isFriend
          ? "accepted"
          : pending === "sent"
            ? "pending"
            : pending === "received"
              ? "received"
              : "none",
        friendRequestPending: pending
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
    matchedCount: registered.length + unregistered.length,
    scannedCount: raw.length,
    truncated: Boolean(truncated)
  });
});

/** 서로 신청 알림이 꼬이지 않게 — 특정 actor→owner 의「친구 신청」알림 제거 */
async function purgeFriendRequestNotices(ownerUserId: string, actorUserId: string) {
  try {
    await prisma.ownerNotification.deleteMany({
      where: {
        ownerUserId,
        actorUserId,
        title: { contains: "친구 신청" }
      }
    });
  } catch (err) {
    console.warn("[contacts] purgeFriendRequestNotices_failed", err);
  }
}

async function deliverFriendNotice(opts: {
  ownerUserId: string;
  actorUserId: string;
  title: string;
  body: string;
  sseType: "vlue-friend-request" | "vlue-friend-accepted" | "vlue-friend-rejected";
  requestId: string;
  actorName: string;
}) {
  let notificationId = "";
  try {
    const row = await prisma.ownerNotification.create({
      data: {
        ownerUserId: opts.ownerUserId,
        actorUserId: opts.actorUserId,
        title: opts.title,
        body: opts.body,
        payloadJson: {
          type: opts.sseType,
          requestId: opts.requestId,
          actorUserId: opts.actorUserId,
          actorName: opts.actorName
        }
      }
    });
    notificationId = row.id;
  } catch (err) {
    console.warn("[contacts] friend ownerNotification_failed", err);
  }
  const payload = {
    type: opts.sseType,
    title: opts.title,
    body: opts.body,
    message: opts.body,
    actorUserId: opts.actorUserId,
    actorName: opts.actorName,
    requestId: opts.requestId,
    notificationId,
    at: new Date().toISOString()
  };
  try {
    ssePublish(opts.ownerUserId, payload);
  } catch (err) {
    console.warn("[contacts] friend sse_failed", err);
  }
  void sendShowcaseSocialPushToUser(opts.ownerUserId, opts.title, opts.body, {
    type: opts.sseType,
    actorUserId: opts.actorUserId,
    actorName: opts.actorName,
    requestId: opts.requestId,
    notificationId
  }).catch((err) => {
    console.warn("[contacts] friend fcm_failed", err);
  });
  return notificationId;
}

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

  /* 상대가 이미 나한테 신청한 상태 → 즉시 상호 수락 (신청+수락 알림 꼬임 방지) */
  const reversePending = await prisma.friendRequest.findFirst({
    where: {
      fromUserId: toUserId,
      toUserId: me,
      status: "pending"
    },
    include: {
      fromUser: { select: { id: true, legalName: true, publicHandle: true, email: true } }
    }
  });

  if (reversePending) {
    const pair = orderedPair(me, toUserId);
    const peerName =
      reversePending.applicantLegalNameSnapshot || userDisplayName(reversePending.fromUser);
    const { roomId } = await prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: reversePending.id },
        data: { status: "accepted" }
      });
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { fromUserId: me, toUserId, status: "pending" },
            { fromUserId: toUserId, toUserId: me, status: "pending" }
          ]
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

    await purgeFriendRequestNotices(me, toUserId);
    await purgeFriendRequestNotices(toUserId, me);

    const connectedTitle = "친구 수락";
    await deliverFriendNotice({
      ownerUserId: me,
      actorUserId: toUserId,
      title: connectedTitle,
      body: `${peerName}님과 친구가 되었습니다.`,
      sseType: "vlue-friend-accepted",
      requestId: reversePending.id,
      actorName: peerName
    });
    await deliverFriendNotice({
      ownerUserId: toUserId,
      actorUserId: me,
      title: connectedTitle,
      body: `${snapshot}님과 친구가 되었습니다.`,
      sseType: "vlue-friend-accepted",
      requestId: reversePending.id,
      actorName: snapshot
    });

    return c.json({
      id: reversePending.id,
      status: "accepted",
      autoAccepted: true,
      roomId,
      createdAt: reversePending.createdAt.toISOString()
    });
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

  /* 수신자(to)에게만「신청 수신」— 보낸 사람(me)에게는 보내지 않음 */
  await deliverFriendNotice({
    ownerUserId: toUserId,
    actorUserId: me,
    title: "친구 신청",
    body: `${snapshot}님이 친구 신청을 보냈습니다.`,
    sseType: "vlue-friend-request",
    requestId: created.id,
    actorName: snapshot
  });

  return c.json({
    id: created.id,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  });
});

/** 보낸/받은 친구 신청 목록 (FriendRequest) + 수락된 친구 userId */
contactRoutes.get("/friend-requests", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  const [pendingRows, sentHistory, acceptedRows] = await Promise.all([
    prisma.friendRequest.findMany({
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
        updatedAt: true,
        fromUser: {
          select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
        },
        toUser: {
          select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
        }
      }
    }),
    /* 보낸 쪽: pending + 최근 accepted/rejected 상태 피드백 */
    prisma.friendRequest.findMany({
      where: {
        fromUserId: me,
        status: { in: ["pending", "accepted", "rejected"] }
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        status: true,
        purposeText: true,
        applicantLegalNameSnapshot: true,
        createdAt: true,
        updatedAt: true,
        fromUser: {
          select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
        },
        toUser: {
          select: { id: true, legalName: true, publicHandle: true, email: true, phoneE164: true }
        }
      }
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "accepted",
        OR: [{ fromUserId: me }, { toUserId: me }]
      },
      select: { fromUserId: true, toUserId: true },
      take: 2000
    })
  ]);

  const mapRow = (
    fr: (typeof pendingRows)[number],
    direction: "sent" | "received"
  ) => {
    const peer = direction === "sent" ? fr.toUser : fr.fromUser;
    const statusLabel =
      fr.status === "accepted"
        ? "수락됨"
        : fr.status === "rejected"
          ? "거절됨"
          : fr.status === "pending"
            ? "신청 완료 (대기 중)"
            : fr.status;
    return {
      id: fr.id,
      status: fr.status,
      statusLabel,
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
      createdAt: fr.createdAt.toISOString(),
      updatedAt: fr.updatedAt?.toISOString?.() || fr.createdAt.toISOString()
    };
  };

  const sent = sentHistory.map((r) => mapRow(r, "sent"));
  const received = pendingRows
    .filter((r) => r.toUserId === me)
    .map((r) => mapRow(r, "received"));
  const acceptedFriendIds = [
    ...new Set(
      acceptedRows.map((r) => (r.fromUserId === me ? r.toUserId : r.fromUserId)).filter(Boolean)
    )
  ];

  return c.json({ ok: true, sent, received, acceptedFriendIds });
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

  /* 반대방향 잔여「신청」알림 제거 — 보낸 사람에게 신청+수락이 동시에 남지 않게 */
  await purgeFriendRequestNotices(fr.fromUserId, me);
  await purgeFriendRequestNotices(me, fr.fromUserId);

  /* 원래 신청한 사람(from)에게만 수락 알림 — 수락한 본인(me)에게는 보내지 않음 */
  await deliverFriendNotice({
    ownerUserId: fr.fromUserId,
    actorUserId: me,
    title,
    body: notifyBody,
    sseType: "vlue-friend-accepted",
    requestId: id,
    actorName: accepterName
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

  const meUser = await prisma.user.findUnique({
    where: { id: me },
    select: { legalName: true, publicHandle: true, email: true }
  });
  const rejecterName = userDisplayName(
    meUser || { legalName: null, publicHandle: null, email: null }
  );

  await prisma.friendRequest.update({
    where: { id },
    data: { status: "rejected" }
  });

  /* 신청자(from)에게 거절 상태 피드백 */
  await deliverFriendNotice({
    ownerUserId: fr.fromUserId,
    actorUserId: me,
    title: "친구 신청 거절",
    body: `${rejecterName}님이 친구 신청을 거절했습니다.`,
    sseType: "vlue-friend-rejected",
    requestId: id,
    actorName: rejecterName
  });

  return c.json({ ok: true, id, status: "rejected" });
});
