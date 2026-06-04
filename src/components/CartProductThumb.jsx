import { useState } from "react";
import { resolveCartItemImage } from "../lib/shoppingCartStorage.js";

/**
 * 장바구니·결제 — 판매자가 등록한 대표 이미지(data URL / URL)
 */
export default function CartProductThumb({ item, size = "md", className = "" }) {
  const src = resolveCartItemImage(item);
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const label = item?.name ? `${item.name} 썸네일` : "상품 이미지";

  if (!src || failed) {
    return (
      <div
        className={`${dim} shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 flex flex-col items-center justify-center px-1 ${className}`}
      >
        <span className="text-[8px] font-bold text-gray-400 text-center leading-tight">이미지 없음</span>
      </div>
    );
  }

  return (
    <div className={`${dim} shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 ${className}`}>
      <img
        src={src}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
