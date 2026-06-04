import { useMemo, useState } from "react";
import { requestIamportShopPay } from "../lib/iamportClient.js";
import { formatKrwDisplay } from "../lib/vlueStoreStorage.js";
import {
  getServerUserId,
  postShopPaymentComplete,
  prepareShopOrder,
  syncStoreProductToServer
} from "../lib/shopApi.js";

/**
 * VLUE PAGE 상점 — 포트원 일반결제(단발) 체크아웃
 */
export default function ShopCheckout({ product, sellerUserId, onClose, onPaid }) {
  const [payMethod, setPayMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pricing = useMemo(() => {
    const unit = product.salePriceKrw != null ? product.salePriceKrw : product.priceKrw;
    const shipping = product.shippingFeeKrw || 0;
    return { unit, shipping, total: unit + shipping };
  }, [product]);

  const sellerId = sellerUserId || getServerUserId();

  const runPay = async (devBypass = false) => {
    setError("");
    setBusy(true);
    try {
      const buyerId = getServerUserId();
      if (!buyerId) {
        throw new Error("로그인·본인인증 후 결제할 수 있습니다.");
      }

      await syncStoreProductToServer(product);

      const merchantUid = `shop_order_${Date.now()}`;
      const prep = await prepareShopOrder({
        sellerUserId: sellerId,
        externalProductId: product.id,
        payMethod,
        merchantUid
      });

      let impUid;
      let finalMerchantUid = prep.merchantUid;

      if (devBypass && import.meta.env?.DEV) {
        impUid = `dev_shop_${Date.now()}`;
      } else {
        const rsp = await requestIamportShopPay({
          merchantUid: prep.merchantUid,
          amount: prep.amount,
          name: product.name,
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

      onPaid?.({ orderId: prep.orderId, amount: prep.amount });
      onClose?.();
    } catch (e) {
      setError(e?.message || "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        role="dialog"
        aria-labelledby="shop-checkout-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p id="shop-checkout-title" className="text-[15px] font-black text-gray-900">
              결제하기
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold text-gray-600">{product.name}</p>
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

        <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-[12px]">
          <div className="flex justify-between">
            <span className="text-gray-600">상품</span>
            <span className="font-bold">{formatKrwDisplay(pricing.unit)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-600">배송비</span>
            <span className="font-bold">{formatKrwDisplay(pricing.shipping)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-violet-100 pt-2">
            <span className="font-black text-violet-950">합계</span>
            <span className="font-black text-violet-700">{formatKrwDisplay(pricing.total)}</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] font-bold text-gray-700">결제 수단</p>
        <div className="mt-1 flex gap-2">
          {[
            { id: "card", label: "카드" },
            { id: "trans", label: "실시간 계좌이체" }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => setPayMethod(m.id)}
              className={`flex-1 rounded-lg border py-2 text-[11px] font-black ${
                payMethod === m.id
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-2 py-2 text-[11px] font-semibold text-red-800">{error}</p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => runPay(false)}
          className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-[13px] font-black text-white disabled:opacity-60"
        >
          {busy ? "결제 처리 중…" : `${formatKrwDisplay(pricing.total)} 결제`}
        </button>

        {import.meta.env?.DEV && (
          <button
            type="button"
            disabled={busy}
            onClick={() => runPay(true)}
            className="mt-2 w-full rounded-xl border border-dashed border-gray-300 py-2 text-[11px] font-bold text-gray-600"
          >
            개발: PG 없이 결제 완료 처리
          </button>
        )}
      </div>
    </div>
  );
}
