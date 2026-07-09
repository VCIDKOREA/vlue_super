import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ModalCloseButton from "../common/ModalCloseButton";
import { fetchAuctionMarketPrice } from "../../lib/auctionApi.js";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function MarketPriceModal({ open, keyword, onClose, currentBidKrw = 0 }) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !keyword?.trim()) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAuctionMarketPrice(keyword)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "조회 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, keyword]);

  if (!open) return null;

  const available = Boolean(info?.available && info?.lowest_price);
  const diff =
    available && currentBidKrw > 0 && info.lowest_price
      ? info.lowest_price - currentBidKrw
      : null;

  const modal = (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="닫기" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-black text-slate-900">시중가 확인</h3>
            <p className="text-xs text-slate-500 mt-0.5">{keyword}</p>
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>

        {loading ? <p className="py-8 text-center text-sm text-slate-500">시장검색 중…</p> : null}
        {error ? <p className="py-6 text-center text-sm text-rose-600">{error}</p> : null}

        {!loading && !error && !available ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            해당 상품은 시중 비교 데이터가 없는 고유 상품입니다. VLUE 자체 경매 트렌드를 참고하여 입찰하세요.
          </p>
        ) : null}

        {!loading && !error && available ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500">최저가</p>
                <p className="text-sm font-black text-blue-700">{formatKrw(info.lowest_price)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500">평균가</p>
                <p className="text-sm font-black text-slate-800">{formatKrw(info.average_price)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-bold text-slate-500">최고가</p>
                <p className="text-sm font-black text-slate-600">{formatKrw(info.highest_price)}</p>
              </div>
            </div>

            {diff != null && diff > 0 ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                현재 입찰가({formatKrw(currentBidKrw)})는 시중 최저가({formatKrw(info.lowest_price)})보다 {formatKrw(diff)} 더 저렴합니다!
              </p>
            ) : null}

            <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {(info.shop_links || []).map((shop) => (
                <li key={`${shop.shop_name}-${shop.url}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-700 truncate">{shop.shop_name}</span>
                  <a
                    href={shop.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-bold text-blue-600 hover:underline"
                  >
                    {formatKrw(shop.price)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
