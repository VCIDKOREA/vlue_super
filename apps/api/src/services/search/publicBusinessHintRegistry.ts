import type { TradeNameBusinessCandidate } from "../../integrations/publicData/businessTradeNameSearch.js";

export type PublicBusinessHint = {
  store_name: string;
  aliases: string[];
  business_number: string;
  ceo_name: string;
  address: string;
  telephone: string;
  biz_type: string;
  biz_item: string;
};

/** 데모 시드 없음 — 실데이터는 공공 API(FSC·SBDC·NTS)만 사용 */
const HINTS: PublicBusinessHint[] = [];

function normalize(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function scoreHint(
  hint: PublicBusinessHint,
  keyword: string,
  matchName: string,
  matchPhone: string,
  matchAddress: string
): number {
  const names = [hint.store_name, ...hint.aliases].map(normalize);
  const kw = normalize(keyword);
  const mn = normalize(matchName);
  const addr = normalize(matchAddress);
  const hintAddr = normalize(hint.address);
  const phone = matchPhone.replace(/\D/g, "");
  const hintPhone = hint.telephone.replace(/\D/g, "");

  let score = 0;
  for (const name of names) {
    if (!name) continue;
    if (kw && (name.includes(kw) || kw.includes(name))) score += 10;
    if (mn && (name.includes(mn) || mn.includes(name))) score += 12;
  }
  if (phone && hintPhone && phone === hintPhone) score += 14;
  if (addr && hintAddr && (addr.includes(hintAddr) || hintAddr.includes(addr))) score += 8;
  return score;
}

function toCandidate(hint: PublicBusinessHint): TradeNameBusinessCandidate {
  return {
    store_name: hint.store_name,
    business_number: hint.business_number,
    ceo_name: hint.ceo_name,
    business_status: "미확인",
    biz_type: hint.biz_type,
    biz_item: hint.biz_item,
    address: hint.address,
    telephone: hint.telephone,
    source: "public_hint_registry"
  };
}

export function searchPublicBusinessHints(input: {
  keyword: string;
  matchName?: string;
  matchPhone?: string;
  matchAddress?: string;
  max?: number;
}): TradeNameBusinessCandidate[] {
  const keyword = String(input.keyword || "").trim();
  const matchName = String(input.matchName || "").trim();
  const matchPhone = String(input.matchPhone || "").trim();
  const matchAddress = String(input.matchAddress || "").trim();
  const max = Math.min(Math.max(input.max ?? 15, 1), 30);

  if (!keyword && !matchName) return [];

  const ranked = HINTS.map((hint) => ({
    hint,
    score: scoreHint(hint, keyword, matchName, matchPhone, matchAddress)
  }))
    .filter((row) => row.score >= 8)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, max).map((row) => toCandidate(row.hint));
}
