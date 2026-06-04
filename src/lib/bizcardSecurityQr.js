import { useMemo } from "react";
import { buildLetteringCertUniversalLink } from "./letteringOpenVlueApp.js";

export function buildBizcardVerifyUrl(card, cardId = "") {
  const link = buildLetteringCertUniversalLink({
    card,
    feedId: card?.feedId,
    feedType: card?.feedType
  });
  if (!cardId) return link;
  try {
    const u = new URL(link);
    u.searchParams.set("cardId", cardId);
    return u.toString();
  } catch {
    return link;
  }
}

export function buildBizcardQrSrc(verifyUrl) {
  const q = encodeURIComponent(verifyUrl || "");
  return `https://api.qrserver.com/v1/create-qr-code/?size=72x72&margin=0&data=${q}`;
}

export function useBizcardSecurityQr(card, cardId = "") {
  const verifyUrl = useMemo(() => buildBizcardVerifyUrl(card, cardId), [card, cardId]);
  const qrSrc = useMemo(() => buildBizcardQrSrc(verifyUrl), [verifyUrl]);
  return { qrSrc, verifyUrl };
}
