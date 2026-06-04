import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { requireUserHeader } from "../middleware/cardGate.js";

export const activeBoardRoutes = new Hono();
const DEFAULT_VOUCHER_WON = 20000;

function seededFollowers(userId: string) {
  const s = String(userId || "");
  let acc = 17;
  for (let i = 0; i < s.length; i += 1) acc = (acc * 31 + s.charCodeAt(i)) % 1000003;
  return 100 + (acc % 7800);
}

function quoteForFollowers(followers: number) {
  const safeFollowers = Math.max(0, Number(followers || 0));
  let tier: 0 | 1 | 2 | 3 | 4 = 0;
  let rewardCash = 0;
  if (safeFollowers >= 10000) {
    tier = 4;
    rewardCash = 44000;
  } else if (safeFollowers >= 5000) {
    tier = 3;
    rewardCash = 33000;
  } else if (safeFollowers >= 3000) {
    tier = 2;
    rewardCash = 22000;
  } else if (safeFollowers >= 1000) {
    tier = 1;
    rewardCash = 11000;
  }
  const platformFeeCash = Math.round(rewardCash * 0.2);
  return { tier, rewardCash, platformFeeCash, totalCostCash: rewardCash + platformFeeCash };
}

activeBoardRoutes.get("/", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const campaignsRaw = await prisma.campaign.findMany({
    where: { status: "recruiting" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      _count: {
        select: {
          applications: true
        }
      }
    }
  });
  const myApplications = await prisma.campaignApplication.findMany({
    where: { applicantId: userId },
    select: { campaignId: true }
  });
  const appliedCampaignIds = myApplications.map((row) => row.campaignId);
  const timeline = await prisma.activeBoardEvent.findMany({
    where: { eventType: "verification_completed" },
    orderBy: { createdAt: "desc" },
    take: 40
  });
  const myFollowers = seededFollowers(userId);
  const myQuote = quoteForFollowers(myFollowers);
  const campaigns = campaignsRaw.map((campaign) => ({
    ...campaign,
    supportRatePct:
      campaign.capacity > 0
        ? Math.round((campaign._count.applications / campaign.capacity) * 100)
        : 0,
    applicantCount: campaign._count.applications,
    mealVoucherCash: DEFAULT_VOUCHER_WON,
    expectedRewardCash: campaign.rewardCash === 0 ? 0 : myQuote.rewardCash,
    pricingMode: campaign.rewardCash === 0 ? "tier0_free" : "tiered",
    myTier: myQuote.tier
  }));
  return c.json({ campaigns, timeline, appliedCampaignIds, myProfile: { followers: myFollowers } });
});
