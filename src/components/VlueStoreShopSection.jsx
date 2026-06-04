import { useEffect, useState } from "react";
import ShopCheckout from "./ShopCheckout.jsx";
import {
  fetchShopProducts,
  getServerUserId,
  mapServerShopProduct,
  syncStoreProductToServer
} from "../lib/shopApi.js";
import { isVlueNetworkError } from "../lib/networkError.js";
import { canEnterprisePurchase, fetchEnterpriseDashboard } from "../lib/enterpriseShopApi.js";
import {
  addProductToEnterpriseCart,
  requestEnterprisePurchase
} from "./EnterpriseProcurementPanel.jsx";
import { addProductToCart } from "../lib/shoppingCartStorage.js";
import {
  addWishlistItem,
  isWishlistedProduct,
  removeWishlistItem,
  readWishlistItems,
  SHOPPING_CART_HUB_CHANGED
} from "../lib/shoppingCartHubStorage.js";
import {
  formatKrwDisplay,
  isStoreApproved,
  getStoreProduct,
  readStoreProducts
} from "../lib/vlueStoreStorage.js";

/** MY 화면 — 승인된 상점 상품 쇼케이스 + B2B 구매/요청 분기 */
export default function VlueStoreShopSection({ isPaid = false, onManageProducts, onToast }) {
  const [products, setProducts] = useState([]);
  const [cartMsg, setCartMsg] = useState("");
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [enterpriseRole, setEnterpriseRole] = useState("NONE");
  const [, setHubTick] = useState(0);
  const storeName = "VLUE 공식 상점";

  useEffect(() => {
    const bump = () => setHubTick((n) => n + 1);
    window.addEventListener(SHOPPING_CART_HUB_CHANGED, bump);
    return () => window.removeEventListener(SHOPPING_CART_HUB_CHANGED, bump);
  }, []);

  useEffect(() => {
    if (!isPaid) return undefined;
    fetchEnterpriseDashboard()
      .then((d) => setEnterpriseRole(d?.role || "NONE"))
      .catch(() => setEnterpriseRole("NONE"));
  }, [isPaid]);

  useEffect(() => {
    if (!isPaid || !isStoreApproved()) return undefined;
    const load = async () => {
      try {
        const localDrafts = readStoreProducts();
        await Promise.all(localDrafts.map((p) => syncStoreProductToServer(p).catch(() => {})));
        const sellerUserId = getServerUserId();
        const rows = await fetchShopProducts({ sellerUserId, status: "on_sale" });
        const list = rows
          .map((row) => mapServerShopProduct(row, getStoreProduct(row.externalId)))
          .filter((p) => p.status === "on_sale" && p.stock > 0);
        setProducts(list);
      } catch (e) {
        setProducts([]);
        if (isVlueNetworkError(e)) onToast?.(e.message);
      }
    };
    load();
    window.addEventListener("vlue-store-changed", load);
    return () => window.removeEventListener("vlue-store-changed", load);
  }, [isPaid, onToast]);

  if (!isPaid || !isStoreApproved()) return null;

  const canPay = enterpriseRole === "NONE" || canEnterprisePurchase(enterpriseRole);
  const isStaff = enterpriseRole === "STAFF";

  const onProductAction = async (p) => {
    if (enterpriseRole === "NONE") {
      setCheckoutProduct(p);
      return;
    }
    if (canPay) {
      const ok = await addProductToEnterpriseCart(p, (m) => {
        setCartMsg(m);
        onToast?.(m);
      });
      if (ok) setTimeout(() => setCartMsg(""), 5000);
      return;
    }
    if (isStaff) {
      const ok = await requestEnterprisePurchase(p, (m) => {
        setCartMsg(m);
        onToast?.(m);
      });
      if (ok) setTimeout(() => setCartMsg(""), 5000);
    }
  };

  const actionLabel = enterpriseRole === "NONE" ? "구매하기" : canPay ? "공용 장바구니 담기" : "구매 요청";

  const onPaid = (p) => {
    const price = p.salePriceKrw != null ? p.salePriceKrw : p.priceKrw;
    const total = price + (p.shippingFeeKrw || 0);
    const msg = `「${p.name}」 결제가 완료되었습니다. (${formatKrwDisplay(total)})`;
    setCartMsg(msg);
    onToast?.(msg);
    setTimeout(() => setCartMsg(""), 6000);
    fetchShopProducts({ sellerUserId: getServerUserId(), status: "on_sale" })
      .then((rows) =>
        setProducts(
          rows
            .map((row) => mapServerShopProduct(row, getStoreProduct(row.externalId)))
            .filter((x) => x.status === "on_sale" && x.stock > 0)
        )
      )
      .catch(() => {});
  };

  return (
    <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-black text-violet-950">VLUE 상점</p>
          <p className="text-[10px] font-semibold text-violet-800/80">
            {enterpriseRole !== "NONE"
              ? canPay
                ? "회사 예산·법인카드로 결제 (경리/대표)"
                : "구매는 경리 계정으로 요청"
              : "승인 완료 · 결제 판매 가능"}
          </p>
        </div>
        <button type="button" onClick={onManageProducts} className="text-[11px] font-bold text-blue-600">
          상품 관리
        </button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl bg-gray-50 py-6 text-center text-[12px] text-gray-500">
          등록된 판매 상품이 없습니다. 페이지 관리에서 상품을 등록하세요.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {products.map((p) => {
            const price = p.salePriceKrw != null ? p.salePriceKrw : p.priceKrw;
            const wishOn = isWishlistedProduct(p.id);
            return (
              <article key={p.id} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="relative">
                {p.imageDataUrl && (
                  <img src={p.imageDataUrl} alt="" className="aspect-square w-full object-cover" />
                )}
                <button
                  type="button"
                  aria-label={wishOn ? "관심상품 해제" : "관심상품 등록"}
                  onClick={() => {
                    if (wishOn) {
                      const row = readWishlistItems().find((w) => w.productId === p.id);
                      if (row) removeWishlistItem(row.id);
                      onToast?.("관심상품에서 제거했습니다.");
                    } else {
                      addWishlistItem({
                        id: `wish_${p.id}`,
                        productId: p.id,
                        title: p.name,
                        storeName,
                        priceKrw: price,
                        imageUrl: p.imageDataUrl || ""
                      });
                      onToast?.("관심상품에 담았습니다. 쇼핑 카트에서 확인하세요.");
                    }
                    setHubTick((n) => n + 1);
                  }}
                  className={`absolute right-1.5 top-1.5 rounded-full p-1.5 shadow ${
                    wishOn ? "bg-rose-500 text-white" : "bg-white/90 text-gray-400"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={wishOn ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-[11px] font-black text-gray-900">{p.name}</p>
                  <p className="mt-0.5 text-[12px] font-black text-blue-700">{formatKrwDisplay(price)}</p>
                  {p.salePriceKrw != null && (
                    <p className="text-[10px] text-gray-400 line-through">{formatKrwDisplay(p.priceKrw)}</p>
                  )}
                  <div className="mt-2 flex gap-1">
                    {enterpriseRole === "NONE" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await addProductToCart(p, { sellerUserId: p.sellerUserId || getServerUserId() });
                            const m = `「${p.name}」을(를) 장바구니에 담았습니다.`;
                            setCartMsg(m);
                            onToast?.(m);
                            setTimeout(() => setCartMsg(""), 5000);
                          } catch (e) {
                            onToast?.(isVlueNetworkError(e) ? e.message : e?.message || "장바구니 담기 실패");
                          }
                        }}
                        className="flex-1 rounded-lg border border-violet-200 bg-white py-1.5 text-[10px] font-black text-violet-700"
                      >
                        장바구니
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onProductAction(p)}
                      className={`rounded-lg bg-violet-600 py-1.5 text-[10px] font-black text-white ${
                        enterpriseRole === "NONE" ? "flex-1" : "w-full"
                      }`}
                    >
                      {actionLabel}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {cartMsg && (
        <p className="mt-2 rounded-lg bg-blue-50 px-2 py-2 text-[10px] font-semibold leading-snug text-blue-900">
          {cartMsg}
        </p>
      )}

      {checkoutProduct && (
        <ShopCheckout
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onPaid={() => onPaid(checkoutProduct)}
        />
      )}
    </div>
  );
}
