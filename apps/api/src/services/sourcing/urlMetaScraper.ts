const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      "i"
    );
    const m = html.match(re);
    const raw = (m?.[1] || m?.[2] || "").trim();
    if (raw) return decodeHtmlEntities(raw);
  }
  return "";
}

function pickTitleTag(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : "";
}

function pickPriceFromHtml(html: string) {
  const ld = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ld) {
    for (const block of ld) {
      const inner = block.replace(/<script[^>]*>|<\/script>/gi, "");
      try {
        const json = JSON.parse(inner) as unknown;
        const nodes = Array.isArray(json) ? json : [json];
        for (const node of nodes) {
          const obj = node as Record<string, unknown>;
          const offers = obj.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          const price = Number(offer?.price ?? obj.price ?? 0);
          if (price > 0) return Math.round(price);
        }
      } catch {
        /* ignore */
      }
    }
  }
  const won = html.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/);
  if (won?.[1]) return Number(won[1].replace(/,/g, "")) || 0;
  return 0;
}

function absolutizeUrl(base: string, maybeRelative: string) {
  const raw = maybeRelative.trim();
  if (!raw) return "";
  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}

export async function scrapeUrlMeta(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!res.ok) throw new Error(`페이지를 불러오지 못했습니다 (${res.status})`);
    const html = await res.text();
    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ||
      pickTitleTag(html) ||
      "소싱 상품";
    const imageUrl = absolutizeUrl(
      url,
      pickMeta(html, ["og:image", "twitter:image", "og:image:url"])
    );
    const description =
      pickMeta(html, ["og:description", "twitter:description", "description"]) || "";
    const priceKrw = pickPriceFromHtml(html);
    return { title, imageUrl, description, priceKrw };
  } finally {
    clearTimeout(timer);
  }
}
