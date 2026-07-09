import { readCardWallet, writeCardWallet } from "../cardWalletStorage.js";
import { resolveShowcaseBgmUrl } from "./showcaseBgmPresets.js";

/**
 * [업체 저장하기] — 쇼케이스 + BGM 설정을 개인케이스(명함 지갑)에 스크랩
 */
export function scrapShowcaseToVault({ card, showcaseStyle, phone }) {
  const wallet = readCardWallet();
  const userId = `showcase-${String(phone || card?.phone || "").replace(/\D/g, "") || Date.now()}`;
  const bgmUrl = resolveShowcaseBgmUrl(showcaseStyle);

  const snapshot = {
    ...card,
    phone: phone || card?.phone,
    showcaseStyle: {
      ...showcaseStyle,
      bgmUrl,
      scrapedAt: new Date().toISOString()
    }
  };

  const existing = wallet.findIndex((w) => w.userId === userId);
  const row = {
    userId,
    savedAt: new Date().toISOString(),
    source: "showcase_scrap",
    snapshot
  };

  if (existing >= 0) wallet[existing] = row;
  else wallet.unshift(row);

  writeCardWallet(wallet);
  return { ok: true, userId };
}
