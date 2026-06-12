import { useCallback, useEffect, useState } from "react";
import ModalCloseButton from "../common/ModalCloseButton";
import AuctionCountdown from "./AuctionCountdown.jsx";
import MarketPriceModal from "./MarketPriceModal.jsx";
import MarketPriceReport from "./MarketPriceReport.jsx";
import {
  fetchAuctionDetail,
  postAuctionBid,
  postAuctionEscrowConfirm,
  postAuctionEscrowHold
} from "../../lib/auctionApi.js";
import { VLUE_SSE_APP_EVENT } from "../../lib/vlueSse.js";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function AuctionDetailSheet({ auctionId, open, onClose, onToast, isLoggedIn }) {
  const [detail, setDetail] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!auctionId) return;
    const data = await fetchAuctionDetail(auctionId);
    setDetail(data);
    const minNext = data.auction.bidCount > 0 ? data.auction.currentPriceKrw + 1000 : data.auction.startPriceKrw;
    setBidAmount(String(minNext));
  }, [auctionId]);

  useEffect(() => {
    if (!open || !auctionId) return undefined;
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오기 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, auctionId, refresh]);

  useEffect(() => {
    if (!open || !auctionId) return undefined;
    const id = window.setInterval(() => {
      refresh().catch(() => {});
    }, 2000);
    const onSse = (e) => {
      const payload = e?.detail;
      if (payload?.auctionId === auctionId && payload?.type === "auction.bid") {
        refresh().catch(() => {});
      }
    };
    window.addEventListener(VLUE_SSE_APP_EVENT, onSse);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(VLUE_SSE_APP_EVENT, onSse);
    };
  }, [open, auctionId, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !auctionId) return null;

  const auction = detail?.auction;
  const market = auction?.marketPriceJson;

  const placeBid = async () => {
    if (!isLoggedIn) {
      setError("로그인 후 입찰할 수 있습니다.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postAuctionBid(auctionId, Number(bidAmount));
      await refresh();
      onToast?.("입찰이 반영되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "입찰 실패");
    } finally {
      setBusy(false);
    }
  };

  const holdEscrow = async () => {
    setBusy(true);
    setError("");
    try {
      await postAuctionEscrowHold(auctionId);
      await refresh();
      onToast?.("에스크로 결제가 보관되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "에스크로 실패");
    } finally {
      setBusy(false);
    }
  };

  const confirmEscrow = async () => {
    setBusy(true);
    setError("");
    try {
      await postAuctionEscrowConfirm(auctionId);
      await refresh();
      onToast?.("구매 확정 · 판매자 정산 대기");
    } catch (e) {
      setError(e instanceof Error ? e.message : "확정 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="닫기" />
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">VLUE 경매</p>
            <h2 className="text-lg font-black text-slate-900">{auction?.title || "경매 상품"}</h2>
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>

        {loading ? <p className="py-10 text-center text-sm text-slate-500">불러오는 중…</p> : null}

        {auction ? (
          <div className="space-y-4">
            <div className={`rounded-xl border px-4 py-3 ${auction.urgent ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-500">마감까지</p>
                <AuctionCountdown endsAt={auction.endsAt} remainMs={auction.remainMs} urgent={auction.urgent} />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatKrw(auction.currentPriceKrw)}</p>
              <p className="text-xs text-slate-500">입찰 {auction.bidCount}회 · 시작가 {formatKrw(auction.startPriceKrw)}</p>
            </div>

            <MarketPriceReport
              market={market}
              currentBidKrw={auction.currentPriceKrw}
              onOpenModal={() => setMarketOpen(true)}
            />

            <div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{auction.description}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-black text-slate-700">입찰하기</p>
              <input
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
              />
              <button
                type="button"
                disabled={busy || auction.status !== "live"}
                onClick={placeBid}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                입찰
              </button>
              {auction.buyNowPriceKrw ? (
                <p className="text-[11px] text-slate-500">즉시 구매가: {formatKrw(auction.buyNowPriceKrw)}</p>
              ) : null}
            </div>

            {detail?.escrow?.status === "held" ? (
              <button
                type="button"
                disabled={busy}
                onClick={confirmEscrow}
                className="w-full rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-sm font-black text-emerald-800"
              >
                구매 확정 (판매자 정산)
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || auction.status !== "ended"}
                onClick={holdEscrow}
                className="w-full rounded-xl border border-violet-300 bg-violet-50 py-2.5 text-sm font-black text-violet-800"
              >
                낙찰 · 에스크로 결제
              </button>
            )}

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        ) : null}

        <MarketPriceModal
          open={marketOpen}
          keyword={auction?.title}
          onClose={() => setMarketOpen(false)}
          currentBidKrw={auction?.currentPriceKrw || 0}
        />
      </div>
    </div>
  );
}
