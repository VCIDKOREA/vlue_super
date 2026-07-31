import { useMemo } from "react";
import ShowcaseCallCarousel from "./ShowcaseCallCarousel.jsx";
import { createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import { hasShowcaseBgmConfigured } from "../../lib/showcase/showcaseBgmPresets.js";
import { extractShowcaseCoverUrl } from "../../lib/showcase/showcaseCover.js";

/**
 * 카톡·공개 링크 전용 — 통화 UI/디지털명함 없이 쇼케이스 콘텐츠+BGM만 송출
 */
export default function PublicShowcaseStage({ card, onToast }) {
  const style = useMemo(() => {
    if (card?.showcaseStyle && typeof card.showcaseStyle === "object") return card.showcaseStyle;
    return createDefaultShowcaseStyle();
  }, [card?.showcaseStyle]);

  const previewCard = useMemo(
    () => ({
      ...card,
      showcaseStyle: style,
      userId: card?.userId || card?.ownerUserId || "",
      ownerUserId: card?.ownerUserId || card?.userId || ""
    }),
    [card, style]
  );

  const hasContent = useMemo(() => {
    if (hasShowcaseBgmConfigured(style)) return true;
    if (extractShowcaseCoverUrl(style)) return true;
    const pages = Array.isArray(style?.pages) ? style.pages : [];
    return pages.some((p) => {
      if (!p || typeof p !== "object") return false;
      const photos = p?.gallery?.photos || p?.photos || [];
      return Array.isArray(photos) && photos.some((ph) => ph?.url);
    });
  }, [style]);

  if (!hasContent) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center text-slate-200">
        <p className="text-[15px] font-bold">쇼케이스 콘텐츠가 없습니다.</p>
        <p className="text-[12px] text-slate-400">상대가 쇼케이스 사진을 등록하면 이 링크에서 볼 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="public-showcase-stage relative flex h-full min-h-0 flex-1 flex-col bg-[#0B101B]">
      <ShowcaseCallCarousel
        card={previewCard}
        verified
        incomingNumber={previewCard.phone || ""}
        membershipTier={previewCard.membershipTier || "paid"}
        isKnownContact
        scrollEnabled
        previewMode
        includeDigitalCard={false}
        digitalCardOnly={false}
        socialOverlayEnabled
        onKeypadToast={onToast}
        showcaseStyle={style}
        suppressBgm={false}
      />
    </div>
  );
}
