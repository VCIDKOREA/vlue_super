import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { normalizeDesiredPublicHandle } from "../lib/publicHandle.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { ssePublish } from "../realtime/sseHub.js";
import { lookupCardByRawNumber } from "../services/cardLookup.js";
import {
  requireUserHeader,
  requirePremiumTier,
  requireCardOwner,
  requireCardOwnerOrMember,
  requireCardNotifyAccess
} from "../middleware/cardGate.js";
import {
  getTitleDeptStatusForUser,
  submitTitleDeptReview
} from "../services/bizcard/titleDeptReviewService.js";

export const cardsRoutes = new Hono();

async function jsonLookup(raw: string) {
  const result = await lookupCardByRawNumber(raw);
  return result;
}

/** 안드로이드 · §3 조회 API */
cardsRoutes.get("/lookup", async (c) => {
  try {
    const raw = String(c.req.query("number") ?? c.req.query("raw") ?? "").trim();
    const result = await jsonLookup(raw);
    return c.json(result.body, result.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return c.json({ error: msg, matched: false }, 500);
  }
});

/** 기존 호환 — 동일 로직 */
cardsRoutes.get("/by-number", async (c) => {
  try {
    const raw = String(c.req.query("number") ?? c.req.query("raw") ?? "").trim();
    const result = await jsonLookup(raw);
    return c.json(result.body, result.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return c.json({ error: msg, matched: false }, 500);
  }
});

/** §8 — 내 카드·멤버십 (인증만) */
cardsRoutes.get("/me-context", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;

  const owned = await prisma.businessCard.findMany({
    where: { userId: me },
    select: {
      id: true,
      kind: true,
      phoneE164: true,
      isPremiumLine: true,
      verificationStatus: true,
      displayName: true
    }
  });

  const memberships = await prisma.cardMember.findMany({
    where: { userId: me },
    include: {
      card: {
        select: {
          id: true,
          kind: true,
          isPremiumLine: true,
          verificationStatus: true,
          userId: true,
          displayName: true
        }
      }
    }
  });

  return c.json({
    owned: owned.map((o: (typeof owned)[number]) => ({
      ...o,
      is_verified: o.verificationStatus === "approved",
      is_premium_line: o.isPremiumLine
    })),
    memberships: memberships.map((m: (typeof memberships)[number]) => ({
      cardId: m.cardId,
      role: m.role,
      card: m.card
        ? {
            ...m.card,
            is_verified: m.card.verificationStatus === "approved",
            is_premium_line: m.card.isPremiumLine
          }
        : m.card
    })),
    epoch: Date.now()
  });
});

/**
 * 명함 확장 등록 — 내선/대표 · 저장 시 is_verified(false) = verification pending
 * POST /api/cards/register
 */
async function handleRegisterPremiumLine(c: import("hono").Context) {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    rawPhone?: string;
    raw_phone?: string;
  };
  const raw = String(body.rawPhone || body.raw_phone || "").trim();
  const e164 = normalizeToE164KR(raw);
  if (!e164) return c.json({ error: "번호 형식 오류" }, 400);

  const kind = body.kind === "rep_number" ? "rep_number" : "extension";

  const clash = await prisma.businessCard.findFirst({ where: { phoneE164: e164 }, select: { id: true } });
  if (clash) return c.json({ error: "이미 등록된 번호입니다." }, 409);

  const created = await prisma.businessCard.create({
    data: {
      userId: me,
      kind,
      phoneE164: e164,
      verificationStatus: "pending",
      isPremiumLine: true
    }
  });

  await prisma.verificationLog.create({
    data: {
      cardId: created.id,
      userId: me,
      action: "premium_line_register",
      outcome: "pending",
      detail: { note: "명의 검증 대기 — 승인 후 is_verified=true" }
    }
  });

  return c.json({
    cardId: created.id,
    is_verified: false,
    verificationStatus: created.verificationStatus,
    kind: created.kind,
    phoneE164: created.phoneE164,
    message: "등록 신청 완료 · 검증 전까지 is_verified 는 false 입니다."
  });
}

cardsRoutes.post("/register", requireUserHeader, requirePremiumTier, handleRegisterPremiumLine);

/** 하위 호환 — 동일 동작 */
cardsRoutes.post("/register-line", requireUserHeader, requirePremiumTier, handleRegisterPremiumLine);

/** Mock 승인 — 소유자만 */
cardsRoutes.post("/:cardId/mock-approve", requireUserHeader, requireCardOwner, async (c) => {
  const me = c.get("vlueUserId")!;
  const cardId = c.req.param("cardId");
  if (!cardId) return c.json({ error: "bad request" }, 400);

  await prisma.businessCard.update({
    where: { id: cardId },
    data: { verificationStatus: "approved" }
  });

  await prisma.verificationLog.create({
    data: {
      cardId,
      userId: me,
      action: "mock_approve",
      outcome: "approved",
      detail: { by: "owner_mock" }
    }
  });

  return c.json({ ok: true, cardId, is_verified: true, verificationStatus: "approved" });
});

cardsRoutes.get("/:cardId/members", requireUserHeader, requireCardOwnerOrMember, async (c) => {
  const cardId = c.req.param("cardId");
  if (!cardId) return c.json({ error: "bad request" }, 400);
  const card = await prisma.businessCard.findUnique({ where: { id: cardId } });
  if (!card) return c.json({ error: "not found" }, 404);

  const rows = await prisma.cardMember.findMany({
    where: { cardId },
    include: { user: { select: { id: true, publicHandle: true, legalName: true } } }
  });

  return c.json({
    ownerUserId: card.userId,
    members: rows.map((r: (typeof rows)[number]) => ({
      id: r.id,
      userId: r.userId,
      role: r.role,
      publicHandle: r.user.publicHandle,
      legalName: r.user.legalName
    }))
  });
});

/** Owner만 — ID(public_handle)로 멤버 추가·역할 설정 */
cardsRoutes.post("/:cardId/members", requireUserHeader, requireCardOwner, async (c) => {
  const cardId = c.req.param("cardId");
  if (!cardId) return c.json({ error: "bad request" }, 400);
  const card = await prisma.businessCard.findUnique({ where: { id: cardId } });
  if (!card) return c.json({ error: "카드 없음" }, 404);

  const body = (await c.req.json().catch(() => ({}))) as { loginId?: string; role?: string };
  const login = normalizeDesiredPublicHandle(body.loginId);
  if (!login) return c.json({ error: "loginId 필요" }, 400);
  const role = body.role === "MANAGER" ? "MANAGER" : "STAFF";

  const target = await prisma.user.findFirst({
    where: { publicHandle: login },
    select: { id: true }
  });
  if (!target) return c.json({ error: "해당 ID의 사용자를 찾을 수 없습니다." }, 404);
  if (target.id === card.userId) return c.json({ error: "소유자는 멤버 테이블에 넣지 않습니다." }, 400);

  await prisma.cardMember.upsert({
    where: { cardId_userId: { cardId, userId: target.id } },
    create: { cardId, userId: target.id, role },
    update: { role }
  });

  return c.json({ ok: true, userId: target.id, role });
});

cardsRoutes.delete("/:cardId/members/:userId", requireUserHeader, requireCardOwner, async (c) => {
  const cardId = c.req.param("cardId");
  const memberUserId = c.req.param("userId");
  if (!cardId || !memberUserId) return c.json({ error: "bad request" }, 400);

  const card = await prisma.businessCard.findUnique({ where: { id: cardId } });
  if (!card) return c.json({ error: "카드 없음" }, 404);
  if (memberUserId === card.userId) {
    return c.json({ error: "소유자는 삭제할 수 없습니다." }, 400);
  }

  await prisma.cardMember.deleteMany({ where: { cardId, userId: memberUserId } });

  ssePublish(memberUserId, {
    type: "vlue-card-access-revoked",
    cardId,
    reason: "membership_removed_by_owner"
  });

  return c.json({ ok: true, revokedUserId: memberUserId });
});

cardsRoutes.post("/:cardId/notify-inquiry", requireUserHeader, requireCardNotifyAccess, async (c) => {
  const me = c.get("vlueUserId")!;
  const cardId = c.req.param("cardId");
  if (!cardId) return c.json({ error: "bad request" }, 400);
  const card = await prisma.businessCard.findUnique({ where: { id: cardId } });
  if (!card) return c.json({ error: "not found" }, 404);

  const memberIds = await prisma.cardMember.findMany({
    where: { cardId },
    select: { userId: true }
  });
  const recipients = new Set<string>([
    card.userId,
    ...memberIds.map((m: (typeof memberIds)[number]) => m.userId)
  ]);

  await prisma.verificationLog.create({
    data: {
      cardId,
      userId: me,
      action: "inquiry_notify_broadcast",
      outcome: "info",
      detail: { recipientCount: recipients.size }
    }
  });

  const pushPayload = {
    type: "vlue-push-inquiry",
    cardId,
    message: "해당 명함 번호로 문의가 접수되었습니다.",
    at: new Date().toISOString()
  };
  for (const uid of recipients) {
    ssePublish(uid, pushPayload);
  }

  return c.json({
    ok: true,
    recipientCount: recipients.size,
    message: "SSE로 연결된 클라이언트에 브로드캐스트됨 · FCM은 .env 의 푸시 키 연동 후 발송"
  });
});

const ALLOWED_DESIGN_TEMPLATES = new Set([
  "classic-light",
  "modern-dark",
  "professional-gold",
  "creative-gradient"
]);

/** 내 디지털 인증명함 ID · 템플릿 · 편집 스냅샷 (HTML 배포·검증 연동) */
cardsRoutes.get("/my-digital-card", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const row = await prisma.digitalCard.findUnique({
    where: { userId: me },
    select: {
      id: true,
      issuedAt: true,
      designTemplateSnapshot: true,
      membershipTierSnapshot: true,
      exportSnapshotJson: true
    }
  });
  if (!row) {
    return c.json({ issued: false, cardId: null, designTemplate: null, exportSnapshot: null });
  }
  const snap =
    row.exportSnapshotJson && typeof row.exportSnapshotJson === "object"
      ? (row.exportSnapshotJson as Record<string, unknown>)
      : null;
  return c.json({
    issued: true,
    cardId: row.id,
    issuedAt: row.issuedAt,
    designTemplate: row.designTemplateSnapshot,
    membershipTierSnapshot: row.membershipTierSnapshot,
    exportSnapshot: snap
  });
});

cardsRoutes.patch("/my-digital-card", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    designTemplate?: string;
    exportSnapshot?: Record<string, unknown>;
  };
  const tpl = String(body.designTemplate || body.exportSnapshot?.designTemplate || "").trim();
  if (tpl && !ALLOWED_DESIGN_TEMPLATES.has(tpl)) {
    return c.json({ error: "지원하지 않는 디자인 템플릿입니다." }, 400);
  }

  let cardRow = await prisma.digitalCard.findUnique({
    where: { userId: me },
    select: { id: true, exportSnapshotJson: true }
  });
  if (!cardRow) {
    const sub = await prisma.userSubscription.findFirst({
      where: { userId: me, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    const tier = sub ? "paid" : "free";
    cardRow = await prisma.digitalCard.create({
      data: { userId: me, membershipTierSnapshot: tier },
      select: { id: true, exportSnapshotJson: true }
    });
  }

  const data: { designTemplateSnapshot?: string; exportSnapshotJson?: object } = {};
  if (tpl) data.designTemplateSnapshot = tpl;
  if (body.exportSnapshot && typeof body.exportSnapshot === "object") {
    const prev =
      cardRow.exportSnapshotJson && typeof cardRow.exportSnapshotJson === "object"
        ? (cardRow.exportSnapshotJson as Record<string, unknown>)
        : {};
    data.exportSnapshotJson = {
      ...prev,
      ...body.exportSnapshot,
      ...(tpl ? { designTemplate: tpl } : {})
    };
  }

  const updated = await prisma.digitalCard.update({
    where: { userId: me },
    data,
    select: { id: true, designTemplateSnapshot: true, exportSnapshotJson: true }
  });

  return c.json({
    ok: true,
    cardId: updated.id,
    designTemplate: updated.designTemplateSnapshot,
    exportSnapshot:
      updated.exportSnapshotJson && typeof updated.exportSnapshotJson === "object"
        ? updated.exportSnapshotJson
        : null
  });
});

/** 직책·부서 확인 서류 — 최신 검토 상태 */
cardsRoutes.get("/title-dept/status", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const status = await getTitleDeptStatusForUser(me);
  return c.json({ ok: true, ...status });
});

/** 직책·부서 변경 신청 (서류 첨부) */
cardsRoutes.post("/title-dept/submit", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    department?: string;
    docKind?: string;
    docFileName?: string;
    docIssuedAt?: string;
    docDataUrl?: string;
    docUrl?: string;
  };
  try {
    const result = await submitTitleDeptReview(me, {
      title: body.title,
      department: body.department,
      docKind: String(body.docKind || ""),
      docFileName: String(body.docFileName || ""),
      docIssuedAt: String(body.docIssuedAt || ""),
      docDataUrl: body.docDataUrl,
      docUrl: body.docUrl,
      source: "bizcard_settings"
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const map: Record<string, string> = {
      INVALID_DOC_KIND: "유효하지 않은 서류 종류입니다.",
      DOC_ISSUED_AT_INVALID: "발급일 기준 1개월 이내 서류만 제출할 수 있습니다.",
      DOC_REQUIRED: "확인 서류를 첨부해 주세요."
    };
    return c.json({ error: map[msg] || msg }, 400);
  }
});
