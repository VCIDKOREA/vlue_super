import { useEffect, useState } from "react";
import {
  deleteStoreProduct,
  formatKrwDisplay,
  isStoreApproved,
  readStoreProducts
} from "../lib/vlueStoreStorage.js";
import VlueStoreProductForm from "./VlueStoreProductForm.jsx";

export default function VlueStoreProductManager({ isPaid = false }) {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  const refresh = () => setProducts(readStoreProducts());

  useEffect(() => {
    if (!isPaid) return undefined;
    refresh();
    const onChange = () => refresh();
    window.addEventListener("vlue-store-changed", onChange);
    return () => window.removeEventListener("vlue-store-changed", onChange);
  }, [isPaid]);

  if (!isPaid || !isStoreApproved()) return null;

  if (adding || editingId) {
    return (
      <VlueStoreProductForm
        productId={editingId}
        onCancel={() => {
          setAdding(false);
          setEditingId(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditingId(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-black text-violet-950">상품 관리 ({products.length})</p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-black text-white"
        >
          + 상품 등록
        </button>
      </div>
      <p className="mt-1 text-[10px] text-violet-900/80">승인된 상점 — PG·판매 수수료 각 VAT 별도</p>

      {products.length === 0 ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-4 text-center text-[12px] text-gray-500">등록된 상품이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {products.map((p) => {
            const price = p.salePriceKrw != null ? p.salePriceKrw : p.priceKrw;
            return (
              <li key={p.id} className="flex gap-2 rounded-lg border border-white bg-white p-2 shadow-sm">
                {p.imageDataUrl ? (
                  <img src={p.imageDataUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-gray-900">{p.name}</p>
                  <p className="text-[11px] font-bold text-blue-700">{formatKrwDisplay(price)} · 재고 {p.stock}</p>
                  <p className="text-[10px] text-gray-500">{p.status === "on_sale" ? "판매중" : p.status}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(p.id)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-bold"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("이 상품을 삭제할까요?")) {
                        deleteStoreProduct(p.id);
                        refresh();
                      }
                    }}
                    className="rounded-md border border-red-100 px-2 py-1 text-[10px] font-bold text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
