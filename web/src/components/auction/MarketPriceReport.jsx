function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function MarketPriceReport({ market, currentBidKrw = 0, onOpenModal }) {
  const available = Boolean(market?.available && market?.lowest_price);
  const diff = available && currentBidKrw > 0 ? market.lowest_price - currentBidKrw : null;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-black text-blue-800">🔍 실시간 시장검색 리포트</p>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[10px] font-bold text-blue-600 underline"
        >
          상세 보기
        </button>
      </div>

      {!available ? (
        <p className="text-xs leading-relaxed text-slate-600">
          해당 상품은 시중 비교 데이터가 없는 고유 상품입니다. VLUE 자체 경매 트렌드를 참고하여 입찰하세요.
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-600">
            시중 최저가 <strong>{formatKrw(market.lowest_price)}</strong> · 평균 {formatKrw(market.average_price)}
          </p>
          {diff > 0 ? (
            <p className="mt-1 text-sm font-black text-emerald-700">
              현재 입찰가({formatKrw(currentBidKrw)})는 시중 최저가({formatKrw(market.lowest_price)})보다 {formatKrw(diff)} 더 저렴합니다!
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
