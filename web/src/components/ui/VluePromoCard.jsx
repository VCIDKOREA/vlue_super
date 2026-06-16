/**
 * 카카오톡·토스 스타일 에디토리얼 프로모 카드
 * — 시안 헤더 + 떠 있는 미리보기 + 얇은 구분선 + 그레이 CTA
 */
export default function VluePromoCard({
  headline,
  headlineAccent,
  floating,
  bodyTitle,
  bodyIcon,
  description,
  ctaLabel,
  onCta,
  ctaVariant = "ghost",
  className = ""
}) {
  return (
    <article className={`vlue-promo-card ${className}`}>
      <div className="vlue-promo-card__hero">
        <p className="vlue-promo-card__hero-title">
          {headline}
          {headlineAccent ? (
            <>
              <br />
              <span className="font-medium opacity-95">{headlineAccent}</span>
            </>
          ) : null}
        </p>
      </div>

      {floating ? <div className="vlue-promo-card__float">{floating}</div> : null}

      <div className={`vlue-promo-card__body ${floating ? "pt-5" : "pt-4"}`}>
        {bodyTitle ? (
          <div className="flex items-center gap-1.5">
            {bodyIcon ? <span className="text-[15px] leading-none" aria-hidden>{bodyIcon}</span> : null}
            <p className="vlue-type-subtitle text-[#191f28]">{bodyTitle}</p>
          </div>
        ) : null}

        {description ? (
          <>
            {bodyTitle ? <div className="vlue-promo-card__divider" /> : null}
            <p className="vlue-type-body text-[#4e5968]">{description}</p>
          </>
        ) : null}

        {ctaLabel ? (
          <button
            type="button"
            onClick={onCta}
            className={`vlue-promo-card__cta mt-4 ${ctaVariant === "primary" ? "vlue-promo-card__cta--primary" : ""}`}
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** 메일 미리보기 플로팅 카드 (채팅 @멘션 스타일) */
export function VlueMailPreviewFloat({ fromLabel = "보낸 사람", fromAddress, toAddress, snippet }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3182F6]/10 text-[13px]">✉</span>
        <div className="min-w-0">
          <p className="vlue-type-caption text-[#8b95a1]">{fromLabel}</p>
          <p className="vlue-type-subtitle truncate text-[#191f28]">{fromAddress}</p>
        </div>
      </div>
      <p className="vlue-type-body text-[#3182F6]">
        <span className="font-medium">@{toAddress?.split("@")[0] || "vlue"}</span>
        <span className="text-[#4e5968]"> {snippet || "오늘 점심 메뉴 추천해줘"}</span>
      </p>
    </div>
  );
}
