import { useState } from "react";

const FALLBACK =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=640&q=80";

/** 썸네일 로드 실패 시 catalog thumbUrl·기본 이미지로 대체 */
export default function FeedThumbImage({ item, className = "", alt = "" }) {
  const primary = item?.product?.imageUrl || item?.thumbUrl || FALLBACK;
  const fallback = item?.thumbUrl || FALLBACK;
  const [src, setSrc] = useState(primary);

  return (
    <img
      src={src || FALLBACK}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (src !== fallback) setSrc(fallback);
        else if (src !== FALLBACK) setSrc(FALLBACK);
      }}
    />
  );
}
