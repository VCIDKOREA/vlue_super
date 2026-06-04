import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";

/** `npx prisma generate` 후 제거 가능 — vouch_requests 마이그레이션 반영 시 PrismaClient에 vouchRequest 포함 */
const db = prisma as unknown as {
  vouchRequest: {
    findMany(args: object): Promise<VouchRow[]>;
    findFirst(args: object): Promise<{ id: string } | null>;
    findUnique(args: object): Promise<VouchFull | null>;
    create(args: object): Promise<{ id: string; status: string; createdAt: Date }>;
    update(args: object): Promise<unknown>;
  };
};

type VouchRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  note: string | null;
  status: string;
  createdAt: Date;
  fromUser: { legalName: string | null; email: string | null };
};

type VouchFull = VouchRow & {
  fromUser: { id: string; legalName: string | null; email: string | null };
  toUser: { id: string };
};

function orderedPair(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

export const vouchRoutes = new Hono();

vouchRoutes.get("/inbox", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  const rows = await db.vouchRequest.findMany({
    where: { toUserId: me, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      fromUser: { select: { id: true, legalName: true, email: true } }
    }
  });

  return c.json({
    items: rows.map((r: VouchRow) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      fromName: r.fromUser.legalName?.trim() || r.fromUser.email?.split("@")[0] || "회원",
      note: r.note,
      status: r.status,
      createdAt: r.createdAt.toISOString()
    })),
    pendingCount: rows.length
  });
});

vouchRoutes.post("/request", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);

  let body: { toUserId?: string; note?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }

  const toUserId = body.toUserId?.trim();
  if (!toUserId) return c.json({ error: "toUserId required" }, 400);
  if (toUserId === me) return c.json({ error: "cannot vouch self" }, 400);

  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) return c.json({ error: "user not found" }, 404);

  const dup = await db.vouchRequest.findFirst({
    where: { fromUserId: me, toUserId, status: "pending" }
  });
  if (dup) return c.json({ error: "already_pending", id: dup.id }, 409);

  const created = await db.vouchRequest.create({
    data: {
      fromUserId: me,
      toUserId,
      note: body.note?.trim() || null,
      status: "pending"
    }
  });

  return c.json({
    id: created.id,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  });
});

vouchRoutes.post("/:id/approve", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const id = c.req.param("id");

  const vouch = await db.vouchRequest.findUnique({
    where: { id },
    include: {
      fromUser: { select: { id: true, legalName: true, email: true } },
      toUser: { select: { id: true } }
    }
  });

  if (!vouch) return c.json({ error: "not found" }, 404);
  if (vouch.toUserId !== me) return c.json({ error: "forbidden" }, 403);
  if (vouch.status !== "pending") return c.json({ error: "not_pending", status: vouch.status }, 400);

  const fromName =
    vouch.fromUser.legalName?.trim() ||
    vouch.fromUser.email?.split("@")[0] ||
    "회원";
  const snapshot = fromName.slice(0, 120);

  const pair = orderedPair(vouch.fromUserId, vouch.toUserId);

  const { roomId } = await prisma.$transaction(async (tx) => {
    await (tx as unknown as { vouchRequest: { update(args: object): Promise<unknown> } }).vouchRequest.update({
      where: { id },
      data: { status: "approved" }
    });

    const existingFr = await tx.friendRequest.findFirst({
      where: { fromUserId: vouch.fromUserId, toUserId: vouch.toUserId }
    });

    if (existingFr) {
      await tx.friendRequest.update({
        where: { id: existingFr.id },
        data: { status: "accepted" }
      });
    } else {
      await tx.friendRequest.create({
        data: {
          fromUserId: vouch.fromUserId,
          toUserId: vouch.toUserId,
          applicantLegalNameSnapshot: snapshot,
          isApplicantBusiness: false,
          purposeChecklist: ["vouch"],
          purposeText: "VLUE 신뢰 인증",
          status: "accepted"
        }
      });
    }

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
        content: "VLUE 신뢰 인증이 완료되어 대화를 시작할 수 있습니다.",
        messageType: "system"
      }
    });

    return { roomId: room.id };
  });

  return c.json({
    ok: true,
    chatRoomId: roomId,
    friendUserId: vouch.fromUserId,
    friendName: fromName
  });
});

vouchRoutes.post("/:id/reject", async (c) => {
  const me = await resolveRequestUserId(c);
  if (!me) return c.json({ error: "인증 필요" }, 401);
  const id = c.req.param("id");

  const vouch = await db.vouchRequest.findUnique({ where: { id } });
  if (!vouch) return c.json({ error: "not found" }, 404);
  if (vouch.toUserId !== me) return c.json({ error: "forbidden" }, 403);
  if (vouch.status !== "pending") return c.json({ error: "not_pending" }, 400);

  await db.vouchRequest.update({
    where: { id },
    data: { status: "rejected" }
  });

  return c.json({ ok: true });
});
