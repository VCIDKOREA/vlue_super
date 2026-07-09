import { useCallback, useEffect, useState } from "react";
import CountdownTicker from "./CountdownTicker.jsx";
import { platformLabel } from "../../lib/mediaCommerceCatalog.js";
import { isEmbeddableVideoUrl } from "../../lib/embedVideo.js";
import ProductMediaDisplay from "./ProductMediaDisplay.jsx";
import LiveCommerceShell from "./LiveCommerceShell.jsx";
import CommerceSideRail from "./CommerceSideRail.jsx";
import { runMediaCommerceEscrowPay } from "../../lib/mediaCommerceEscrowCheckout.js";
import { getPortoneUserCode } from "../../lib/portoneEnv.js";
import {
  completeFeedCheckout,
  ensureCampaignForFeedItem,
  readCampaignCommerceMeta
} from "../../lib/mediaCommerceFeedService.js";
import { fetchGroupBuyTick } from "../../lib/vlueCoreShoppingApi.js";
import ChannelProfileLink from "./ChannelProfileLink.jsx";
import RelatedProductsStrip from "./RelatedProductsStrip.jsx";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function MediaCommercePlayerSheet({
  item,
  open,
  onClose,
  onToast,
  isDarkMode = false,
  onOpenStore,
  onOpenRelated,
  isGuestMode = false,
  onRequireAuth
}) {
  const [tick, setTick] = useState(null);
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const product = item?.product;
  const sellerVideoUrl = product?.videoUrl || item?.videoUrl || "";
  const pageImageUrls = product?.imageUrls?.length
    ? product.imageUrls
    : product?.imageUrl
      ? [product.imageUrl]
      : item?.thumbUrl
        ? [item.thumbUrl]
        : [];
  const isPageLike = item?.commerceChannel === "page" || Boolean(sellerVideoUrl && !item?.youtubeVideoId);
  const meta = campaignId ? readCampaignCommerceMeta(campaignId) : null;
  const priceKrw = Number(product?.priceKrw) || meta?.priceKrw || 0;
  const compareKrw = meta?.comparePriceKrw || (priceKrw ? Math.round(priceKrw * 1.2) : 0);
  const ended = (tick?.remainMs ?? 0) <= 0;

  const refreshTick = useCallback(async () => {
    if (!campaignId) return;
    try {
      const { tick: t } = await fetchGroupBuyTick(campaignId);
      setTick(t);
    } catch {
      /* ignore */
    }
  }, [campaignId]);

  useEffect(() => {
    if (!open || !item) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await ensureCampaignForFeedItem(item);
        if (cancelled) return;
        setCampaignId(result.campaignId);
        setTick(result.tick);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "공구 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  useEffect(() => {
    if (!open || !campaignId) return undefined;
    const id = window.setInterval(refreshTick, 1500);
    return () => window.clearInterval(id);
  }, [open, campaignId, refreshTick]);

  if (!open || !item) return null;

  const runCheckout = async () => {
    if (!agreed) {
      setError("구매 조건에 동의해 주세요.");
      return;
    }
    if (ended) {
      setError("마감된 공구입니다.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (getPortoneUserCode()) {
        await runMediaCommerceEscrowPay({ item, campaignId });
        onToast?.("에스크로 결제 완료 · 대금이 안전하게 예치되었습니다 (ESCROW_HOLD).");
      } else {
        const nextTick = await completeFeedCheckout({ item, campaignId });
        setTick(nextTick);
        onToast?.("결제 완료 · 파트너십 보관함에 저장되었습니다.");
      }
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const pay = () => {
    if (isGuestMode) {
      onRequireAuth?.(() => runCheckout());
      return;
    }
    runCheckout();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/90" role="dialog" aria-modal="true">
      <div className="flex shrink-0 items-center justify-between px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white">
          닫기
        </button>
        {item.isLive ? (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white animate-pulse">LIVE</span>
        ) : null}
      </div>

      <div className="relative w-full shrink-0 bg-black">
        {sellerVideoUrl || item.youtubeVideoId ? (
          <LiveCommerceShell
            videoUrl={sellerVideoUrl}
            youtubeVideoId={item.youtubeVideoId}
            title={product?.title || "상품 영상"}
            isLive={Boolean(item.isLive)}
            commerceRail={
              <CommerceSideRail
                item={item}
                onToast={onToast}
                onOpenStore={onOpenStore}
                isGuestMode={isGuestMode}
                onRequireAuth={onRequireAuth}
              />
            }
          />
        ) : isPageLike && pageImageUrls.length ? (
          <div className="aspect-square max-h-[50vh] w-full overflow-hidden">
            <img src={pageImageUrls[0]} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center text-[12px] text-white/70">
            미디어 없음
          </div>
        )}
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          isDarkMode ? "bg-[#0f1118]" : "bg-white"
        }`}
      >
        <div className="mx-auto max-w-lg space-y-3 py-3">
          {loading ? (
            <p className="text-center text-[12px] text-slate-500">상품·공구 연동 중…</p>
          ) : null}

          <ChannelProfileLink item={item} onOpenStore={onOpenStore} isDarkMode={isDarkMode} />

          {isPageLike && (pageImageUrls.length > 1 || (isEmbeddableVideoUrl(sellerVideoUrl) && pageImageUrls.length)) ? (
            <ProductMediaDisplay
              videoUrl=""
              imageUrls={pageImageUrls}
              item={item}
              isDarkMode={isDarkMode}
            />
          ) : null}

          <div>
            <p className="text-[11px] font-bold text-indigo-600">
              {platformLabel(product?.platform)} · {item.mediaPlatform.toUpperCase()}
            </p>
            <h2 className={`mt-2 text-[17px] font-black leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {product?.title || "연동 상품"}
            </h2>
            {product?.sourceUrl ? (
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] font-medium text-blue-600 underline"
              >
                원본 상품 페이지
              </a>
            ) : null}
          </div>

          <div className="flex items-end gap-2">
            <span className="text-[22px] font-black text-rose-600">{formatKrw(priceKrw)}</span>
            {compareKrw > priceKrw ? (
              <span className="text-[13px] text-slate-400 line-through">{formatKrw(compareKrw)}</span>
            ) : null}
          </div>

          <CountdownTicker remainMs={tick?.remainMs ?? 0} ended={ended} />

          {tick ? (
            <p className="text-center text-[11px] font-semibold text-slate-600">
              공구 달성 {tick.soldQty} / {tick.targetQty}
            </p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2 text-[12px] text-slate-700">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>라이브 공구 특가·배송 안내에 동의합니다. 결제 내역은 Partnership Vault에 저장됩니다.</span>
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={busy || ended || loading}
            onClick={pay}
            className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 py-3.5 text-[15px] font-black text-white shadow-lg disabled:opacity-50"
          >
            {busy ? "처리 중…" : ended ? "마감됨" : item.isLive ? "라이브 특가 구매하기" : "바로 결제"}
          </button>

          <RelatedProductsStrip
            currentItem={item}
            isDarkMode={isDarkMode}
            onOpen={(next) => onOpenRelated?.(next)}
          />
        </div>
      </div>
    </div>
  );
}
