import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { normalizeDesiredPublicHandle } from "../lib/publicHandle.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { ssePublish } from "../realtime/sseHub.js";
import { lookupCardByRawNumber } from "../services/cardLookup.js";
import { resolveRequestUserId } from "../lib/authContext.js";
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
import {
  createBizcardImageUploadUrl,
  isBizcardImageStorageConfigured
} from "../services/bizcard/bizcardImageStorage.js";
import {
  createDirectImageUploadUrl,
  isDirectImageStorageConfigured
} from "../services/media/directImageStorage.js";
import { enterpriseDccRoutes } from "./enterpriseDcc.js";
import { dccAgentProfileRoutes } from "./dccAgentProfiles.js";
import { dccLineRoutes } from "./dccLines.js";
import { mergeExportSnapshotMedia, isDataUrl } from "../lib/mediaUrlGuard.js";
import { slimExportSnapshot, extractDigitalCardSlimMeta } from "../lib/digitalCardSlim.js";
import { Prisma } from "@prisma/client";

export const cardsRoutes = new Hono();

cardsRoutes.route("/enterprise-dcc", enterpriseDccRoutes);
cardsRoutes.route("/dcc-agent-profiles", dccAgentProfileRoutes);
cardsRoutes.route("/dcc-lines", dccLineRoutes);

async function jsonLookup(
  raw: string,
  viewerId?: string | null,
  opts?: { forCallOverlay?: boolean; dcpRoute?: string | null }
) {
  const result = await lookupCardByRawNumber(raw, {
    viewerId,
    /* 통화 수신 오버레이 — 발신자 상호·회사·직함은 수신자에게 표시 (미리보기와 동일) */
    forPublicOgShare: Boolean(opts?.forCallOverlay),
    dcpRoute: opts?.dcpRoute
  });
  return result;
}

/** 안드로이드 · §3 조회 API */
cardsRoutes.get("/lookup", async (c) => {
  try {
    const raw = String(c.req.query("number") ?? c.req.query("raw") ?? "").trim();
    const viewerId = await resolveRequestUserId(c);
    const forCallOverlay =
      c.req.query("purpose") === "call_overlay" || c.req.query("call_overlay") === "1";
    const dcpRoute = c.req.query("dcp_route") || c.req.query("dcpRoute") || null;
    const result = await jsonLookup(raw, viewerId, { forCallOverlay, dcpRoute });
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
    const viewerId = await resolveRequestUserId(c);
    const forCallOverlay =
      c.req.query("purpose") === "call_overlay" || c.req.query("call_overlay") === "1";
    const dcpRoute = c.req.query("dcp_route") || c.req.query("dcpRoute") || null;
    const result = await jsonLookup(raw, viewerId, { forCallOverlay, dcpRoute });
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

  try {
    const { ensureLineSubscriptionForCard } = await import("../services/billing/lineBillingService.js");
    await ensureLineSubscriptionForCard({
      userId: me,
      businessCardId: created.id,
      amountKrw: 9900,
      status: "pending_payment"
    });
  } catch (e) {
    console.warn("[cards/register] line subscription", e);
  }

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

/** 내 디지털 인증명함 ID · 템플릿 · 편집 스냅샷 (HTML 배포·검증 연동)
 *  ?lite=1 — 스냅샷 생략
 *  기본 — exportSnapshotJson 통째 SELECT 금지, JSON-path 슬림만
 */
cardsRoutes.get("/my-digital-card", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  const lite = String(c.req.query("lite") || "") === "1" || String(c.req.query("lite") || "") === "true";

  if (lite) {
    const row = await prisma.digitalCard.findUnique({
      where: { userId: me },
      select: {
        id: true,
        issuedAt: true,
        designTemplateSnapshot: true,
        membershipTierSnapshot: true
      }
    });
    if (!row) {
      return c.json({ issued: false, cardId: null, designTemplate: null, exportSnapshot: null, lite: true });
    }
    return c.json({
      issued: true,
      cardId: row.id,
      issuedAt: row.issuedAt,
      designTemplate: row.designTemplateSnapshot,
      membershipTierSnapshot: row.membershipTierSnapshot,
      exportSnapshot: null,
      lite: true,
      subscription: await digitalCardSubscription(me)
    });
  }

  const slimRows = await prisma.$queryRaw<
    Array<{
      id: string;
      issued_at: Date;
      design_template_snapshot: string | null;
      membership_tier_snapshot: string | null;
      photo_url: string | null;
      logo_url: string | null;
      name: string | null;
      display_name: string | null;
      organization: string | null;
      company_name: string | null;
      title: string | null;
      department: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      fax: string | null;
      address: string | null;
      address_road: string | null;
      address_detail: string | null;
      company_intro: string | null;
      custom_back_text: string | null;
      share_cover_url: string | null;
      title_photo_url: string | null;
      activity_name: string | null;
      design_template: string | null;
      photo_focus: unknown;
      no_profile_photo: boolean | null;
      no_company_logo: boolean | null;
      no_title_photo: boolean | null;
      no_fax: boolean | null;
      no_website: boolean | null;
    }>
  >(Prisma.sql`
    SELECT
      id,
      issued_at,
      design_template_snapshot,
      membership_tier_snapshot,
      NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url,
      NULLIF(TRIM(export_snapshot_json->>'logoUrl'), '') AS logo_url,
      NULLIF(TRIM(export_snapshot_json->>'name'), '') AS name,
      NULLIF(TRIM(export_snapshot_json->>'displayName'), '') AS display_name,
      NULLIF(TRIM(export_snapshot_json->>'organization'), '') AS organization,
      NULLIF(TRIM(export_snapshot_json->>'companyName'), '') AS company_name,
      NULLIF(TRIM(export_snapshot_json->>'title'), '') AS title,
      NULLIF(TRIM(export_snapshot_json->>'department'), '') AS department,
      NULLIF(TRIM(export_snapshot_json->>'phone'), '') AS phone,
      NULLIF(TRIM(export_snapshot_json->>'email'), '') AS email,
      NULLIF(TRIM(export_snapshot_json->>'website'), '') AS website,
      NULLIF(TRIM(export_snapshot_json->>'fax'), '') AS fax,
      NULLIF(TRIM(export_snapshot_json->>'address'), '') AS address,
      NULLIF(TRIM(export_snapshot_json->>'addressRoad'), '') AS address_road,
      NULLIF(TRIM(export_snapshot_json->>'addressDetail'), '') AS address_detail,
      NULLIF(TRIM(export_snapshot_json->>'companyIntro'), '') AS company_intro,
      NULLIF(TRIM(export_snapshot_json->>'customBackText'), '') AS custom_back_text,
      NULLIF(TRIM(export_snapshot_json->>'shareCoverUrl'), '') AS share_cover_url,
      NULLIF(TRIM(export_snapshot_json->>'titlePhotoUrl'), '') AS title_photo_url,
      NULLIF(TRIM(export_snapshot_json->>'activityName'), '') AS activity_name,
      NULLIF(TRIM(export_snapshot_json->>'designTemplate'), '') AS design_template,
      export_snapshot_json->'photoFocus' AS photo_focus,
      CASE
        WHEN export_snapshot_json ? 'noProfilePhoto'
          THEN (export_snapshot_json->>'noProfilePhoto')::boolean
        ELSE NULL
      END AS no_profile_photo,
      CASE
        WHEN export_snapshot_json ? 'noCompanyLogo'
          THEN (export_snapshot_json->>'noCompanyLogo')::boolean
        ELSE NULL
      END AS no_company_logo,
      CASE
        WHEN export_snapshot_json ? 'noTitlePhoto'
          THEN (export_snapshot_json->>'noTitlePhoto')::boolean
        ELSE NULL
      END AS no_title_photo,
      CASE
        WHEN export_snapshot_json ? 'noFax'
          THEN (export_snapshot_json->>'noFax')::boolean
        ELSE NULL
      END AS no_fax,
      CASE
        WHEN export_snapshot_json ? 'noWebsite'
          THEN (export_snapshot_json->>'noWebsite')::boolean
        ELSE NULL
      END AS no_website
    FROM digital_cards
    WHERE user_id = ${me}::uuid
    LIMIT 1
  `);
  const row = slimRows[0];
  if (!row) {
    return c.json({ issued: false, cardId: null, designTemplate: null, exportSnapshot: null, lite: false });
  }
  const exportSnapshot = slimExportSnapshot({
    photoUrl: row.photo_url,
    logoUrl: row.logo_url,
    name: row.name || row.display_name,
    displayName: row.display_name || row.name,
    organization: row.organization,
    companyName: row.company_name || row.organization,
    title: row.title,
    department: row.department,
    phone: row.phone,
    email: row.email,
    website: row.website,
    fax: row.fax,
    address: row.address,
    addressRoad: row.address_road,
    addressDetail: row.address_detail,
    companyIntro: row.company_intro,
    customBackText: row.custom_back_text,
    shareCoverUrl: row.share_cover_url,
    titlePhotoUrl: row.title_photo_url,
    activityName: row.activity_name,
    designTemplate: row.design_template || row.design_template_snapshot,
    photoFocus: row.photo_focus,
    noProfilePhoto: row.no_profile_photo,
    noCompanyLogo: row.no_company_logo,
    noTitlePhoto: row.no_title_photo,
    noFax: row.no_fax,
    noWebsite: row.no_website
  });
  return c.json({
    issued: true,
    cardId: row.id,
    issuedAt: row.issued_at,
    designTemplate: row.design_template_snapshot,
    membershipTierSnapshot: row.membership_tier_snapshot,
    exportSnapshot,
    lite: false,
    subscription: await digitalCardSubscription(me)
  });
});

async function digitalCardSubscription(userId: string) {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { cycleEndAt: "desc" },
    select: {
      cycleStartAt: true,
      cycleEndAt: true,
      nextChargeAt: true,
      plan: true
    }
  });
  if (!sub) return null;
  const plan = String(sub.plan || "").toLowerCase();
  const billingCycle = plan === "b2c_annual" ? "annual" : "monthly";
  return {
    cycleStartAt: sub.cycleStartAt,
    cycleEndAt: sub.cycleEndAt,
    nextChargeAt: sub.nextChargeAt,
    plan: sub.plan,
    billingCycle
  };
}

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

  const wantsSnapshot =
    body.exportSnapshot != null && typeof body.exportSnapshot === "object";

  let cardRow = await prisma.digitalCard.findUnique({
    where: { userId: me },
    select: wantsSnapshot
      ? { id: true, exportSnapshotJson: true }
      : { id: true }
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
      select: wantsSnapshot
        ? { id: true, exportSnapshotJson: true }
        : { id: true }
    });
  }

  const data: {
    designTemplateSnapshot?: string;
    exportSnapshotJson?: object;
  } = {};
  if (tpl) data.designTemplateSnapshot = tpl;
  let slimMeta: ReturnType<typeof extractDigitalCardSlimMeta> | null = null;
  if (wantsSnapshot && body.exportSnapshot) {
    const prevSnap =
      "exportSnapshotJson" in cardRow &&
      cardRow.exportSnapshotJson &&
      typeof cardRow.exportSnapshotJson === "object"
        ? (cardRow.exportSnapshotJson as Record<string, unknown>)
        : {};
    /* data URL 사진/로고가 스냅샷에 쌓이면 검색·프로필 조회마다 Supabase egress 폭증 */
    const mediaFields = ["photoUrl", "logoUrl", "shareCoverUrl", "imageUrl", "image_url", "kakaoFeedBgUrl"];
    for (const key of mediaFields) {
      if (key in body.exportSnapshot && isDataUrl(body.exportSnapshot[key])) {
        return c.json(
          {
            error:
              "이미지는 R2(https) URL만 저장할 수 있습니다. data URL은 DB 대역폭을 폭증시키므로 거부됩니다."
          },
          400
        );
      }
    }
    const merged = {
      ...mergeExportSnapshotMedia(prevSnap, body.exportSnapshot),
      ...(tpl ? { designTemplate: tpl } : {})
    };
    /* 서버에는 슬림 스냅만 유지 (전체 블롭 금지) */
    const slim = slimExportSnapshot(merged) || {};
    data.exportSnapshotJson = slim;
    slimMeta = extractDigitalCardSlimMeta(slim);
  }

  const updated = await prisma.digitalCard.update({
    where: { userId: me },
    data,
    select: { id: true, designTemplateSnapshot: true }
  });

  if (slimMeta) {
    try {
      await prisma.$executeRaw`
        UPDATE digital_cards SET
          photo_url = ${slimMeta.photoUrl},
          logo_url = ${slimMeta.logoUrl},
          display_name = ${slimMeta.displayName},
          organization = ${slimMeta.organization},
          title_snapshot = ${slimMeta.title},
          department_snapshot = ${slimMeta.department},
          activity_name = ${slimMeta.activityName}
        WHERE user_id = ${me}::uuid
      `;
    } catch {
      /* 마이그레이션 전 컬럼 없음 — JSON slim 만으로 충분 */
    }
  }

  return c.json({
    ok: true,
    cardId: updated.id,
    designTemplate: updated.designTemplateSnapshot
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

/** 명함·프로필 이미지 Presigned URL — 브라우저가 R2로 직행 업로드 (파일 본문 미수신) */
cardsRoutes.post("/image-upload-url", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId")!;
  if (!isDirectImageStorageConfigured() && !isBizcardImageStorageConfigured()) {
    return c.json({ error: "이미지 스토리지(R2)가 설정되지 않았습니다.", configured: false }, 503);
  }
  const body = (await c.req.json().catch(() => ({}))) as {
    kind?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
  };
  try {
    const kind = String(body.kind || "photo");
    const signed = isDirectImageStorageConfigured()
      ? await createDirectImageUploadUrl({
          userId: me,
          kind,
          fileName: String(body.fileName || "image.jpg"),
          contentType: String(body.contentType || "image/jpeg"),
          fileSize: Number(body.fileSize) || 0
        })
      : await createBizcardImageUploadUrl({
          userId: me,
          kind: (kind as "photo" | "logo" | "avatar" | "cover") || "photo",
          fileName: String(body.fileName || "image.jpg"),
          contentType: String(body.contentType || "image/jpeg"),
          fileSize: Number(body.fileSize) || 0
        });
    return c.json({ ok: true, ...signed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 URL 발급 실패";
    return c.json({ error: msg, configured: true }, 400);
  }
});
