import { useCallback, useEffect, useMemo, useState } from "react";
import { useHorizontalScrollStrip } from "../lib/useHorizontalScrollStrip.js";
import {
  isB2bMembershipKind,
  isPaidMembershipKind,
  normalizeMembershipKind,
  PAID_MEMBERSHIP_SUBLINE,
  B2B_MEMBERSHIP_SUBLINE
} from "../lib/membershipBm.js";
import {
  buildExpenseCsvDemo,
  downloadTextFile,
  readHubSubscriptions,
  readProductReservations,
  readVisitBookings,
  readWishlistItems,
  recordExpenseExport,
  removeWishlistItem,
  setWishlistChecked,
  subscriptionsMonthlyTotal,
  SHOPPING_CART_HUB_CHANGED
} from "../lib/shoppingCartHubStorage.js";
import BackButton from "./common/BackButton";
import {
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

const HUB_TABS = [
  { id: "subReserve", label: "구독/예약" },
  { id: "payment", label: "결제" },
  { id: "wish", label: "관심상품" },
  { id: "tax", label: "세금·지출" }
];

function formatKrw(n) {
  return `${Math.max(0, Number(n) || 0).toLocaleString("ko-KR")}원`;
}

function hubFilterChipClass(active, isDarkMode) {
  if (active) {
    return isDarkMode ? "bg-blue-600 text-white" : "bg-slate-800 text-white";
  }
  return isDarkMode ? "bg-white/10 text-gray-300" : "bg-slate-100 text-slate-600";
}

function SectionCard({ title, children, isDarkMode }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      {title ? (
        <p className={`mb-3 text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>{title}</p>
      ) : null}
      {children}
    </div>
  );
}

function cartPayTotal(items, payMode) {
  if (payMode === "unified") {
    const all = items;
    const sub = all.reduce((s, it) => s + lineTotal(it), 0);
    const ship = cartShippingFee(all);
    return sub + ship;
  }
  return cartSelectedTotal(items);
}

function cartPayLines(items, payMode) {
  if (payMode === "unified") return items;
  return items.filter((it) => it.checked);
}

export default function ShoppingCartHubPanel({
  membershipTier = "free",
  isDarkMode = false,
  onBack,
  onToast
}) {
  const [tab, setTab] = useState("subReserve");
  const tabStrip = useHorizontalScrollStrip();
  const kind = normalizeMembershipKind(membershipTier);
  const isPaid = isPaidMembershipKind(kind);
  const isB2b = isB2bMembershipKind(kind);

  const [cartItems, setCartItems] = useState(() => readCartItems());
  const [wishlist, setWishlist] = useState(() => readWishlistItems());
  const [reservations, setReservations] = useState(() => readProductReservations());
  const [visits, setVisits] = useState(() => readVisitBookings());
  const [subscriptions, setSubscriptions] = useState(() => readHubSubscriptions());

  const [payMode, setPayMode] = useState("partial");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState([]);

  const [subReserveTab, setSubReserveTab] = useState("product");

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-500";

  const syncHub = useCallback(() => {
    setWishlist(readWishlistItems());
    setReservations(readProductReservations());
    setVisits(readVisitBookings());
    setSubscriptions(readHubSubscriptions());
  }, []);

  const syncCart = useCallback(() => setCartItems(readCartItems()), []);

  useEffect(() => {
    syncHub();
    syncCart();
    const onHub = () => syncHub();
    const onCart = () => syncCart();
    window.addEventListener(SHOPPING_CART_HUB_CHANGED, onHub);
    window.addEventListener(SHOPPING_CART_CHANGED, onCart);
    return () => {
      window.removeEventListener(SHOPPING_CART_HUB_CHANGED, onHub);
      window.removeEventListener(SHOPPING_CART_CHANGED, onCart);
    };
  }, [syncHub, syncCart]);

  const monthlyExpected = useMemo(() => {
    const subTotal = subscriptionsMonthlyTotal();
    const cartDue = cartItems.filter((it) => it.checked).reduce((s, it) => s + lineTotal(it), 0);
    return subTotal + cartDue;
  }, [cartItems, subscriptions]);

  const payAmount = useMemo(() => cartPayTotal(cartItems, payMode), [cartItems, payMode]);
  const payLines = useMemo(() => cartPayLines(cartItems, payMode), [cartItems, payMode]);

  const membershipLine = isB2b ? B2B_MEMBERSHIP_SUBLINE : isPaid ? PAID_MEMBERSHIP_SUBLINE : "";

  const openPay = () => {
    if (!payLines.length) {
      onToast?.(payMode === "partial" ? "결제할 상품을 체크해 주세요." : "장바구니가 비어 있습니다.");
      return;
    }
    setCheckoutItems(payLines.map((it) => ({ ...it, checked: true })));
    setCheckoutOpen(true);
  };

  const payWishlist = () => {
    const selected = wishlist.filter((w) => w.checked !== false);
    if (!selected.length) {
      onToast?.("결제할 관심상품을 선택해 주세요.");
      return;
    }
    setCheckoutItems(
      selected.map((w) => ({
        id: w.id,
        name: w.title,
        price: w.priceKrw,
        qty: 1,
        checked: true,
        sellerName: w.storeName,
        imageUrl: w.imageUrl
      }))
    );
    setCheckoutOpen(true);
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
      <div className={`shrink-0 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <div className="flex items-center gap-1">
          <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
          <div className="min-w-0 flex-1">
            <p className={`text-[18px] font-black leading-tight ${headText}`}>쇼핑 카트</p>
            <p className={`text-[12px] leading-snug ${subText}`}>구독·예약 · 결제 · 관심상품</p>
          </div>
        </div>
        <div
          ref={tabStrip.ref}
          className={`wallet-tab-strip vlue-tab-strip mt-3 overflow-x-auto pb-1 ${tabStrip.className}`}
          onMouseDown={tabStrip.onMouseDown}
          onMouseLeave={tabStrip.onMouseLeave}
          onMouseUp={tabStrip.onMouseUp}
          onMouseMove={tabStrip.onMouseMove}
          onWheel={tabStrip.onWheel}
        >
          {HUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full font-black ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : isDarkMode
                    ? "bg-white/10 text-gray-300"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-28">
        {tab === "subReserve" ? (
          <div className="space-y-4">
            <div className="vlue-tab-strip max-w-full overflow-x-auto">
              {[
                { id: "product", label: "예약 상품" },
                { id: "visit", label: "방문·단체 예약" },
                { id: "sub", label: "구독·요금제" }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSubReserveTab(st.id)}
                  className={`rounded-full font-bold ${hubFilterChipClass(subReserveTab === st.id, isDarkMode)}`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {subReserveTab === "product" ? (
              <SectionCard title={`예약 상품 (${reservations.length})`} isDarkMode={isDarkMode}>
                <p className={`mb-2 text-[10px] ${subText}`}>
                  품절·출시 예정 상품을 찜 후 예약하면 이 목록에 표시됩니다.
                </p>
                <ul className="space-y-2">
                  {reservations.map((r) => (
                    <li
                      key={r.id}
                      className={`rounded-xl border px-3 py-2 ${
                        isDarkMode ? "border-amber-500/30 bg-amber-500/10" : "border-amber-100 bg-amber-50/60"
                      }`}
                    >
                      <p className={`text-[12px] font-black ${headText}`}>{r.title}</p>
                      <p className={`text-[10px] ${subText}`}>
                        {r.storeName} ·{" "}
                        <span className={`font-bold ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>{r.status}</span>
                      </p>
                      <p className={`text-[10px] ${subText}`}>
                        예약일 {r.reserveDate} {r.note ? `· ${r.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {subReserveTab === "visit" ? (
              <SectionCard title={`방문·단체 예약 (${visits.length})`} isDarkMode={isDarkMode}>
                <ul className="space-y-2">
                  {visits.map((v) => (
                    <li
                      key={v.id}
                      className={`rounded-xl border px-3 py-2 ${
                        isDarkMode ? "border-blue-500/30 bg-blue-500/10" : "border-blue-100 bg-blue-50/50"
                      }`}
                    >
                      <p className={`text-[12px] font-black ${headText}`}>{v.venueName}</p>
                      <p className={`text-[10px] ${subText}`}>
                        {v.visitType} · {v.scheduledAt} · {v.partySize}명
                      </p>
                      <p className={`text-[10px] font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>{v.status}</p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {subReserveTab === "sub" ? (
              <SectionCard title={`구독·정기구매 (${subscriptions.length})`} isDarkMode={isDarkMode}>
                <p className={`mb-2 text-[10px] ${subText}`}>{membershipLine}</p>
                <ul className="space-y-2">
                  {subscriptions.map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-xl border px-3 py-2 ${
                        isDarkMode ? "border-indigo-500/30 bg-indigo-500/10" : "border-indigo-100 bg-indigo-50/40"
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <p className={`text-[12px] font-black ${headText}`}>{s.title}</p>
                        <span className={`text-[11px] font-black ${isDarkMode ? "text-indigo-300" : "text-indigo-700"}`}>
                          {formatKrw(s.amountKrw)}/{s.cycle === "monthly" ? "월" : s.cycle}
                        </span>
                      </div>
                      <p className={`text-[10px] ${subText}`}>
                        {s.kind === "membership" ? "VLUE 요금제" : "정기구매"} · 다음 결제 {s.nextBillingDate} ·{" "}
                        {s.status}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className={`mt-3 text-[11px] font-bold ${isDarkMode ? "text-indigo-200" : "text-indigo-800"}`}>
                  구독·요금제 월 합계: {formatKrw(subscriptionsMonthlyTotal())}
                </p>
              </SectionCard>
            ) : null}
          </div>
        ) : null}

        {tab === "payment" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPayMode("unified");
                  setAllCartChecked(true);
                  syncCart();
                }}
                className={`rounded-xl border-2 p-3 text-left ${
                  payMode === "unified"
                    ? isDarkMode
                      ? "border-indigo-400 bg-indigo-500/20"
                      : "border-indigo-500 bg-indigo-50"
                    : isDarkMode
                      ? "border-white/15 bg-white/5"
                      : "border-slate-200 bg-white"
                }`}
              >
                <p className={`text-[12px] font-black ${isDarkMode ? "text-indigo-200" : "text-indigo-900"}`}>통합결제</p>
                <p className={`mt-0.5 text-[10px] ${subText}`}>장바구니 전체 일괄 결제</p>
              </button>
              <button
                type="button"
                onClick={() => setPayMode("partial")}
                className={`rounded-xl border-2 p-3 text-left ${
                  payMode === "partial"
                    ? isDarkMode
                      ? "border-violet-400 bg-violet-500/20"
                      : "border-violet-500 bg-violet-50"
                    : isDarkMode
                      ? "border-white/15 bg-white/5"
                      : "border-slate-200 bg-white"
                }`}
              >
                <p className={`text-[12px] font-black ${isDarkMode ? "text-violet-200" : "text-violet-900"}`}>부분결제</p>
                <p className={`mt-0.5 text-[10px] ${subText}`}>체크한 상품만 결제</p>
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className={`py-8 text-center text-[12px] ${subText}`}>장바구니가 비어 있습니다. 스토어에서 상품을 담아 주세요.</p>
            ) : (
              <ul className="space-y-2">
                {cartItems.map((it) => (
                  <li
                    key={it.id}
                    className={`flex items-start gap-2 rounded-xl border p-2.5 shadow-sm ${
                      isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-white"
                    }`}
                  >
                    {payMode === "partial" ? (
                      <input
                        type="checkbox"
                        className="mt-4 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600"
                        checked={Boolean(it.checked)}
                        onChange={(e) => {
                          setCartChecked(it.id, e.target.checked);
                          syncCart();
                        }}
                      />
                    ) : (
                      <span className="mt-4 w-4 shrink-0 text-center text-[10px] text-slate-400">✓</span>
                    )}
                    <CartProductThumb item={it} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-semibold ${isDarkMode ? "text-indigo-300" : "text-indigo-600"}`}>
                        {it.sellerName}
                      </p>
                      <p className={`text-[12px] font-bold ${headText}`}>{it.name}</p>
                      <p className={`text-[11px] ${subText}`}>
                        {formatKrw(it.price)}
                        {it.qty > 1 ? ` × ${it.qty}` : ""}
                      </p>
                    </div>
                    <p className={`shrink-0 text-[12px] font-black ${headText}`}>{formatKrw(lineTotal(it))}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "wish" ? (
          <SectionCard title={`관심상품 (${wishlist.length})`} isDarkMode={isDarkMode}>
            <p className={`mb-2 text-[10px] ${subText}`}>쇼핑 중 찜한 상품입니다. 선택 후 결제할 수 있습니다.</p>
            {wishlist.length === 0 ? (
              <p className={`text-[12px] ${subText}`}>관심상품이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {wishlist.map((w) => (
                  <li
                    key={w.id}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                      isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0"
                      checked={w.checked !== false}
                      onChange={(e) => {
                        setWishlistChecked(w.id, e.target.checked);
                        syncHub();
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-black ${headText}`}>{w.title}</p>
                      <p className={`text-[10px] ${subText}`}>
                        {w.storeName} · {formatKrw(w.priceKrw)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeWishlistItem(w.id);
                        syncHub();
                      }}
                      className="text-[10px] font-bold text-red-500"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {wishlist.length > 0 ? (
              <button
                type="button"
                onClick={payWishlist}
                className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-[12px] font-black text-white"
              >
                선택 상품 결제하기
              </button>
            ) : null}
          </SectionCard>
        ) : null}

        {tab === "tax" ? (
          <SectionCard title="세금·지출 자료" isDarkMode={isDarkMode}>
            <p className={`mb-3 text-[11px] ${subText}`}>유료·기업 회원 지출 내역 (데모 CSV)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const row = recordExpenseExport({ period: "year" });
                  downloadTextFile(row.fileName.replace(/\.xlsx$/, ".csv"), buildExpenseCsvDemo("year"));
                  onToast?.("연간 지출 자료를 다운로드했습니다.");
                }}
                className={`rounded-xl border py-3 text-[12px] font-black ${
                  isDarkMode
                    ? "border-white/15 bg-white/10 text-gray-100"
                    : "border-slate-200 bg-slate-50 text-slate-900"
                }`}
              >
                연간 다운로드
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = recordExpenseExport({ period: "quarter" });
                  downloadTextFile(row.fileName.replace(/\.xlsx$/, ".csv"), buildExpenseCsvDemo("quarter"));
                  onToast?.("분기별 지출 자료를 다운로드했습니다.");
                }}
                className={`rounded-xl border py-3 text-[12px] font-black ${
                  isDarkMode
                    ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                    : "border-indigo-200 bg-indigo-50 text-indigo-900"
                }`}
              >
                분기별 다운로드
              </button>
            </div>
          </SectionCard>
        ) : null}
      </div>

      {tab === "payment" || tab === "wish" ? (
        <div
          className={`shrink-0 border-t px-5 py-3 ${
            isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-200 bg-[#f8fafc]"
          }`}
        >
          {tab === "payment" ? (
            <>
              <div className="mb-2 flex justify-between text-[11px]">
                <span className={subText}>이번 달 예상 결제금</span>
                <span className={`font-black ${headText}`}>{formatKrw(monthlyExpected)}</span>
              </div>
              <div className="mb-2 flex justify-between text-[12px]">
                <span className="font-bold text-slate-700">
                  {payMode === "unified" ? "통합 결제금" : "선택 결제금"} ({payLines.length}건)
                </span>
                <span className="text-[17px] font-black text-indigo-600">{formatKrw(payAmount)}</span>
              </div>
              <button
                type="button"
                onClick={openPay}
                disabled={!payLines.length}
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-[14px] font-black text-white shadow-lg disabled:opacity-40"
              >
                결제하기
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <StoreCartCheckoutModal
        open={checkoutOpen}
        items={checkoutItems}
        onClose={() => setCheckoutOpen(false)}
        onPaid={() => {
          setCheckoutOpen(false);
          onToast?.("결제가 완료되었습니다.");
          syncCart();
        }}
        onToast={onToast}
      />
    </div>
  );
}
