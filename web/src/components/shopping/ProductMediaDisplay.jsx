import ProductVideoHero from "./ProductVideoHero.jsx";
import FeedThumbImage from "./FeedThumbImage.jsx";
import { isEmbeddableVideoUrl } from "../../lib/embedVideo.js";

/**
 * 상품 노출 — 영상(임베드)과 사진 갤러리를 분리 표시
 */
export default function ProductMediaDisplay({
  videoUrl,
  imageUrls = [],
  item,
  isDarkMode = false,
  className = ""
}) {
  const photos = (imageUrls || []).filter(Boolean);
  const hasEmbed = isEmbeddableVideoUrl(videoUrl);
  const border = isDarkMode ? "border-white/10" : "border-slate-200";

  if (!hasEmbed && !photos.length && !item) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {hasEmbed ? (
        <section>
          <p className={`mb-1.5 text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
            설명 영상
          </p>
          <ProductVideoHero videoUrl={videoUrl} title="상품 설명 영상" />
        </section>
      ) : null}

      {photos.length || item ? (
        <section>
          <p className={`mb-1.5 text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
            상품 사진 {photos.length > 1 ? `(${photos.length})` : ""}
          </p>
          {photos.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={`h-24 w-24 shrink-0 overflow-hidden rounded-xl border ${border}`}
                >
                  {item ? (
                    <FeedThumbImage item={{ ...item, thumbUrl: src, product: { ...(item.product || {}), imageUrl: src } }} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`overflow-hidden rounded-xl border ${border}`}>
              {item ? (
                <FeedThumbImage item={item} className="aspect-square w-full object-cover" alt="" />
              ) : (
                <img src={photos[0]} alt="" className="aspect-square w-full object-cover" />
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
