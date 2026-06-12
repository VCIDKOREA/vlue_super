export type MarketShopLink = {
  shop_name: string;
  price: number;
  url: string;
};

export type MarketPriceInfo = {
  search_keyword: string;
  lowest_price: number | null;
  highest_price: number | null;
  average_price: number | null;
  shop_links: MarketShopLink[];
  available: boolean;
};

function stripTags(raw: string): string {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

export async function searchNaverShoppingMarketPrice(keyword: string, max = 10): Promise<MarketPriceInfo> {
  const q = String(keyword || "").trim();
  const empty: MarketPriceInfo = {
    search_keyword: q,
    lowest_price: null,
    highest_price: null,
    average_price: null,
    shop_links: [],
    available: false
  };
  if (!q) return empty;

  const clientId = String(process.env.NAVER_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.NAVER_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return empty;

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", q);
  url.searchParams.set("display", String(Math.min(Math.max(max, 1), 30)));
  url.searchParams.set("sort", "asc");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret
      }
    });
    if (!res.ok) return empty;

    const json = (await res.json()) as {
      items?: Array<Record<string, string>>;
    };
    const items = json.items || [];
    if (!items.length) return empty;

    const shop_links: MarketShopLink[] = items.slice(0, max).map((row) => ({
      shop_name: stripTags(row.mallName || row.brand || "네이버쇼핑"),
      price: Number(String(row.lprice || "0").replace(/\D/g, "")) || 0,
      url: String(row.link || "").trim()
    })).filter((row) => row.price > 0);

    if (!shop_links.length) return empty;

    const prices = shop_links.map((s) => s.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

    return {
      search_keyword: q,
      lowest_price: lowest,
      highest_price: highest,
      average_price: average,
      shop_links,
      available: true
    };
  } catch {
    return empty;
  }
}
