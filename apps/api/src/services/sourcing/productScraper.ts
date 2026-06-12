import axios from "axios";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type ScrapedProduct = {
  title: string;
  price: number;
  description: string;
  imageUrl: string;
  sourceUrl: string;
};

export class ScrapeBlockedError extends Error {
  constructor(message = "해당 사이트는 직접 입력이 필요합니다") {
    super(message);
    this.name = "ScrapeBlockedError";
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
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

function pickMeta($: cheerio.CheerioAPI, keys: string[]) {
  for (const key of keys) {
    const el =
      $(`meta[property="${key}"]`).attr("content") ||
      $(`meta[name="${key}"]`).attr("content") ||
      "";
    if (el.trim()) return decodeEntities(el.trim());
  }
  return "";
}

function pickPriceFromJsonLd($: cheerio.CheerioAPI) {
  let price = 0;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price > 0) return;
    const raw = $(el).html()?.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const obj = node as Record<string, unknown>;
        const offers = obj.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        const candidate = Number(offer?.price ?? obj.price ?? 0);
        if (candidate > 0) {
          price = Math.round(candidate);
          return false;
        }
      }
    } catch {
      /* ignore */
    }
  });
  return price;
}

function pickPriceFromHtml(html: string) {
  const won = html.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/);
  if (won?.[1]) return Number(won[1].replace(/,/g, "")) || 0;
  return 0;
}

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  const sourceUrl = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("올바른 상품 URL을 입력해 주세요.");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("http 또는 https URL만 지원합니다.");
  }

  try {
    const res = await axios.get<string>(sourceUrl, {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
      responseType: "text",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml"
      },
      validateStatus: (status) => status < 500
    });

    if (res.status === 403 || res.status === 401) {
      throw new ScrapeBlockedError();
    }
    if (res.status < 200 || res.status >= 400) {
      throw new ScrapeBlockedError(`페이지를 불러오지 못했습니다 (${res.status})`);
    }

    const html = res.data || "";
    const $ = cheerio.load(html);

    const title =
      pickMeta($, ["og:title", "twitter:title"]) ||
      decodeEntities($("title").first().text().trim()) ||
      "소싱 상품";

    const imageUrl = absolutizeUrl(
      sourceUrl,
      pickMeta($, ["og:image", "twitter:image", "og:image:url"])
    );

    const description =
      pickMeta($, ["og:description", "twitter:description", "description"]) || "";

    const price = pickPriceFromJsonLd($) || pickPriceFromHtml(html);

    return {
      title: title.slice(0, 200),
      price,
      description: description.slice(0, 4000),
      imageUrl,
      sourceUrl
    };
  } catch (e) {
    if (e instanceof ScrapeBlockedError) throw e;
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 403 || status === 401) throw new ScrapeBlockedError();
      if (e.code === "ECONNABORTED") throw new ScrapeBlockedError("요청 시간이 초과되었습니다. 직접 입력해 주세요.");
    }
    throw new ScrapeBlockedError();
  }
}
