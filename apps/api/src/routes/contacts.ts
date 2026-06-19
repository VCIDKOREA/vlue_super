import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";

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

  return c.json({
    id: created.id,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  });
});
