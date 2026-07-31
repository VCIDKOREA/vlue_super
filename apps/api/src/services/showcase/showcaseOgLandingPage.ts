import { escapeHtml } from "../bizcard/bizcardHtmlUtil.js";

/**
 * 카카오·페이스북 등 OG 스크래퍼.
 * 인앱 브라우저(KAKAOTALK)까지 매칭하면 사람이 열 때도 리다이렉트가 안 되므로
 * scrap / facebookexternalhit 등만 잡는다.
 */
export function isOgScraperUserAgent(uaRaw: string): boolean {
  const ua = String(uaRaw || "").toLowerCase();
  if (!ua) return false;
  return (
    ua.includes("kakaotalk-scrap") ||
    ua.includes("kakao-scrap") ||
    ua.includes("kakaotalk share") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("facebot") ||
    ua.includes("twitterbot") ||
    ua.includes("slackbot") ||
    ua.includes("linkedinbot") ||
    ua.includes("discordbot") ||
    ua.includes("telegrambot") ||
    ua.includes("linespider") ||
    ua.includes("yeti/") ||
    ua.includes("bingbot") ||
    ua.includes("googlebot") ||
    ua.includes("embedly") ||
    ua.includes("quora link preview") ||
    ua.includes("showyoubot") ||
    ua.includes("outbrain") ||
    ua.includes("pinterest") ||
    ua.includes("applebot") ||
    ua.includes("whatsapp")
  );
}

/**
 * 카카오·메신저 OG 미리보기용 — 서버 렌더 HTML.
 * (SPA /site/web/showcase 는 JS 이후에만 메타가 생겨 크롤러가 VLUE 기본 타이틀만 봄)
 * @param opts.forScraper true 이면 즉시 redirect 없음 (OG 파싱용)
 */
export function buildShowcaseOgLandingPage(opts: {
  name: string;
  org?: string;
  role?: string;
  handle?: string;
  phoneDisplay: string;
  ogImage: string;
  shareUrl: string;
  spaUrl: string;
  createUrl: string;
  forScraper?: boolean;
}) {
  const org = escapeHtml(opts.org || "");
  const role = escapeHtml(opts.role || "");
  const handle = escapeHtml(opts.handle || "");
  const phone = escapeHtml(opts.phoneDisplay || "");
  const ogImage = escapeHtml(opts.ogImage);
  const shareUrl = escapeHtml(opts.shareUrl);
  const spaUrl = escapeHtml(opts.spaUrl);
  const createUrl = escapeHtml(opts.createUrl);
  const forScraper = Boolean(opts.forScraper);

  const titlePlain = opts.name?.trim()
    ? `${opts.name.trim()}님의 VLUE 쇼케이스`
    : "VLUE 쇼케이스";
  const title = escapeHtml(titlePlain);

  const descParts = [
    opts.org?.trim(),
    opts.role?.trim(),
    opts.handle?.trim() ? `@${String(opts.handle).replace(/^@/, "")}` : "",
    opts.phoneDisplay?.trim(),
    "VLUE 인증 · 안심 통신 프로필"
  ].filter(Boolean);
  const description = escapeHtml(descParts.slice(0, 3).join(" · ") || "VLUE 디지털 쇼케이스");

  const redirectHead = forScraper
    ? ""
    : `<meta http-equiv="refresh" content="1;url=${spaUrl}"/>`;
  const redirectScript = forScraper
    ? ""
    : `<script>setTimeout(function(){location.replace(${JSON.stringify(opts.spaUrl)});},400);</script>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="VLUE"/>
<meta property="og:locale" content="ko_KR"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:image:secure_url" content="${ogImage}"/>
<meta property="og:image:width" content="800"/>
<meta property="og:image:height" content="800"/>
<meta property="og:url" content="${shareUrl}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="twitter:image" content="${ogImage}"/>
${redirectHead}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
background:#0b1220;color:#e2e8f0;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif}
.card{max-width:420px;width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(148,163,184,.2);
background:#111827;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.cover{aspect-ratio:1.2;background:#0f172a center/cover no-repeat;background-image:url('${ogImage}')}
.body{padding:18px 16px 20px}
.badge{display:inline-block;font-size:11px;font-weight:800;color:#7dd3fc;margin-bottom:8px}
h1{font-size:1.25rem;font-weight:900;letter-spacing:-.02em;line-height:1.3}
.meta{margin-top:8px;font-size:13px;font-weight:600;color:#94a3b8;line-height:1.45}
a.btn{display:block;margin-top:16px;padding:13px;border-radius:12px;text-align:center;text-decoration:none;
font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#1d4ed8,#2563eb)}
.sub{margin-top:12px;text-align:center;font-size:12px;color:#64748b}
.sub a{color:#7dd3fc;font-weight:700;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="cover" role="img" aria-label="쇼케이스 미리보기"></div>
  <div class="body">
    <p class="badge">VLUE Showcase</p>
    <h1>${title}</h1>
    <p class="meta">
      ${org ? `${org}<br/>` : ""}${role ? `${role}<br/>` : ""}${handle ? `@${handle.replace(/^@/, "")}<br/>` : ""}${phone || ""}
    </p>
    <a class="btn" href="${spaUrl}">쇼케이스 열기</a>
    <p class="sub"><a href="${createUrl}">나도 VLUE 만들기</a></p>
  </div>
</div>
${redirectScript}
</body>
</html>`;
}
