import { buildCardSnapshot, readCardWallet, writeCardWallet } from "./cardWalletStorage.js";
import { normalizePhoneDigits } from "./letteringPhoneMatch.js";

/** Lettering 명함 → 앱 명함 지갑 저장 */
export function saveLetteringCardToWallet(card = {}) {
  const userId =
    String(card.feedId || card.userId || "").trim() ||
    (card.phone ? `phone-${normalizePhoneDigits(card.phone)}` : "");

  if (!userId) {
    return { ok: false, error: "no_user_id" };
  }

  const snapshot = buildCardSnapshot({
    userId,
    membershipTier: card.membershipTier || "free",
    organization: card.organization || "",
    title: card.title || "",
    name: card.name || "",
    phone: card.phone || "",
    introBack: card.salesContent || card.companyIntro || card.introBack || "",
    legalName: card.name || "",
    logoUrl: card.logoUrl || "",
    email: card.email || "",
    vcidLettering: true
  });

  const nextItem = {
    id: `${userId}-${Date.now()}`,
    userId,
    savedAt: new Date().toISOString(),
    snapshot,
    source: "lettering"
  };

  const prev = readCardWallet();
  const deduped = prev.filter((item) => item.userId !== userId);
  const next = [nextItem, ...deduped];
  writeCardWallet(next);

  return { ok: true, userId, item: nextItem };
}
