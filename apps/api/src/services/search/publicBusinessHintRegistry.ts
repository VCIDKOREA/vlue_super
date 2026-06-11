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

/** sbdc/FSC 미신청 시 교차검증용 공개 사업자 힌트 (실제 공공·비즈노 조회값 기반) */
const HINTS: PublicBusinessHint[] = [
  {
    store_name: "다다오피스 본점",
    aliases: ["다다오피스", "다다오피스본점", "dadaoffice", "dada office"],
    business_number: "504-24-34309",
    ceo_name: "박지숙",
    address: "대구광역시 북구 노원로 262",
    telephone: "053-355-7011",
    biz_type: "협회 및 단체, 수리 및 기타 개인 서비스업",
    biz_item: "문구, 사무용품"
  }
];

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
