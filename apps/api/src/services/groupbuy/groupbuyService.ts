import { ssePublish } from "../../realtime/sseHub.js";

type GroupBuyCampaign = {
  id: string;
  ownerUserId: string;
  title: string;
  targetQty: number;
  soldQty: number;
  endsAt: string;
  createdAt: string;
};

const campaigns = new Map<string, GroupBuyCampaign>();

export function createGroupBuyCampaign(input: {
  ownerUserId: string;
  title: string;
  targetQty: number;
  durationMinutes: number;
}) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const endsAt = new Date(now + input.durationMinutes * 60_000).toISOString();
  const campaign: GroupBuyCampaign = {
    id,
    ownerUserId: input.ownerUserId,
    title: input.title,
    targetQty: input.targetQty,
    soldQty: 0,
    endsAt,
    createdAt: new Date(now).toISOString()
  };
  campaigns.set(id, campaign);
  return campaign;
}

export function tickGroupBuyCampaign(campaignId: string, ownerUserId: string, soldQtyDelta: number) {
  const row = campaigns.get(campaignId);
  if (!row) return null;
  row.soldQty = Math.max(0, row.soldQty + soldQtyDelta);
  campaigns.set(campaignId, row);
  const remainMs = Math.max(0, new Date(row.endsAt).getTime() - Date.now());
  const payload = {
    type: "groupbuy.tick",
    campaignId: row.id,
    soldQty: row.soldQty,
    targetQty: row.targetQty,
    remainMs
  };
  ssePublish(ownerUserId, payload);
  return { ...row, remainMs };
}

export function getGroupBuyTick(campaignId: string) {
  const row = campaigns.get(campaignId);
  if (!row) return null;
  const remainMs = Math.max(0, new Date(row.endsAt).getTime() - Date.now());
  return { ...row, remainMs };
}

