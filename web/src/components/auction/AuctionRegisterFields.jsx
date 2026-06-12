import { useState } from "react";
import MarketPriceModal from "./MarketPriceModal.jsx";
import { parsePriceDigits } from "../../lib/sourcingProductFormUtils.js";

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildDefaultAuctionFields() {
  const start = new Date(Date.now() + 10 * 60 * 1000);
  const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return {
    startsAt: toLocalInputValue(start.toISOString()),
    endsAt: toLocalInputValue(end.toISOString()),
    startPrice: "",
    buyNowPrice: "",
    condition: "used_item",
    shippingFee: "0",
    keywords: ""
  };
}

export default function AuctionRegisterFields({
  form,
  patch,
  inputCls,
  sub,
  busy,
  setBusy,
  setError,
  onToast
}) {
  const [marketOpen, setMarketOpen] = useState(false);

  const auction = form.auction || buildDefaultAuctionFields();

  const patchAuction = (partial) => patch({ auction: { ...auction, ...partial } });

  return (
    <>
      <div className="space-y-3">
        <label className={`block min-w-0 text-[12px] font-semibold ${sub}`}>
          경매 시작 일시 <span className="text-rose-500">*</span>
          <input
            type="datetime-local"
            value={auction.startsAt}
            onChange={(e) => patchAuction({ startsAt: e.target.value })}
            className={`${inputCls} sourcing-datetime-input mt-1 w-full min-w-0 max-w-full`}
          />
        </label>
        <label className={`block min-w-0 text-[12px] font-semibold ${sub}`}>
          경매 종료 일시 <span className="text-rose-500">*</span>
          <input
            type="datetime-local"
            value={auction.endsAt}
            onChange={(e) => patchAuction({ endsAt: e.target.value })}
            className={`${inputCls} sourcing-datetime-input mt-1 w-full min-w-0 max-w-full`}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={`block text-[12px] font-semibold ${sub}`}>
          시작 금액 <span className="text-rose-500">*</span>
          <div className="mt-1 flex gap-2">
            <input
              value={auction.startPrice}
              onChange={(e) => patchAuction({ startPrice: e.target.value.replace(/[^\d,]/g, "") })}
              placeholder="예: 100,000"
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={() => setMarketOpen(true)}
              className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700"
            >
              시중가 확인
            </button>
          </div>
        </label>
        <label className={`block text-[12px] font-semibold ${sub}`}>
          즉시 구매가 (선택)
          <input
            value={auction.buyNowPrice}
            onChange={(e) => patchAuction({ buyNowPrice: e.target.value.replace(/[^\d,]/g, "") })}
            placeholder="비우면 미사용"
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={`block text-[12px] font-semibold ${sub}`}>
          상품 상태
          <select
            value={auction.condition}
            onChange={(e) => patchAuction({ condition: e.target.value })}
            className={`${inputCls} mt-1`}
          >
            <option value="new_item">새상품</option>
            <option value="used_item">중고</option>
          </select>
        </label>
        <label className={`block text-[12px] font-semibold ${sub}`}>
          배송비
          <input
            value={auction.shippingFee}
            onChange={(e) => patchAuction({ shippingFee: e.target.value.replace(/[^\d,]/g, "") })}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>

      <label className={`mt-3 block text-[12px] font-semibold ${sub}`}>
        관심 키워드 (푸시 매칭용)
        <input
          value={auction.keywords}
          onChange={(e) => patchAuction({ keywords: e.target.value })}
          placeholder="예: 아이패드, 맥북, 게이밍 노트북"
          className={`${inputCls} mt-1`}
        />
      </label>

      <MarketPriceModal
        open={marketOpen}
        keyword={form.title}
        onClose={() => setMarketOpen(false)}
        currentBidKrw={Number(parsePriceDigits(auction.startPrice)) || 0}
      />
    </>
  );
}

export function auctionPayloadFromForm(form, media) {
  const auction = form.auction || buildDefaultAuctionFields();
  return {
    title: form.title.trim(),
    description: form.description.trim() || form.draft?.marketingDescription || "",
    category: form.category,
    keywords: auction.keywords || form.hashtags?.join?.(" ") || "",
    condition: auction.condition,
    shippingFeeKrw: Number(parsePriceDigits(auction.shippingFee)) || 0,
    imageUrls: media?.imageUrls?.slice(0, 12) || form.previews?.slice(0, 12) || [],
    videoUrl: media?.videoUrl || form.videoUrl || null,
    startPriceKrw: Number(parsePriceDigits(auction.startPrice)) || 0,
    buyNowPriceKrw: Number(parsePriceDigits(auction.buyNowPrice)) || null,
    startsAt: new Date(auction.startsAt).toISOString(),
    endsAt: new Date(auction.endsAt).toISOString(),
    fetchMarketPrice: true
  };
}
