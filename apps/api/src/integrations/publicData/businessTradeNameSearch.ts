import { maskCeoName } from "../../lib/maskCeoName.js";
import { searchPublicBusinessHints } from "../../services/search/publicBusinessHintRegistry.js";
import { searchFscCorpByName } from "./fscCorpBasicSearch.js";
import { lookupNtsBusinessByNumber } from "./ntsBusinessLookup.js";
import { searchSbizStoresInRadius } from "./sbizStoreRadiusSearch.js";
import { searchSmallBusinessStoresByName } from "./smallBusinessStoreSearch.js";

export type TradeNameBusinessCandidate = {
  store_name: string;
  business_number: string;
  ceo_name: string;
  business_status: string;
  biz_type: string;
  biz_item: string;
  address: string;
  telephone: string;
  source: string;
};

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function mergeCandidate(
  map: Map<string, TradeNameBusinessCandidate>,
  input: Partial<TradeNameBusinessCandidate> & { business_number: string }
) {
  const key = digitsOnly(input.business_number);
  if (key.length !== 10) return;
  const prev = map.get(key);
  map.set(key, {
    store_name: input.store_name || prev?.store_name || "미확인",
    business_number: input.business_number,
    ceo_name: input.ceo_name || prev?.ceo_name || "",
    business_status: input.business_status || prev?.business_status || "미확인",
    biz_type: input.biz_type || prev?.biz_type || "미확인",
    biz_item: input.biz_item || prev?.biz_item || "미확인",
    address: input.address || prev?.address || "",
    telephone: input.telephone || prev?.telephone || "",
    source: [prev?.source, input.source].filter(Boolean).join("+") || "unknown"
  });
}

export type TradeNameSearchContext = {
  matchName?: string;
  matchPhone?: string;
  matchAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

function applyMaskedCeo(candidate: TradeNameBusinessCandidate): TradeNameBusinessCandidate {
  return {
    ...candidate,
    ceo_name: candidate.ceo_name ? maskCeoName(candidate.ceo_name) : ""
  };
}

/** 지점명이 붙은 상호에서 FSC 법인명 검색용 브랜드 키워드 추출 */
function deriveFscSearchTerms(name: string): string[] {
  const raw = String(name || "").trim();
  if (!raw) return [];

  const terms = new Set<string>([raw]);
  const noBranch = raw.replace(/\s*.+점\s*$/u, "").trim();
  if (noBranch.length >= 2) terms.add(noBranch);

  const firstToken = raw.split(/\s+/)[0]?.trim();
  if (firstToken && firstToken.length >= 2) terms.add(firstToken);

  const compact = raw.replace(/\s+/g, "");
  const brandMatch = compact.match(/^(.+?(?:플레이스|카페|병원|약국|마트|식당|오피스|센터|스토어|샵))/u);
  if (brandMatch?.[1] && brandMatch[1].length >= 2) terms.add(brandMatch[1]);

  return [...terms];
}

export async function searchBusinessesByTradeName(
  keyword: string,
  max = 15,
  context: TradeNameSearchContext = {}
): Promise<TradeNameBusinessCandidate[]> {
  const q = String(keyword || "").trim();
  if (!q) return [];

  const fscTerms = [
    ...new Set([
      q,
      ...deriveFscSearchTerms(q),
      ...(context.matchName ? deriveFscSearchTerms(context.matchName) : [])
    ])
  ].slice(0, 3);

  const [stores, fscBatches, hints, sbizRows] = await Promise.all([
    searchSmallBusinessStoresByName(q, max, {
      latitude: context.latitude,
      longitude: context.longitude
    }),
    Promise.all(fscTerms.map((term) => searchFscCorpByName(term, max))),
    Promise.resolve(
      searchPublicBusinessHints({
        keyword: q,
        matchName: context.matchName,
        matchPhone: context.matchPhone,
        matchAddress: context.matchAddress,
        max
      })
    ),
    context.latitude != null && context.longitude != null
      ? searchSbizStoresInRadius({
          latitude: context.latitude,
          longitude: context.longitude,
          storeName: q,
          max
        })
      : Promise.resolve([])
  ]);

  const fscRows = fscBatches.flat();

  const map = new Map<string, TradeNameBusinessCandidate>();

  for (const store of stores) {
    mergeCandidate(map, {
      store_name: store.storeName,
      business_number: store.businessNumber,
      ceo_name: store.ceoName,
      business_status: "미확인",
      biz_type: store.industry || "미확인",
      biz_item: store.industry || "미확인",
      address: store.address,
      telephone: store.telephone,
      source: store.source
    });
  }

  for (const corp of fscRows) {
    mergeCandidate(map, {
      store_name: corp.corpName,
      business_number: corp.businessNumber,
      ceo_name: corp.ceoName,
      business_status: "미확인",
      biz_type: corp.industry || "미확인",
      biz_item: corp.industry || "미확인",
      address: corp.address,
      telephone: corp.telephone,
      source: corp.source
    });
  }

  for (const hint of hints) {
    mergeCandidate(map, hint);
  }

  for (const store of sbizRows) {
    const existing = [...map.values()].find(
      (row) =>
        row.store_name.replace(/\s/g, "") === store.storeName.replace(/\s/g, "") ||
        (store.address && row.address && row.address.includes(store.address.slice(0, 12)))
    );
    if (!existing) continue;
    if (existing.biz_type === "미확인") existing.biz_type = store.industry;
    if (existing.biz_item === "미확인") existing.biz_item = store.industry;
    if (!existing.address) existing.address = store.address;
    existing.source = [existing.source, store.source].filter(Boolean).join("+");
  }

  const candidates = [...map.values()]
    .filter((row) => digitsOnly(row.business_number).length === 10)
    .slice(0, max);
  const statusTargets = candidates.slice(0, 5);
  await Promise.all(
    statusTargets.map(async (candidate) => {
      const nts = await lookupNtsBusinessByNumber(candidate.business_number);
      if (!nts) return;
      candidate.business_status = nts.businessStatus;
      if (candidate.biz_type === "미확인") candidate.biz_type = nts.bizType;
      if (candidate.biz_item === "미확인") candidate.biz_item = nts.bizItem;
    })
  );

  return candidates.map(applyMaskedCeo);
}
