import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cartSelectedSubtotal,
  cartSelectedTotal,
  cartShippingFee,
  lineTotal,
  readCartItems,
  setAllCartChecked,
  setCartChecked,
  SHOPPING_CART_CHANGED
} from "../lib/shoppingCartStorage.js";
import CartProductThumb from "./CartProductThumb.jsx";
import StoreCartCheckoutModal from "./StoreCartCheckoutModal.jsx";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function StoreShoppingCartPanel({ onToast }) {
  const [items, setItems] = useState(() => readCartItems());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState([]);

  const refresh = useCallback(() => setItems(readCartItems()), []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(SHOPPING_CART_CHANGED, onChange);
    return () => window.removeEventListener(SHOPPING_CART_CHANGED, onChange);
  }, [refresh]);

  const selected = useMemo(() => items.filter((it) => it.checked), [items]);
  const subtotal = useMemo(() => cartSelectedSubtotal(items), [items]);
  const shipping = useMemo(() => cartShippingFee(selected), [selected]);
  const total = useMemo(() => cartSelectedTotal(items), [items]);
  const allChecked = items.length > 0 && items.every((it) => it.checked);
  const someChecked = items.some((it) => it.checked);

  const openCheckout = useCallback(
    (lines) => {
      if (!lines.length) {
        onToast?.("결제할 상품을 선택해 주세요.");
        return;
      }
      setCheckoutItems(lines);
      setCheckoutOpen(true);
    },
    [onToast]
  );

  const openCheckoutForItem = useCallback(
    (item) => {
      openCheckout([{ ...item, checked: true }]);
    },
    [openCheckout]
  );

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-bold text-gray-500">장바구니가 비어 있습니다</p>
        <p className="mt-1 text-xs text-gray-400">쇼핑에서 담은 상품이 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked && !allChecked;
              }}
              onChange={(e) => setAllCartChecked(e.target.checked)}
            />
            전체 선택
          </label>
          <span className="ml-auto text-[11px] font-semibold text-gray-400">{items.length}개 상품</span>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="mb-2 flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <input
                type="checkbox"
                className="mt-5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                checked={Boolean(it.checked)}
                onChange={(e) => setCartChecked(it.id, e.target.checked)}
              />
              <CartProductThumb item={it} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-blue-600">{it.sellerName || "VLUE 스토어"}</p>
                <p className="mt-0.5 text-[13px] font-bold leading-snug text-gray-900">{it.name}</p>
                <p className="mt-1 text-[12px] text-gray-500">
                  {formatKrw(it.price)}
                  {it.qty > 1 ? ` × ${it.qty}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700"
                  onClick={() => openCheckoutForItem(it)}
                >
                  구매하기
                </button>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
                <p className="text-[13px] font-black text-gray-900">{formatKrw(lineTotal(it))}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-gray-200 bg-[#f8fafc] px-4 py-3 pb-4">
          <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-[12px]">
            <p className="text-[11px] font-black text-gray-800">배송 정보</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
              서울 강남구 · 010-****-7777
              <button type="button" className="ml-1 font-bold text-blue-600">
                변경
              </button>
            </p>
          </div>

          <div className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-[12px]">
            <div className="flex justify-between text-gray-600">
              <span>상품 금액 ({selected.length}건)</span>
              <span className="font-bold text-gray-900">{formatKrw(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-gray-600">
              <span>배송비</span>
              <span className="font-bold text-gray-900">{shipping > 0 ? formatKrw(shipping) : "무료"}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
              <span className="font-black text-gray-800">선택 합계</span>
              <span className="text-[17px] font-black text-blue-600">{formatKrw(total)}</span>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">체크한 상품만 합산됩니다. VLUE 스토어 정산·배송 정책이 적용됩니다.</p>
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
            · 품절·가격 변동 시 장바구니 알림 탭으로 안내됩니다.
            <br />· 디지털 상품은 결제 후 즉시 이용 가능합니다.
          </p>

          <button
            type="button"
            disabled={!selected.length}
            onClick={() => openCheckout(selected)}
            className="mt-3 w-full rounded-xl bg-violet-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:opacity-45"
          >
            {selected.length ? `${formatKrw(total)} 결제하기` : "상품을 선택해 주세요"}
          </button>
        </div>
      </div>

      <StoreCartCheckoutModal
        open={checkoutOpen}
        items={checkoutItems}
        onClose={() => setCheckoutOpen(false)}
        onToast={onToast}
        onPaid={() => {
          setCheckoutOpen(false);
          refresh();
        }}
      />
    </>
  );
}
