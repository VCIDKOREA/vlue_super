import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { fetchAuctionList } from "../../lib/auctionApi.js";
import AuctionCountdown from "./AuctionCountdown.jsx";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function AuctionListSection({ onSelect, category = "전체" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAuctionList({ category, limit: 40 })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "목록 로드 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  if (loading) {
    return <p className="py-16 text-center text-sm text-slate-500">VLUE 경매 목록을 불러오는 중…</p>;
  }

  if (error) {
    return <p className="py-16 text-center text-sm text-rose-600">{error}</p>;
  }

  if (!items.length) {
    return (
      <div className="py-16 text-center">
        <Gavel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-600">진행 중인 경매가 없습니다</p>
        <p className="text-xs text-slate-400 mt-1">개인 경매로 첫 상품을 등록해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const thumb = item.imageUrls?.[0];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item)}
            className="text-left rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="aspect-[4/3] bg-slate-100 relative">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full grid place-items-center text-slate-300">
                  <Gavel className="w-8 h-8" />
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">
                VLUE 경매
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-black text-slate-900 line-clamp-2">{item.title}</h3>
              <p className="mt-1 text-lg font-black text-blue-700">{formatKrw(item.currentPriceKrw)}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">입찰 {item.bidCount}회</span>
                <AuctionCountdown
                  remainMs={item.remainMs}
                  urgent={item.urgent}
                  className={`text-[11px] ${item.urgent ? "text-red-600" : "text-slate-600"}`}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
