import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { requireUserHeader } from "../middleware/cardGate.js";

export const campaignRoutes = new Hono();
const DEFAULT_VOUCHER_WON = 20000;

type TierQuote = {
  tier: 0 | 1 | 2 | 3 | 4;
  followers: number;
  clicks: number;
  rewardCash: number;
  platformFeeCash: number;
  totalCostCash: number;
};

function seededMetrics(userId: string) {
  const s = String(userId || "");
  let acc = 17;
  for (let i = 0; i < s.length; i += 1) acc = (acc * 31 + s.charCodeAt(i)) % 1000003;
  const followers = 100 + (acc % 7800);
  const clicks = 20 + (Math.floor(acc / 7) % 480);
  return { followers, clicks };
}

function quoteForFollowers(followers: number, clicks = 0): TierQuote {
  const safeFollowers = Math.max(0, Number(followers || 0));
  let tier: 0 | 1 | 2 | 3 | 4 = 0;
  let reward = 0;
  if (safeFollowers >= 10000) {
    tier = 4;
    reward = 44000;
  } else if (safeFollowers >= 5000) {
    tier = 3;
    reward = 33000;
  } else if (safeFollowers >= 3000) {
    tier = 2;
    reward = 22000;
  } else if (safeFollowers >= 1000) {
    tier = 1;
    reward = 11000;
  }
  const fee = Math.round(reward * 0.2);
  return {
    tier,
    followers: safeFollowers,
    clicks: Math.max(0, Number(clicks || 0)),
    rewardCash: reward,
    platformFeeCash: fee,
    totalCostCash: reward + fee
  };
}

function buildQrToken(campaignId: string) {
  return `VLUE-${String(campaignId || "").slice(0, 8).toUpperCase()}`;
}

function buildStoreQrPayload(campaignId: string, ownerUserId: string) {
  const qrToken = buildQrToken(campaignId);
  return {
    qrToken,
    version: "v1",
    storeRef: `STORE-${String(ownerUserId || "").slice(0, 8).toUpperCase()}`,
    campaignRef: `CMP-${String(campaignId || "").slice(0, 8).toUpperCase()}`,
    capabilities: ["visit_checkin", "wallet_payment_ready"],
    note: "현재는 방문 인증 중심이며, 이후 위챗형 QR 결제까지 확장 가능한 포맷입니다."
  };
}

async function ensureUserRow(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId }
  });
}

campaignRoutes.post("/", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    rewardCash?: number;
    capacity?: number;
    locationLat?: number;
    locationLng?: number;
    radiusMeters?: number;
    reviewDeadlineHours?: number;
    requiredKeywords?: string[];
    pricingMode?: "tiered" | "tier0_free";
    tierLevel?: number;
  };
  if (!body.title || !body.description) {
    return c.json({ error: "title, description 필요" }, 400);
  }
  try {
    await ensureUserRow(ownerUserId);
  } catch {
    return c.json({ error: "유효한 사용자 세션이 필요합니다. 다시 로그인 후 시도해 주세요." }, 400);
  }
  const normalizedDescription = body.description.includes("2만원 상당의 식사권/사용권 제공")
    ? body.description.trim()
    : `${body.description.trim()}\n\n기본 제공: 2만원 상당의 식사권/사용권 제공`;
  const level = Math.max(0, Math.min(4, Number(body.tierLevel ?? (body.pricingMode === "tier0_free" ? 0 : 1))));
  const presetRewardCashByTier = [0, 11000, 22000, 33000, 44000][level] || 11000;
  const created = await prisma.campaign.create({
    data: {
      ownerUserId,
      title: body.title.trim(),
      description: normalizedDescription,
      // 선택 티어(0~4)에 따라 공고 기본 보상 단가를 저장한다.
      rewardCash: presetRewardCashByTier,
      capacity: Math.max(1, Number(body.capacity || 1)),
      locationLat: Number.isFinite(body.locationLat) ? Number(body.locationLat) : null,
      locationLng: Number.isFinite(body.locationLng) ? Number(body.locationLng) : null,
      radiusMeters: Number.isFinite(body.radiusMeters) ? Math.max(50, Number(body.radiusMeters)) : 1500,
      reviewDeadlineHours: Math.max(1, Number(body.reviewDeadlineHours || 24)),
      requiredKeywords: {
        create: (body.requiredKeywords || [])
          .map((k) => String(k || "").trim())
          .filter(Boolean)
          .slice(0, 15)
          .map((keyword) => ({ keyword }))
      }
    },
    include: { requiredKeywords: true }
  });
  await prisma.activeBoardEvent.create({
    data: {
      campaignId: created.id,
      userId: ownerUserId,
      eventType: "campaign_recruiting",
      payloadJson: { title: created.title, rewardCash: created.rewardCash }
    }
  });
  return c.json({ campaign: created });
});

campaignRoutes.get("/active", requireUserHeader, async (c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const hasCoord = Number.isFinite(lat) && Number.isFinite(lng);
  const rows = await prisma.campaign.findMany({
    where: { status: "recruiting" },
    include: { requiredKeywords: true },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  const campaigns = hasCoord
    ? rows.sort((a, b) => {
        const da = Math.abs((a.locationLat || lat) - lat) + Math.abs((a.locationLng || lng) - lng);
        const db = Math.abs((b.locationLat || lat) - lat) + Math.abs((b.locationLng || lng) - lng);
        return da - db;
      })
    : rows;
  return c.json({ campaigns });
});

campaignRoutes.post("/:campaignId/apply", requireUserHeader, async (c) => {
  const applicantId = c.get("vlueUserId") as string;
  const campaignId = c.req.param("campaignId");
  if (!campaignId) return c.json({ error: "campaignId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { message?: string };
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "recruiting") {
    return c.json({ error: "모집이 마감되었거나 캠페인이 없습니다." }, 400);
  }
  try {
    const row = await prisma.campaignApplication.create({
      data: {
        campaignId,
        applicantId,
        message: body.message?.trim() || null
      }
    });
    return c.json({ application: row });
  } catch {
    return c.json({ error: "이미 지원했거나 캠페인이 없습니다." }, 400);
  }
});

campaignRoutes.post("/:campaignId/match/:applicationId", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const campaignId = c.req.param("campaignId");
  const applicationId = c.req.param("applicationId");
  if (!campaignId || !applicationId) return c.json({ error: "campaignId/applicationId 필요" }, 400);
  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.ownerUserId !== ownerUserId) throw new Error("forbidden");
    const app = await tx.campaignApplication.findUnique({ where: { id: applicationId } });
    if (!app || app.campaignId !== campaignId) throw new Error("bad_request");
    const metrics = seededMetrics(app.applicantId);
    const quote = quoteForFollowers(metrics.followers, metrics.clicks);
    const match = await tx.campaignMatch.create({
      data: {
        campaignId,
        ownerUserId,
        bloggerUserId: app.applicantId
      }
    });
    await tx.campaignApplication.update({
      where: { id: applicationId },
      data: { status: "accepted" }
    });
    await tx.escrowHold.create({
      data: {
        matchId: match.id,
        amountCash: quote.rewardCash
      }
    });
    await tx.walletAccount.upsert({
      where: { userId: ownerUserId },
      update: {},
      create: { userId: ownerUserId, balanceCash: 0 }
    });
    await tx.walletLedger.create({
      data: {
        walletAccount: { connect: { userId: ownerUserId } },
        userId: ownerUserId,
        amountCash: -quote.totalCostCash,
        entryType: "escrow_hold",
        referenceId: match.id,
        note: `캠페인 매칭 확정 (보상 ${quote.rewardCash.toLocaleString()}원 + 수수료 ${quote.platformFeeCash.toLocaleString()}원)`
      }
    });
    const acceptedCount = await tx.campaignApplication.count({
      where: { campaignId, status: "accepted" }
    });
    let autoClosed = false;
    if (acceptedCount >= campaign.capacity) {
      autoClosed = true;
      await tx.campaign.update({
        where: { id: campaignId },
        data: { status: "closed" }
      });
      const failedApplicants = await tx.campaignApplication.findMany({
        where: {
          campaignId,
          status: "applied"
        },
        select: { id: true, applicantId: true }
      });
      if (failedApplicants.length) {
        await tx.campaignApplication.updateMany({
          where: { id: { in: failedApplicants.map((row) => row.id) } },
          data: { status: "rejected" }
        });
        for (const failed of failedApplicants) {
          const actor = await tx.user.findUnique({
            where: { id: failed.applicantId },
            select: { nickFeed: true, publicHandle: true }
          });
          const actorName = actor?.nickFeed || actor?.publicHandle || "고객";
          await tx.ownerNotification.create({
            data: {
              ownerUserId,
              actorUserId: failed.applicantId,
              title: "캠페인 모집 마감 안내",
              body: `이번 캠페인은 아쉽게 마감되었습니다. ${actorName}님의 프로필은 인상 깊었으니 다음 기회에 꼭 다시 뵙기를 희망합니다!`
            }
          });
        }
      }
    }
    return { match, quote, autoClosed };
  });
  return c.json(result);
});

campaignRoutes.post("/:campaignId/application/:applicationId/reject", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const campaignId = c.req.param("campaignId");
  const applicationId = c.req.param("applicationId");
  if (!campaignId || !applicationId) return c.json({ error: "campaignId/applicationId 필요" }, 400);
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.ownerUserId !== ownerUserId) return c.json({ error: "권한 없음" }, 403);
  const app = await prisma.campaignApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.campaignId !== campaignId) return c.json({ error: "지원 정보를 찾을 수 없습니다." }, 404);
  const row = await prisma.campaignApplication.update({
    where: { id: applicationId },
    data: { status: "rejected" }
  });
  return c.json({ application: row });
});

campaignRoutes.post("/matches/:matchId/verify", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const matchId = c.req.param("matchId");
  if (!matchId) return c.json({ error: "matchId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    method?: "gps" | "receipt" | "photo_meta" | "qr";
    gpsLat?: number;
    gpsLng?: number;
    receiptImageUrl?: string;
    photoMetaJson?: unknown;
    qrToken?: string;
  };
  const match = await prisma.campaignMatch.findUnique({
    where: { id: matchId },
    include: { campaign: true }
  });
  if (!match || match.bloggerUserId !== userId) return c.json({ error: "권한 없음" }, 403);
  if ((body.method || "gps") === "qr") {
    const expectedToken = buildQrToken(match.campaignId);
    if (String(body.qrToken || "").trim().toUpperCase() !== expectedToken) {
      return c.json({ error: "매장 QR 인증에 실패했습니다. 등록된 QR을 다시 스캔해 주세요." }, 400);
    }
  }
  const persistedMethod = body.method === "qr" ? "gps" : body.method || "gps";
  const verified = await prisma.$transaction(async (tx) => {
    const verification = await tx.visitVerification.create({
      data: {
        matchId,
        userId,
        method: persistedMethod,
        status: "passed",
        gpsLat: Number.isFinite(body.gpsLat) ? Number(body.gpsLat) : null,
        gpsLng: Number.isFinite(body.gpsLng) ? Number(body.gpsLng) : null,
        receiptImageUrl: body.receiptImageUrl || null,
        photoMetaJson: body.photoMetaJson ? (body.photoMetaJson as any) : undefined,
        verifiedAt: new Date()
      }
    });
    const deadlineAt = new Date(Date.now() + match.campaign.reviewDeadlineHours * 3600 * 1000);
    await tx.campaignMatch.update({
      where: { id: matchId },
      data: {
        status: "verified",
        reviewDeadlineAt: deadlineAt
      }
    });
    await tx.activeBoardEvent.create({
      data: {
        campaignId: match.campaignId,
        userId,
        eventType: "verification_completed",
        payloadJson: { matchId, method: body.method || "gps" }
      }
    });
    await tx.ownerNotification.create({
      data: {
        ownerUserId: match.ownerUserId,
        actorUserId: userId,
        title: "캠페인 활동 리뷰어 도착",
        body: "매장 QR 인증이 완료되어 매칭된 리뷰어 도착이 확인되었습니다."
      }
    });
    return { verification, reviewDeadlineAt: deadlineAt.toISOString() };
  });
  return c.json(verified);
});

// 매장별 QR 발부: 방문 인증 + 향후 결제 확장용 메타를 반환
campaignRoutes.get("/:campaignId/store-qr", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const campaignId = c.req.param("campaignId");
  if (!campaignId) return c.json({ error: "campaignId 필요" }, 400);
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.ownerUserId !== ownerUserId) return c.json({ error: "권한 없음" }, 403);
  return c.json({
    campaignId,
    ...buildStoreQrPayload(campaignId, ownerUserId)
  });
});

// 위챗형 QR 결제 확장 로직(현재 MVP): 스캔한 QR 토큰으로 매장 결제 수행
campaignRoutes.post("/:campaignId/store-qr/pay", requireUserHeader, async (c) => {
  const payerUserId = c.get("vlueUserId") as string;
  const campaignId = c.req.param("campaignId");
  if (!campaignId) return c.json({ error: "campaignId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    qrToken?: string;
    amountCash?: number;
    note?: string;
  };
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return c.json({ error: "캠페인을 찾을 수 없습니다." }, 404);
  const expectedToken = buildQrToken(campaignId);
  if (String(body.qrToken || "").trim().toUpperCase() !== expectedToken) {
    return c.json({ error: "QR 토큰이 일치하지 않습니다." }, 400);
  }
  const amountCash = Math.max(100, Number(body.amountCash || 0));
  const result = await prisma.$transaction(async (tx) => {
    const payer = await tx.walletAccount.upsert({
      where: { userId: payerUserId },
      create: { userId: payerUserId, balanceCash: 0 },
      update: {}
    });
    if (payer.balanceCash < amountCash) {
      throw new Error("insufficient_cash");
    }
    const merchant = await tx.walletAccount.upsert({
      where: { userId: campaign.ownerUserId },
      create: { userId: campaign.ownerUserId, balanceCash: 0 },
      update: {}
    });
    await tx.walletAccount.update({
      where: { userId: payerUserId },
      data: { balanceCash: { decrement: amountCash } }
    });
    await tx.walletAccount.update({
      where: { userId: campaign.ownerUserId },
      data: { balanceCash: { increment: amountCash } }
    });
    await tx.walletLedger.create({
      data: {
        walletAccountId: payer.id,
        userId: payerUserId,
        amountCash: -amountCash,
        entryType: "withdrawal",
        referenceId: campaignId,
        note: body.note?.trim() || "매장 QR 결제(고객)"
      }
    });
    await tx.walletLedger.create({
      data: {
        walletAccountId: merchant.id,
        userId: campaign.ownerUserId,
        amountCash,
        entryType: "credit",
        referenceId: campaignId,
        note: body.note?.trim() || "매장 QR 결제(업체 수취)"
      }
    });
    await tx.ownerNotification.create({
      data: {
        ownerUserId: campaign.ownerUserId,
        actorUserId: payerUserId,
        title: "매장 QR 결제 완료",
        body: `${amountCash.toLocaleString()}원 QR 결제가 완료되었습니다.`
      }
    });
    await tx.activeBoardEvent.create({
      data: {
        campaignId,
        userId: payerUserId,
        eventType: "store_qr_payment_completed",
        payloadJson: { amountCash, qrToken: expectedToken, note: body.note?.trim() || null }
      }
    });
    return { amountCash };
  }).catch((e) => {
    if (e instanceof Error && e.message === "insufficient_cash") return null;
    throw e;
  });
  if (!result) {
    return c.json({ error: "잔액이 부족합니다. 충전 후 다시 시도해 주세요." }, 400);
  }
  return c.json({ ok: true, ...result, campaignId, qrToken: expectedToken });
});

campaignRoutes.post("/matches/:matchId/review/draft", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const matchId = c.req.param("matchId");
  if (!matchId) return c.json({ error: "matchId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    blogUrl?: string;
    bodyText?: string;
    summary3Lines?: string;
    photosJson?: unknown[];
    keywordsCheckJson?: unknown;
  };
  const match = await prisma.campaignMatch.findUnique({ where: { id: matchId } });
  if (!match || match.bloggerUserId !== userId) return c.json({ error: "권한 없음" }, 403);
  const draft = await prisma.reviewDraft.upsert({
    where: { matchId },
    create: {
      matchId,
      userId,
      blogUrl: body.blogUrl || null,
      bodyText: body.bodyText || null,
      summary3Lines: body.summary3Lines || null,
      photosJson: (body.photosJson || []) as any,
      keywordsCheckJson: (body.keywordsCheckJson || {}) as any
    },
    update: {
      blogUrl: body.blogUrl || null,
      bodyText: body.bodyText || null,
      summary3Lines: body.summary3Lines || null,
      photosJson: (body.photosJson || []) as any,
      keywordsCheckJson: (body.keywordsCheckJson || {}) as any
    }
  });
  return c.json({ draft });
});

campaignRoutes.post("/matches/:matchId/review/submit", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const matchId = c.req.param("matchId");
  if (!matchId) return c.json({ error: "matchId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    blogUrl?: string;
    bodyText?: string;
    summary3Lines?: string;
    photos?: Array<{ url: string; meta?: unknown }>;
    keywordsHit?: boolean;
  };
  const match = await prisma.campaignMatch.findUnique({
    where: { id: matchId },
    include: { campaign: true, escrowHold: true }
  });
  if (!match || match.bloggerUserId !== userId) return c.json({ error: "권한 없음" }, 403);
  if (!body.blogUrl || !body.bodyText || !body.summary3Lines) return c.json({ error: "필수 항목 누락" }, 400);
  if ((body.photos || []).length < 5) return c.json({ error: "사진은 최소 5장 필요합니다." }, 400);
  if (!body.keywordsHit) return c.json({ error: "필수 키워드를 충족해야 제출할 수 있습니다." }, 400);
  const blogUrl = body.blogUrl;
  const bodyText = body.bodyText;
  const summary3Lines = body.summary3Lines;

  const settled = await prisma.$transaction(async (tx) => {
    const review = await tx.reviewSubmission.upsert({
      where: { matchId },
      create: {
        matchId,
        userId,
        blogUrl,
        bodyText,
        summary3Lines,
        keywordsHit: true,
        photosCount: (body.photos || []).length,
        status: "submitted"
      },
      update: {
        blogUrl,
        bodyText,
        summary3Lines,
        keywordsHit: true,
        photosCount: (body.photos || []).length,
        status: "submitted",
        submittedAt: new Date()
      }
    });
    await tx.campaignMatch.update({
      where: { id: matchId },
      data: { status: "review_submitted" }
    });
    if (match.escrowHold?.status === "held") {
      await tx.escrowHold.update({
        where: { matchId },
        data: { status: "released", releasedAt: new Date() }
      });
      const account = await tx.walletAccount.upsert({
        where: { userId },
        create: { userId, balanceCash: match.escrowHold.amountCash },
        update: { balanceCash: { increment: match.escrowHold.amountCash } }
      });
      await tx.walletLedger.create({
        data: {
          walletAccountId: account.id,
          userId,
          amountCash: match.escrowHold.amountCash,
          entryType: "escrow_release",
          referenceId: matchId,
          note: "리뷰 완료 정산"
        }
      });
      await tx.campaignMatch.update({
        where: { id: matchId },
        data: { status: "settled", settledAt: new Date() }
      });
    }
    return { review, releasedCash: match.escrowHold?.amountCash || 0 };
  });
  return c.json({ ok: true, ...settled });
});

campaignRoutes.post("/matches/:matchId/review/approve", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const matchId = c.req.param("matchId");
  if (!matchId) return c.json({ error: "matchId 필요" }, 400);
  const match = await prisma.campaignMatch.findUnique({ where: { id: matchId } });
  if (!match || match.ownerUserId !== ownerUserId) return c.json({ error: "권한 없음" }, 403);
  const review = await prisma.reviewSubmission.update({
    where: { matchId },
    data: { status: "approved", approvedAt: new Date() }
  });
  return c.json({ review });
});

campaignRoutes.post("/matches/:matchId/review/decision", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const matchId = c.req.param("matchId");
  if (!matchId) return c.json({ error: "matchId 필요" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { decision?: "approved" | "rejected"; reason?: string };
  const decision = body.decision === "rejected" ? "rejected" : "approved";
  const match = await prisma.campaignMatch.findUnique({ where: { id: matchId } });
  if (!match || match.ownerUserId !== ownerUserId) return c.json({ error: "권한 없음" }, 403);
  const review = await prisma.reviewSubmission.update({
    where: { matchId },
    data: {
      status: decision,
      approvedAt: decision === "approved" ? new Date() : null
    }
  });
  if (decision === "rejected") {
    await prisma.ownerNotification.create({
      data: {
        ownerUserId,
        actorUserId: match.bloggerUserId,
        title: "리뷰 반려 처리",
        body: body.reason?.trim() || "요청 조건 미충족으로 반려되었습니다."
      }
    });
  }
  return c.json({ review });
});

campaignRoutes.post("/matches/check-overdue", async (c) => {
  const now = new Date();
  const overdue = await prisma.campaignMatch.findMany({
    where: {
      status: { in: ["verified", "matched"] },
      reviewDeadlineAt: { not: null, lt: now }
    },
    take: 100
  });
  for (const m of overdue) {
    await prisma.$transaction(async (tx) => {
      await tx.campaignMatch.update({ where: { id: m.id }, data: { status: "overdue" } });
      await tx.penaltyEvent.create({
        data: {
          matchId: m.id,
          userId: m.bloggerUserId,
          reason: "리뷰 기한 초과"
        }
      });
      await tx.trustScoreLedger.create({
        data: {
          userId: m.bloggerUserId,
          delta: -10,
          reason: "review_deadline_missed",
          referenceId: m.id
        }
      });
      await tx.ownerNotification.create({
        data: {
          ownerUserId: m.ownerUserId,
          actorUserId: m.bloggerUserId,
          title: "리뷰 기한 초과",
          body: "블로거가 약속된 리뷰 마감 기한을 넘겼습니다."
        }
      });
    });
  }
  return c.json({ processed: overdue.length });
});

campaignRoutes.get("/my-matches", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const rows = await prisma.campaignMatch.findMany({
    where: { bloggerUserId: userId },
    include: {
      campaign: { include: { requiredKeywords: true } },
      escrowHold: true,
      reviewDraft: true,
      reviewSubmission: true
    },
    orderBy: { matchedAt: "desc" },
    take: 30
  });
  return c.json({ matches: rows });
});

campaignRoutes.get("/owner/dashboard", requireUserHeader, async (c) => {
  const ownerUserId = c.get("vlueUserId") as string;
  const campaignsRaw = await prisma.campaign.findMany({
    where: { ownerUserId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      _count: {
        select: {
          applications: true,
          matches: true
        }
      }
    }
  });
  const pendingApplications = await prisma.campaignApplication.findMany({
    where: {
      status: "applied",
      campaign: { ownerUserId }
    },
    include: {
      campaign: true,
      applicant: { select: { id: true, publicHandle: true, nickFeed: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 60
  });
  const pendingReviews = await prisma.campaignMatch.findMany({
    where: { ownerUserId, status: "review_submitted" },
    include: {
      campaign: true,
      reviewSubmission: true,
      bloggerUser: { select: { id: true, publicHandle: true, nickFeed: true } }
    },
    orderBy: { matchedAt: "desc" },
    take: 40
  });
  const campaigns = campaignsRaw.map((campaign) => {
    const tier1 = quoteForFollowers(1000);
    const estimatedPerSeatCash = campaign.rewardCash === 0 ? 0 : tier1.totalCostCash;
    return {
      ...campaign,
      mealVoucherCash: DEFAULT_VOUCHER_WON,
      pricingMode: campaign.rewardCash === 0 ? "tier0_free" : "tiered",
      qrToken: buildQrToken(campaign.id),
      qrCapabilities: ["visit_checkin", "wallet_payment_ready"],
      applicantCount: campaign._count.applications,
      matchedCount: campaign._count.matches,
      supportRatePct:
        campaign.capacity > 0
          ? Math.round((campaign._count.applications / campaign.capacity) * 100)
          : 0,
      estimatedPerSeatCash,
      estimatedTotalCash: estimatedPerSeatCash * campaign.capacity
    };
  });
  const pendingApplicationsWithProfile = pendingApplications.map((app) => {
    const metrics = seededMetrics(app.applicantId);
    const quote = quoteForFollowers(metrics.followers, metrics.clicks);
    return {
      ...app,
      applicantProfile: {
        followers: quote.followers,
        clicks: quote.clicks
      },
      payoutQuote: quote
    };
  });
  return c.json({
    canManageOwnerCampaign: true,
    campaigns,
    pendingApplications: pendingApplicationsWithProfile,
    pendingReviews
  });
});

campaignRoutes.post("/ai-smart-sync/parse", requireUserHeader, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { blogUrl?: string; requiredKeywords?: string[] };
  const blogUrl = String(body.blogUrl || "").trim();
  if (!/^https?:\/\/(blog\.naver\.com|m\.blog\.naver\.com)\//i.test(blogUrl)) {
    return c.json({ error: "네이버 블로그 URL 형식이 아닙니다." }, 400);
  }
  const fakeText = "방문 후기 본문 예시 텍스트입니다. 실제 크롤러 연동 전 parser adapter 단계입니다.";
  const required = (body.requiredKeywords || []).map((k) => String(k || "").trim()).filter(Boolean);
  const keywordStatus = required.map((k) => ({ keyword: k, hit: fakeText.includes(k) }));
  const summary3Lines = [
    "매장 분위기와 서비스 응대가 전반적으로 만족스러웠습니다.",
    "대표 메뉴 품질이 안정적이고 재방문 의사가 높습니다.",
    "캠페인 미션 키워드를 반영해 후기 작성을 완료했습니다."
  ];
  return c.json({
    blogUrl,
    extractedText: fakeText,
    summary3Lines,
    keywordStatus,
    photoMetaCheck: { hasGpsExif: false, confidence: "low", note: "실이미지 EXIF 파서 연동 필요" }
  });
});

campaignRoutes.post("/demo/reset", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const ownerCampaigns = await prisma.campaign.findMany({
    where: { ownerUserId: userId },
    select: { id: true }
  });
  const campaignIds = ownerCampaigns.map((cRow) => cRow.id);
  const matchRows = await prisma.campaignMatch.findMany({
    where: {
      OR: [{ ownerUserId: userId }, { bloggerUserId: userId }, { campaignId: { in: campaignIds } }]
    },
    select: { id: true }
  });
  const matchIds = matchRows.map((m) => m.id);

  await prisma.$transaction(async (tx) => {
    if (matchIds.length) {
      await tx.reviewDraft.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.reviewSubmission.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.visitVerification.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.escrowHold.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.penaltyEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.campaignMatch.deleteMany({ where: { id: { in: matchIds } } });
      await tx.walletLedger.deleteMany({
        where: {
          OR: [{ userId }, { referenceId: { in: matchIds } }]
        }
      });
    }
    if (campaignIds.length) {
      await tx.campaignApplication.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await tx.activeBoardEvent.deleteMany({
        where: {
          campaignId: { in: campaignIds },
          eventType: { not: "campaign_recruiting" }
        }
      });
      await tx.campaign.updateMany({
        where: { id: { in: campaignIds } },
        data: { status: "recruiting" }
      });
    }
    await tx.campaignApplication.deleteMany({ where: { applicantId: userId } });
    await tx.walletAccount.updateMany({
      where: { userId },
      data: { balanceCash: 0 }
    });
  });

  return c.json({ ok: true, resetMatches: matchIds.length, resetCampaigns: campaignIds.length });
});
