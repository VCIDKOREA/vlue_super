import { apiUrl } from "./apiBase.js";
import { requestIamportShopPay } from "./iamportClient.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";
import { postGroupBuyTick } from "./vlueCoreShoppingApi.js";
import { addVaultItem } from "./vlueCoreShoppingApi.js";
import { emitVaultChanged } from "./shoppingCoreStorage.js";
import { readCampaignCommerceMeta } from "./mediaCommerceFeedService.js";
import { getServerUserId } from "./shopApi.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `요청 실패 (${res.status})`);
  }
  return data;
}

/** 에스크로 결제 준비 — merchant_uid 발급 */
export async function prepareMediaEscrowCheckout({ item, campaignId, sellerUserId }) {
  const product = item?.product || {};
  const meta = campaignId ? readCampaignCommerceMeta(campaignId) : null;
  const amountKrw = Number(product.priceKrw) || meta?.priceKrw || 0;
  const res = await vlueAuthFetch(apiUrl("/api/media-commerce/escrow/prepare"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerUserId: sellerUserId || getServerUserId(),
      feedId: item.id,
      campaignId,
      productTitle: product.title || item.overlayCaption || "라이브 특가",
      amountKrw
    })
  });
  return parseJson(res);
}

/** Iamport 팝업 → ESCROW_HOLD 완료 */
export async function completeMediaEscrowCheckout({ merchantUid, impUid }) {
  const res = await vlueAuthFetch(apiUrl("/api/media-commerce/escrow/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantUid, impUid })
  });
  return parseJson(res);
}

/**
 * 라이브/VOD 인앱 에스크로 결제 — 화면 이탈 없이 Iamport 팝업
 * payment_status: ESCROW_HOLD 활성화
 */
export async function runMediaCommerceEscrowPay({ item, campaignId, sellerUserId }) {
  const prepared = await prepareMediaEscrowCheckout({ item, campaignId, sellerUserId });
  const payRsp = await requestIamportShopPay({
    merchantUid: prepared.merchantUid,
    amount: prepared.amount,
    name: prepared.productTitle || "라이브 특가 구매"
  });
  const completed = await completeMediaEscrowCheckout({
    merchantUid: payRsp.merchant_uid || prepared.merchantUid,
    impUid: payRsp.imp_uid
  });

  if (campaignId) {
    await postGroupBuyTick(campaignId, 1);
  }

  const product = item?.product || {};
  await addVaultItem({
    title: product.title || "라이브 특가 구매",
    kind: "order",
    payloadJson: {
      feedId: item.id,
      campaignId,
      paymentStatus: completed.paymentStatus || "ESCROW_HOLD",
      escrowId: completed.escrowId,
      priceKrw: prepared.amount,
      paidAt: new Date().toISOString()
    }
  });
  emitVaultChanged();

  return completed;
}
