import { useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { getShowcasePermissions } from "../../lib/showcase/showcaseStylePermissions.js";
import { SHOWCASE_FONT_SETS, SHOWCASE_STYLE_TYPES } from "../../lib/showcase/showcaseStyleTypes.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseBgmMuteButton from "./ShowcaseBgmMuteButton.jsx";
import ShowcaseBgmMarquee from "./ShowcaseBgmMarquee.jsx";
import ShowcasePhotoGallery from "./ShowcasePhotoGallery.jsx";
import LetteringDigitalReception from "../LetteringDigitalReception.jsx";

const FONT_MAP = Object.fromEntries(SHOWCASE_FONT_SETS.map((f) => [f.id, f.css]));

/**
 * Showcase 실시간 미리보기 (설정 패널 우측)
 */
export default function ShowcaseStylePreview({
  styleConfig,
  card,
  membershipTier = "free",
  phase = "preview",
  className = "",
  onProductClick
}) {
  const perms = getShowcasePermissions(membershipTier);
  const isPaid = isPaidLetteringTier(membershipTier);
  const style = SHOWCASE_STYLE_TYPES[styleConfig?.styleType] || SHOWCASE_STYLE_TYPES.default;
  const isCertificate = style.id === "certificate";
  const [certFace, setCertFace] = useState("front");
  const {
    bindStyleConfig,
    setPlaybackPhase,
    proximityNear,
    unlockFromUserGesture
  } = useShowcaseBgm();

  useEffect(() => {
    bindStyleConfig(styleConfig);
    setPlaybackPhase(phase);
    return () => setPlaybackPhase("idle");
  }, [styleConfig, phase, bindStyleConfig, setPlaybackPhase]);

  useEffect(() => {
    if (!isCertificate) setCertFace("front");
  }, [isCertificate]);

  const rc = styleConfig?.richCustom || {};
  const caseTheme = styleConfig?.caseTheme || {};
  const phone = card?.phone || "010-0000-0000";
  const showName = perms.showNameOrg && card?.name;
  const photos = styleConfig?.gallery?.photos || [];
  const isCallActive = phase === "call_active";
  const sleepMode = proximityNear && isCallActive;

  const onTapUnlock = () => unlockFromUserGesture();

  const openProduct = (product) => {
    if (!perms.productLinkout && !isPaid) return;
    if (onProductClick) onProductClick(product);
    else if (product?.url) window.open(product.url, "_blank", "noopener,noreferrer");
  };

  /** 디지털인증명함 — 하단 미리보기에 실제 디지털 명함 UI */
  if (isCertificate && isPaid) {
    return (
      <div
        className={`showcase-style-preview showcase-style-preview--certificate ${className}`.trim()}
        data-phase={phase}
        onClick={onTapUnlock}
        onTouchStart={onTapUnlock}
        role="presentation"
      >
        <div className="showcase-style-preview__cert-shell">
          <div className="showcase-style-preview__cert-top">
            <span className="showcase-style-preview__trust">
              <Check size={12} strokeWidth={3} /> VLUE 인증
            </span>
            <ShowcaseBgmMuteButton />
          </div>
          <LetteringDigitalReception
            card={card}
            verified={styleConfig?.verifiedBadgeOn !== false}
            embeddedInPush
            previewMode
            enableContactLinks
            face={certFace}
            onFaceChange={setCertFace}
            className="showcase-style-preview__cert-card"
          />
          <ShowcaseBgmMarquee styleConfig={styleConfig} visible={isCallActive && !sleepMode} />
        </div>
        {sleepMode ? (
          <div className="showcase-style-preview__sleep" aria-hidden>
            <p>근접 센서 · 화면 잠금</p>
          </div>
        ) : null}
        <p className="showcase-style-preview__caption">
          디지털인증명함 · 앞면/뒷면 탭으로 확인
        </p>
      </div>
    );
  }

  return (
    <div
      className={`showcase-style-preview ${className}`.trim()}
      data-phase={phase}
      onClick={onTapUnlock}
      onTouchStart={onTapUnlock}
      role="presentation"
    >
      <div
        className={`showcase-style-preview__device${style.id === "rich_custom" ? " showcase-style-preview__device--framed" : ""}${sleepMode ? " showcase-style-preview__device--sleep" : ""}`}
        style={style.id === "rich_custom" ? { "--case-accent": caseTheme.accent || "#2b6ff0" } : undefined}
      >
        <div className="showcase-style-preview__top">
          <span className="showcase-style-preview__trust">
            <Check size={12} strokeWidth={3} /> VLUE 인증
          </span>
          <ShowcaseBgmMuteButton />
        </div>

        <ShowcasePhotoGallery photos={photos} fallbackUrl={card?.photoUrl} autoPlay className="showcase-style-preview__gallery" />

        {style.id === "default" && (
          <div className="showcase-style-preview__body showcase-style-preview__body--default">
            <p className="showcase-style-preview__phone">{phone}</p>
            <p className="showcase-style-preview__hint">VLUE 안심 통신 · 번호 위장에 속지 마세요</p>
          </div>
        )}

        {style.id === "kakao" && (
          <div className="showcase-style-preview__body showcase-style-preview__body--platform">
            <p className="showcase-style-preview__platform-tag">KakaoTalk</p>
            <p className="showcase-style-preview__platform-title">{styleConfig?.platformFeed?.kakaoProfileTitle || "카톡 프로필"}</p>
            {!perms.outlinkButtons ? <p className="showcase-style-preview__lock">외부 링크 · 메뉴 — 유료 전용</p> : null}
          </div>
        )}

        {style.id === "instagram" && (
          <div className="showcase-style-preview__body showcase-style-preview__body--platform">
            <p className="showcase-style-preview__platform-tag">Instagram</p>
            <p className="showcase-style-preview__platform-title">{styleConfig?.platformFeed?.instagramHandle || "@vlue.official"}</p>
            {!perms.outlinkButtons ? <p className="showcase-style-preview__lock">원클릭 링크 · 메뉴 — 유료 전용</p> : null}
          </div>
        )}

        {style.id === "rich_custom" && (
          <div
            className="showcase-style-preview__body showcase-style-preview__body--rich"
            style={{
              fontFamily: FONT_MAP[rc.fontFamily] || FONT_MAP.pretendard,
              fontSize: `${rc.fontSize || 16}px`,
              color: rc.fontColor || "#191f28",
              fontWeight: rc.fontWeight || 600,
              textAlign: rc.textAlign || "left"
            }}
          >
            <p className="showcase-style-preview__phone showcase-style-preview__phone--sm">{phone}</p>
            {showName ? <p className="showcase-style-preview__name">{card.name}</p> : null}
            <p className="showcase-style-preview__rich-text">
              {rc.emoji ? `${rc.emoji} ` : ""}
              {rc.bodyText || "나만의 스타일 텍스트"}
            </p>
          </div>
        )}

        {style.id === "certificate" && !isPaid ? (
          <div className="showcase-style-preview__body showcase-style-preview__body--locked">
            디지털인증명함은 유료 회원 전용입니다
          </div>
        ) : null}

        {isPaid &&
        ((styleConfig?.commercial?.links || []).length > 0 ||
          (styleConfig?.commercial?.products || []).length > 0) ? (
          <div className="showcase-style-preview__products">
            {(styleConfig.commercial.links?.length
              ? styleConfig.commercial.links
              : styleConfig.commercial.products
            ).map((pr) => (
              <button key={pr.id} type="button" className="showcase-style-preview__product" onClick={() => openProduct(pr)}>
                {pr.name}
                <ExternalLink size={12} aria-hidden />
              </button>
            ))}
          </div>
        ) : null}

        <ShowcaseBgmMarquee styleConfig={styleConfig} visible={isCallActive && !sleepMode} />
      </div>

      {sleepMode ? (
        <div className="showcase-style-preview__sleep" aria-hidden>
          <p>근접 센서 · 화면 잠금</p>
        </div>
      ) : null}

      <p className="showcase-style-preview__caption">
        {isCallActive ? "통화 중 · BGM 음소거 · 제목 자막 표시" : "미리보기 · BGM 재생 가능"}
      </p>
    </div>
  );
}
