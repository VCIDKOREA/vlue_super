import { useMemo, useState } from "react";
import CartProductThumb from "./CartProductThumb.jsx";
import { addPushNotification } from "../lib/pushNotificationInbox.js";
import { requestIamportShopPay } from "../lib/iamportClient.js";
import { isVlueNetworkError } from "../lib/networkError.js";
import {
  ensureStoreProductSynced,
  getServerUserId,
  postShopPaymentComplete,
  prepareShopOrder
} from "../lib/shopApi.js";
import { cartSelectedSubtotal, cartShippingFee, lineTotal, removeCartItemsByIds } from "../lib/shoppingCartStorage.js";
import { formatKrwDisplay, getStoreProduct } from "../lib/vlueStoreStorage.js";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

/**
 * 장바구니 선택 상품 결제 — 서버 주문 prepare·결제 검증 단일 파이프라인
 */
export default function StoreCartCheckoutModal({ open, items, onClose, onPaid, onToast }) {
  const [payMethod, setPayMethod] = useState("card");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(() => cartSelectedSubtotal(items), [items]);
  const shipping = useMemo(() => cartShippingFee(items), [items]);
  const total = subtotal + shipping;

  if (!open || !items?.length) return null;

  const runPay = async (devBypass = false) => {
    if (!agreed && !devBypass) {
      setError("구매 조건에 동의해 주세요.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const buyerId = getServerUserId();
      if (!buyerId && !devBypass) {
        throw new Error("로그인·본인인증 후 결제할 수 있습니다.");
      }

      const orderIds = [];
      let paidTotal = 0;

      for (const line of items) {
        if (!line.productId) {
          throw new Error("서버에 등록되지 않은 상품이 포함되어 있습니다.");
        }
        const localProduct = getStoreProduct(line.productId) || {
          id: line.productId,
          name: line.name,
          priceKrw: line.price,
          salePriceKrw: null,
          shippingFeeKrw: line.shippingFeeKrw ?? 0,
          stock: 99,
          status: "on_sale"
        };
        await ensureStoreProductSynced(localProduct);

        const sellerUserId = String(line.sellerUserId || getServerUserId()).trim();
        const prep = await prepareShopOrder({
          sellerUserId,
          externalProductId: line.productId,
          quantity: line.qty || 1,
          payMethod
        });

        let impUid;
        let finalMerchantUid = prep.merchantUid;

        if (devBypass && import.meta.env?.DEV) {
          impUid = `dev_cart_${Date.now()}_${line.id}`;
        } else if (!devBypass) {
          const rsp = await requestIamportShopPay({
            merchantUid: prep.merchantUid,
            amount: prep.amount,
            name: line.name,
            payMethod
          });
          impUid = rsp.imp_uid;
          finalMerchantUid = rsp.merchant_uid || prep.merchantUid;
        }

        await postShopPaymentComplete({
          imp_uid: impUid,
          merchant_uid: finalMerchantUid,
          devShopBypass: devBypass
        });

        orderIds.push(prep.orderId);
        paidTotal += prep.amount;
      }

      const names = items.map((it) => it.name).join(", ");
      addPushNotification({
        category: "배송",
        title: "결제 완료",
        body: `「${names.slice(0, 40)}${names.length > 40 ? "…" : ""}」 주문이 접수되었습니다. 배송 준비 중입니다.`
      });

      removeCartItemsByIds(items.map((it) => it.id));
      onPaid?.({ amount: paidTotal, itemCount: items.length, orderIds });
      onToast?.("결제가 완료되었습니다.");
      onClose?.();
    } catch (e) {
      const msg = isVlueNetworkError(e)
        ? e.message
        : e?.message || "결제 처리 중 오류가 발생했습니다.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-3">
      <div
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="cart-checkout-title"
      >
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p id="cart-checkout-title" className="text-[16px] font-black text-gray-900">
                결제하기
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">선택 {items.length}건 · {formatKrw(total)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-gray-500"
            >
              닫기
            </button>
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {items.map((it) => (
            <li key={it.id} className="mb-2 flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
              <CartProductThumb item={it} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12px] font-bold text-gray-900">{it.name}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {formatKrw(it.price)}
                  {it.qty > 1 ? ` × ${it.qty}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-[12px] font-black text-gray-900">{formatKrw(lineTotal(it))}</p>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3">
          <div className="rounded-xl bg-violet-50 px-3 py-2.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-gray-600">상품 금액</span>
              <span className="font-bold">{formatKrwDisplay(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-gray-600">배송비</span>
              <span className="font-bold">{shipping > 0 ? formatKrwDisplay(shipping) : "무료"}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-violet-100 pt-2">
              <span className="font-black text-violet-950">총 결제금액</span>
              <span className="font-black text-violet-700">{formatKrwDisplay(total)}</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] font-bold text-gray-700">결제 수단</p>
          <div className="mt-1 flex gap-2">
            {[
              { id: "card", label: "카드" },
              { id: "trans", label: "계좌이체" }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => setPayMethod(m.id)}
                className={`flex-1 rounded-lg border py-2 text-[11px] font-black ${
                  payMethod === m.id ? "border-violet-600 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-gray-600">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>주문 내용 확인 및 개인정보 제공, 결제 대행 서비스 이용에 동의합니다.</span>
          </label>

          {error ? <p className="mt-2 rounded-lg bg-red-50 px-2 py-2 text-[11px] font-semibold text-red-800">{error}</p> : null}

          <button
            type="button"
            disabled={busy || !items.length}
            onClick={() => runPay(false)}
            className="mt-3 w-full rounded-xl bg-violet-600 py-3.5 text-[14px] font-black text-white disabled:opacity-60"
          >
            {busy ? "결제 처리 중…" : `${formatKrw(total)} 결제하기`}
          </button>

          {import.meta.env?.DEV ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runPay(true)}
              className="mt-2 w-full rounded-xl border border-dashed border-gray-300 py-2 text-[11px] font-bold text-gray-600"
            >
              개발: PG 없이 결제 완료
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
