import { useEffect, useMemo, useState } from "react";
import ShowcaseCallCarousel from "./ShowcaseCallCarousel.jsx";
import LetteringDigitalReception from "../LetteringDigitalReception.jsx";
import { createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import { hasShowcaseBgmConfigured } from "../../lib/showcase/showcaseBgmPresets.js";
import { extractShowcaseCoverUrl } from "../../lib/showcase/showcaseCover.js";
import { apiUrl } from "../../lib/apiBase.js";

function styleHasMedia(style) {
  if (!style || typeof style !== "object") return false;
  if (hasShowcaseBgmConfigured(style)) return true;
  if (extractShowcaseCoverUrl(style)) return true;
  const pages = Array.isArray(style.pages) ? style.pages : [];
  if (
    pages.some((p) => {
      if (!p || typeof p !== "object") return false;
      const photos = p?.gallery?.photos || p?.photos || [];
      return Array.isArray(photos) && photos.some((ph) => String(ph?.url || "").startsWith("http"));
    })
  ) {
    return true;
  }
  const gallery = style.gallery?.photos;
  return Array.isArray(gallery) && gallery.some((ph) => String(ph?.url || "").startsWith("http"));
}

/**
 * 카톡·공개 링크 전용 — 미가입자도 쇼케이스(또는 명함)를 바로 본다
 */
export default function PublicShowcaseStage({ card, onToast }) {
  const userId = String(card?.userId || card?.ownerUserId || "").trim();
  const [style, setStyle] = useState(() =>
    card?.showcaseStyle && typeof card.showcaseStyle === "object"
      ? card.showcaseStyle
      : createDefaultShowcaseStyle()
  );
  const [loadingStyle, setLoadingStyle] = useState(() => !styleHasMedia(card?.showcaseStyle));
  const [face, setFace] = useState("front");

  /* 카드에 스타일이 비어 있으면 userId 로 공개 API 재조회 (게스트 필수) */
  useEffect(() => {
    if (styleHasMedia(card?.showcaseStyle)) {
      setStyle(card.showcaseStyle);
      setLoadingStyle(false);
      return undefined;
    }
    if (!userId) {
      setLoadingStyle(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingStyle(true);
    (async () => {
      try {
        const url = apiUrl(`/api/lettering/showcase/style/${encodeURIComponent(userId)}`);
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "omit",
          cache: "no-store"
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.live && typeof data.live === "object") {
          setStyle(data.live);
        }
      } catch {
        /* ignore — 아래 폴백 */
      } finally {
        if (!cancelled) setLoadingStyle(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, card?.showcaseStyle]);

  const previewCard = useMemo(
    () => ({
      ...card,
      showcaseStyle: style,
      userId: userId || card?.userId || "",
      ownerUserId: userId || card?.ownerUserId || card?.userId || ""
    }),
    [card, style, userId]
  );

  const hasMedia = styleHasMedia(style);

  if (loadingStyle) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center text-[14px] font-semibold text-slate-300">
        쇼케이스 불러오는 중…
      </div>
    );
  }

  if (hasMedia) {
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

  /* 사진·BGM 이 아직 없어도 공개 링크는 디지털 인증명함만이라도 노출 */
  return (
    <div className="public-showcase-stage relative flex h-full min-h-0 flex-1 flex-col bg-[#0B101B] p-3">
      <LetteringDigitalReception
        card={previewCard}
        verified
        incomingNumber={previewCard.phone || ""}
        face={face}
        onFaceChange={setFace}
        previewMode
      />
    </div>
  );
}
