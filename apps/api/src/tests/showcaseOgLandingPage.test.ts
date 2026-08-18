import {
  buildShowcaseOgLandingPage,
  isOgScraperUserAgent,
  isUserDocumentNavigation
} from "../services/showcase/showcaseOgLandingPage.js";
import { toAsciiOgImageUrl } from "../services/showcase/showcaseOgShareMeta.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function run() {
  const iMessageUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0";
  assert(isOgScraperUserAgent(iMessageUa), "iMessage spoofed UA is a scraper");
  assert(isOgScraperUserAgent("facebookexternalhit/1.1"), "facebookexternalhit");
  assert(isOgScraperUserAgent("Google-PageRenderer"), "Android Messages renderer");
  assert(isOgScraperUserAgent(""), "empty UA is treated as scraper");
  assert(!isOgScraperUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"), "Safari is not a scraper");
  assert(!isOgScraperUserAgent("Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36"), "Chrome is not a scraper");

  const shareUrl = "https://m.vlue.kr/showcase/01080144666";
  const spaUrl = "https://www.vlue.kr/site/web/showcase/01080144666";
  const scraperHtml = buildShowcaseOgLandingPage({
    name: "홍길동",
    org: "VLUE",
    role: "대표",
    phoneDisplay: "010-8014-4666",
    ogImage: "https://m.vlue.kr/api/v1/card/kakao-feed/abc.png",
    shareUrl,
    spaUrl,
    createUrl: "https://www.vlue.kr/membership",
    forScraper: true
  });
  assert(scraperHtml.includes('property="og:title"'), "og:title");
  assert(scraperHtml.includes('property="og:image"'), "og:image");
  assert(scraperHtml.includes('property="og:url"'), "og:url");
  assert(scraperHtml.includes(shareUrl), "canonical share host");
  assert(scraperHtml.includes("<img src="), "visible img for Android parsers");
  assert(!scraperHtml.includes("location.replace"), "scraper HTML has no JS redirect");
  assert(!scraperHtml.includes("http-equiv=\"refresh\""), "no meta refresh");
  assert(!scraperHtml.includes("background-image:url"), "scraper HTML does not preload cover image");

  const humanHtml = buildShowcaseOgLandingPage({
    name: "홍길동",
    phoneDisplay: "010-8014-4666",
    ogImage: "https://m.vlue.kr/showcase/01080144666/cover.jpg",
    shareUrl,
    spaUrl,
    createUrl: "https://www.vlue.kr/membership",
    forScraper: false
  });
  assert(humanHtml.includes('property="og:title"'), "human HTML still has OG tags");
  assert(!humanHtml.includes("location.replace"), "no JS redirect for Chrome UA Android preview");
  assert(humanHtml.includes(spaUrl), "SPA url present");
  assert(isUserDocumentNavigation({
    userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/124.0.0.0 Mobile Safari/537.36",
    secFetchUser: "?1",
    secFetchMode: "navigate",
    secFetchDest: "document"
  }), "browser tap is user navigation");
  assert(!isUserDocumentNavigation({
    userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/124.0.0.0 Mobile Safari/537.36",
    secFetchUser: "",
    secFetchMode: "no-cors",
    secFetchDest: "empty"
  }), "Android preview fetch is not user navigation");

  const encoded = toAsciiOgImageUrl(
    "https://pub.example/covers/이종근/다운로드__2_.jpg"
  );
  assert(encoded.includes("%"), "non-ascii image path is percent-encoded");
  assert(!encoded.includes("다운로드"), "raw hangul is not left in og:image URL");

  console.log("[test] showcase OG landing page ok");
}

run();
