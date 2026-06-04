import { useCallback, useEffect, useState } from "react";
import {
  addEnterpriseCartItem,
  canEnterprisePurchase,
  downloadEnterpriseTaxCsv,
  fetchEnterpriseDashboard,
  openEnterpriseTaxPrint,
  postPurchaseRequest,
  reviewPurchaseRequest,
  shareEnterpriseCartToChat
} from "../lib/enterpriseShopApi.js";
import { formatKrwDisplay } from "../lib/vlueStoreStorage.js";

/** 마이페이지 — B2B 역할별 사내 비품·구매 요청 */
export default function EnterpriseProcurementPanel({ onToast }) {
  const [dash, setDash] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchEnterpriseDashboard();
      if (data?.role && data.role !== "NONE") setDash(data);
      else setDash(null);
    } catch {
      setDash(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!dash?.role || dash.role === "NONE") return null;

  const isBuyerSide = canEnterprisePurchase(dash.role);

  const downloadTaxCsv = async () => {
    try {
      await downloadEnterpriseTaxCsv();
      onToast?.("세금 증빙 CSV를 저장했습니다.");
    } catch (e) {
      onToast?.(e?.message || "다운로드 실패");
    }
  };

  const openTaxPrint = async () => {
    try {
      await openEnterpriseTaxPrint();
    } catch (e) {
      onToast?.(e?.message || "인쇄 페이지 열기 실패");
    }
  };

  const shareCart = async () => {
    setBusy(true);
    try {
      await shareEnterpriseCartToChat();
      onToast?.("그룹 채팅방에 결제 전 리스트를 공유했습니다.");
    } catch (e) {
      onToast?.(e?.message || "공유 실패");
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (id, action) => {
    setBusy(true);
    try {
      await reviewPurchaseRequest(id, action);
      await load();
      onToast?.(action === "approve" ? "구매 요청을 승인했습니다." : "구매 요청을 반려했습니다.");
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
      <p className="text-[13px] font-black text-indigo-950">기업 단체 · 사내 비품</p>
      <p className="text-[10px] text-indigo-900/85">
        {dash.enterprise?.companyName || "소속 기업"} · 역할 {dash.role}
        {dash.dept ? ` · ${dash.dept}` : ""}
      </p>

      {isBuyerSide && dash.enterprise && (
        <div>
          <p className="mt-2 text-[11px] font-bold text-slate-700">
            회사 예산 {formatKrwDisplay(dash.enterprise.corporateWalletBalanceKrw || 0)}
            {dash.enterprise.corporateCardLast4 ? ` · 법인카드 ****${dash.enterprise.corporateCardLast4}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={downloadTaxCsv}
              className="rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[10px] font-black text-indigo-800"
            >
              세금 증빙 CSV
            </button>
            <button
              type="button"
              onClick={openTaxPrint}
              className="rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[10px] font-black text-indigo-800"
            >
              PDF(인쇄)
            </button>
          </div>
          {dash.procurementCart?.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-black text-slate-600">공용 장바구니 ({dash.procurementCart.length})</p>
              <ul className="mt-1 space-y-1">
                {dash.procurementCart.map((row) => (
                  <li key={row.id} className="rounded-lg bg-white px-2 py-1.5 text-[10px]">
                    {row.productName} ×{row.quantity} · {row.addedByName}
                    {row.addedByDept ? ` (${row.addedByDept})` : ""}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy}
                onClick={shareCart}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-[11px] font-black text-white disabled:opacity-50"
              >
                📢 그룹방에 최종 리스트 공유
              </button>
            </div>
          )}
        </div>
      )}

      {isBuyerSide && dash.pendingRequests?.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-black text-slate-800">사내 요청 관리 ({dash.pendingRequests.length})</p>
          <ul className="mt-1 space-y-2">
            {dash.pendingRequests.map((req) => (
              <li key={req.id} className="rounded-lg border border-indigo-100 bg-white p-2">
                <p className="text-[11px] font-bold text-slate-900">
                  {req.productName} ×{req.quantity}
                </p>
                <p className="text-[10px] text-slate-600">
                  {req.requestedByName}
                  {req.requestedByDept ? ` · ${req.requestedByDept}` : ""}
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview(req.id, "approve")}
                    className="mt-2 mr-1 rounded bg-emerald-600 px-3 py-1 text-[10px] font-black text-white"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview(req.id, "reject")}
                    className="mt-2 rounded bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-700"
                  >
                    반려
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isBuyerSide && dash.myRequests?.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-black text-slate-800">내 구매 요청 이력</p>
          <ul className="mt-1 space-y-1">
            {dash.myRequests.slice(0, 10).map((req) => (
              <li key={req.id} className="rounded-lg bg-white px-2 py-1.5 text-[10px]">
                {req.productName} ×{req.quantity} — {req.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export async function requestEnterprisePurchase(product, onToast) {
  try {
    const unit = product.salePriceKrw != null ? product.salePriceKrw : product.priceKrw;
    await postPurchaseRequest({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPriceKrw: unit
    });
    onToast?.("경리·구매 담당 계정에 구매 요청을 보냈습니다.");
    return true;
  } catch (e) {
    onToast?.(e?.message || "구매 요청 실패");
    return false;
  }
}

export async function addProductToEnterpriseCart(product, onToast) {
  try {
    const unit = product.salePriceKrw != null ? product.salePriceKrw : product.priceKrw;
    await addEnterpriseCartItem({
      externalProductId: product.id,
      productName: product.name,
      quantity: 1,
      unitPriceKrw: unit
    });
    onToast?.("공용 장바구니에 담았습니다.");
    return true;
  } catch (e) {
    onToast?.(e?.message || "장바구니 추가 실패");
    return false;
  }
}
