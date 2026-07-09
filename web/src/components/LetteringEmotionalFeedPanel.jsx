import { ExternalLink, Instagram } from "lucide-react";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";

/**
 * 무료 플랜 — 통화 빅푸시 펼침: 인스타 감성 단일 게시물 / 커스텀 레터링
 * (유료 플랜은 LetteringDigitalReception — 동일 셸·다른 본문)
 */
export default function LetteringEmotionalFeedPanel({
  card: cardRaw,
  instagramHandle = "",
  creatorLink = "",
  onOpenLink
}) {
  const card = normalizeLetteringCard(cardRaw || {});
  const imageUrl =
    String(card.photoUrl || "").trim() ||
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80";
  const caption =
    String(card.companyIntro || card.customBackText || "").trim() ||
    "모르는 번호에 속지 마라 — 아는 번호라도 확인하라 💙";
  const handle = String(instagramHandle || "").trim() || `@${(card.name || "vlue").replace(/\s/g, "").slice(0, 12)}`;
  const link = String(creatorLink || card.website || "").trim();

  return (
    <div className="lettering-emotional-feed">
      <header className="lettering-emotional-feed__head">
        <Instagram className="h-4 w-4 text-[#E1306C]" aria-hidden />
        <span className="lettering-emotional-feed__user">{handle}</span>
        <span className="lettering-emotional-feed__tag">Instagram</span>
      </header>
      <div className="lettering-emotional-feed__image-wrap">
        <img src={imageUrl} alt="" className="lettering-emotional-feed__image" draggable={false} />
      </div>
      <p className="lettering-emotional-feed__caption">{caption}</p>
      {link ? (
        <button
          type="button"
          className="lettering-emotional-feed__link"
          onClick={() => {
            if (onOpenLink) {
              onOpenLink(link);
              return;
            }
            try {
              window.open(link.startsWith("http") ? link : `https://${link}`, "_blank", "noopener,noreferrer");
            } catch {
              /* ignore */
            }
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          크리에이터 링크
        </button>
      ) : null}
    </div>
  );
}
