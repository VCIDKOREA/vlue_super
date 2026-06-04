import { useCallback, useEffect, useState } from "react";
import CountdownTicker from "./CountdownTicker.jsx";
import { platformLabel } from "../../lib/mediaCommerceCatalog.js";
import {
  completeFeedCheckout,
  ensureCampaignForFeedItem,
  readCampaignCommerceMeta
} from "../../lib/mediaCommerceFeedService.js";
import { fetchGroupBuyTick } from "../../lib/vlueCoreShoppingApi.js";
import ChannelProfileLink from "./ChannelProfileLink.jsx";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

/** 숏폼·라이브 우측 오버레이 — 타이머 + 결제 */
export default function CommerceSideRail({ item, onToast, onOpenStore, compact = false }) {
  const [tick, setTick] = useState(null);
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const product = item?.product;
  const meta = campaignId ? readCampaignCommerceMeta(campaignId) : null;
  const priceKrw = Number(product?.priceKrw) || meta?.priceKrw || 0;
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
    if (!item) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await ensureCampaignForFeedItem(item);
        if (!cancelled) {
          setCampaignId(result.campaignId);
          setTick(result.tick);
        }
      } catch (e) {
        if (!cancelled) setError("공구 연동 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  useEffect(() => {
    if (!campaignId) return undefined;
    const id = window.setInterval(refreshTick, 1500);
    return () => window.clearInterval(id);
  }, [campaignId, refreshTick]);

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      await completeFeedCheckout({ item, campaignId });
      onToast?.("결제 완료 · 보관함 저장");
      await refreshTick();
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 실패");
    } finally {
      setBusy(false);
    }
  };

  if (!item) return null;

  return (
    <div
      className={`flex flex-col gap-2 ${compact ? "w-[108px]" : "w-[min(42vw,148px)]"} rounded-2xl border border-white/20 bg-black/55 p-2.5 text-white shadow-xl backdrop-blur-md`}
    >
      <ChannelProfileLink item={item} onOpenStore={onOpenStore} layout="column" size="sm" />
      <p className="line-clamp-2 text-[10px] font-bold leading-snug">{product?.title || item.overlayCaption}</p>
      <p className="text-[9px] text-white/70">{platformLabel(product?.platform)}</p>
      <p className="text-[15px] font-black text-amber-300">{formatKrw(priceKrw)}</p>
      {!compact ? (
        <div className="scale-[0.82] origin-top">
          <CountdownTicker remainMs={tick?.remainMs ?? 0} ended={ended} />
        </div>
      ) : (
        <p className="text-center text-[10px] font-mono font-bold text-rose-300">
          {ended ? "마감" : "공구 진행중"}
        </p>
      )}
      <button
        type="button"
        disabled={busy || ended || loading}
        onClick={pay}
        className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 py-2.5 text-[11px] font-black disabled:opacity-50"
      >
        {busy ? "…" : "바로 결제"}
      </button>
      {error ? <p className="text-[9px] text-rose-300">{error}</p> : null}
    </div>
  );
}
