import { useState } from "react";
import { syncStoreProductToServer } from "../lib/shopApi.js";
import {
  formatKrwDisplay,
  getStoreProduct,
  PRODUCT_CATEGORIES,
  readFileAsDataUrlLimited,
  upsertStoreProduct
} from "../lib/vlueStoreStorage.js";

const emptyForm = () => ({
  name: "",
  description: "",
  category: PRODUCT_CATEGORIES[0],
  priceKrw: "",
  salePriceKrw: "",
  stock: "99",
  shippingFeeKrw: "0",
  imageDataUrl: "",
  status: "on_sale"
});

export default function VlueStoreProductForm({ productId = null, onSaved, onCancel }) {
  const existing = productId ? getStoreProduct(productId) : null;

  const [form, setForm] = useState(
    existing
      ? {
          name: existing.name || "",
          description: existing.description || "",
          category: existing.category || PRODUCT_CATEGORIES[0],
          priceKrw: String(existing.priceKrw ?? ""),
          salePriceKrw: existing.salePriceKrw != null ? String(existing.salePriceKrw) : "",
          stock: String(existing.stock ?? 99),
          shippingFeeKrw: String(existing.shippingFeeKrw ?? 0),
          imageDataUrl: existing.imageDataUrl || "",
          status: existing.status || "on_sale"
        }
      : emptyForm()
  );
  const [msg, setMsg] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPickImage = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrlLimited(file, 1200 * 1024);
      set("imageDataUrl", dataUrl);
    } catch (e) {
      setMsg(e?.message || "이미지 오류");
    }
  };

  const save = () => {
    const name = form.name.trim();
    const priceKrw = Math.floor(Number(form.priceKrw) || 0);
    const salePriceKrw = form.salePriceKrw.trim() ? Math.floor(Number(form.salePriceKrw)) : null;
    const stock = Math.max(0, Math.floor(Number(form.stock) || 0));
    const shippingFeeKrw = Math.max(0, Math.floor(Number(form.shippingFeeKrw) || 0));

    if (!name) return setMsg("상품명을 입력해 주세요.");
    if (priceKrw < 100) return setMsg("판매가는 100원 이상이어야 합니다.");
    if (!form.imageDataUrl) return setMsg("대표 이미지를 등록해 주세요.");
    if (salePriceKrw != null && salePriceKrw >= priceKrw) {
      return setMsg("할인가는 정가보다 낮아야 합니다.");
    }

    const id = existing?.id || `prd-${Date.now()}`;
    const saved = {
      id,
      name,
      description: form.description.trim(),
      category: form.category,
      priceKrw,
      salePriceKrw,
      stock,
      shippingFeeKrw,
      imageDataUrl: form.imageDataUrl,
      status: stock === 0 ? "sold_out" : form.status,
      paymentEnabled: true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    upsertStoreProduct(saved);
    syncStoreProductToServer(saved)
      .then(() => {
        setMsg("상품이 저장되었습니다. (서버 동기화 완료)");
        onSaved?.();
      })
      .catch((e) => {
        setMsg(e?.message || "서버 동기화에 실패했습니다. 네트워크를 확인해 주세요.");
      });
  };

  const displayPrice = form.salePriceKrw.trim()
    ? Math.floor(Number(form.salePriceKrw))
    : Math.floor(Number(form.priceKrw) || 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-[14px] font-black text-gray-900">{productId ? "상품 수정" : "상품 등록"}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">일반 쇼핑몰과 동일하게 대표 이미지·가격·재고·배송비를 설정합니다.</p>

      <div className="mt-3 space-y-2">
        <div className="flex gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {form.imageDataUrl ? (
              <img src={form.imageDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[9px] text-gray-400">이미지</div>
            )}
          </div>
          <label className="flex flex-1 cursor-pointer flex-col justify-center rounded-lg border border-dashed border-gray-300 px-3 py-2 text-[11px] font-bold text-gray-700">
            대표 이미지 (필수)
            <input type="file" accept="image/*" className="mt-1 text-[10px]" onChange={(e) => onPickImage(e.target.files?.[0])} />
          </label>
        </div>

        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="상품명"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
        />
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="상품 설명"
          className="min-h-16 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
        />
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
        >
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={form.priceKrw}
            onChange={(e) => set("priceKrw", e.target.value)}
            placeholder="정가(원)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
          />
          <input
            type="number"
            min={0}
            value={form.salePriceKrw}
            onChange={(e) => set("salePriceKrw", e.target.value)}
            placeholder="할인가(선택)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            placeholder="재고"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
          />
          <input
            type="number"
            min={0}
            value={form.shippingFeeKrw}
            onChange={(e) => set("shippingFeeKrw", e.target.value)}
            placeholder="배송비(원)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
          />
        </div>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none"
        >
          <option value="on_sale">판매중</option>
          <option value="draft">임시저장</option>
          <option value="sold_out">품절</option>
        </select>
        <p className="text-[11px] font-semibold text-blue-700">
          노출가: {formatKrwDisplay(displayPrice)}
          {form.shippingFeeKrw !== "0" && ` · 배송 ${formatKrwDisplay(form.shippingFeeKrw)}`}
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-700">
            취소
          </button>
        )}
        <button type="button" onClick={save} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-[13px] font-black text-white">
          저장
        </button>
      </div>
      {msg && <p className="mt-2 text-center text-[11px] font-bold text-blue-600">{msg}</p>}
    </div>
  );
}
