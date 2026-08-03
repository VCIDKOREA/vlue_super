import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { themePalette, normalizeBizcardTemplate } from "./bizcardClassicSpec.js";
import { escapeHtml } from "./bizcardHtmlUtil.js";
import {
  cardValidateApiUrl,
  getVlueCreateUrl
} from "./bizcardPublicUrls.js";

/** 수신자용 풀 쇼케이스 공개 페이지 (카카오 붙여넣기 링크) */
export function buildBizcardLiveViewerPage(opts: {
  cardId: string;
  card: BizcardClassicSnapshot;
  apiBase: string;
}) {
  const base = opts.apiBase.replace(/\/$/, "");
  const cardId = opts.cardId;
  const pal = themePalette(normalizeBizcardTemplate(opts.card.designTemplate));
  const name = escapeHtml(opts.card.name || "—");
  const org = escapeHtml(opts.card.organization || "");
  const title = escapeHtml(
    [opts.card.title, opts.card.department].filter(Boolean).join(" · ")
  );
  const phone = escapeHtml(opts.card.phone || "");
  const email = escapeHtml(opts.card.email || "");
  const address = escapeHtml(opts.card.address || "");
  const website = escapeHtml(opts.card.website || "");
  const cover = String(opts.card.shareCoverUrl || "").trim();
  const coverSafe =
    cover.startsWith("http") || cover.startsWith("data:image/") ? escapeHtml(cover) : "";
  const coverCss = coverSafe
    ? `background-image:linear-gradient(180deg,rgba(8,15,28,.28),rgba(8,15,28,.78)),url('${coverSafe}');background-size:cover;background-position:center;`
    : "background:linear-gradient(160deg,#0b1a33,#12263f 55%,#0f172a);";
  const createUrl = getVlueCreateUrl();
  const validateUrl = cardValidateApiUrl(base, cardId);
  const galleryUrl = `${base}/api/v1/card/gallery-png/${encodeURIComponent(cardId)}`;
  const vcfUrl = `${base}/api/v1/card/vcf/${encodeURIComponent(cardId)}`;
  const coverHttp = cover.startsWith("http") ? cover : "";
  const feedImage =
    coverHttp || `${base}/api/v1/card/kakao-feed/${encodeURIComponent(cardId)}.png`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="robots" content="noindex"/>
<title>${name} · VLUE 쇼케이스</title>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${name}님의 VLUE 인증명함"/>
<meta property="og:description" content="${org || "VLUE 디지털 인증명함 · 풀 쇼케이스"}"/>
<meta property="og:image" content="${escapeHtml(feedImage)}"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#05070c;color:#e2e8f0;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif}
.shell{min-height:100vh;display:flex;flex-direction:column;max-width:480px;margin:0 auto}
.hero{min-height:38vh;padding:28px 20px 48px;${coverCss}}
.badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(15,23,42,.55);border:1px solid rgba(125,211,252,.35);font-size:11px;font-weight:800;color:#e0f2fe}
.live-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.25);animation:pulse 1.4s ease infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.name{margin-top:18px;font-size:2rem;font-weight:900;letter-spacing:-.03em;line-height:1.15;text-shadow:0 2px 10px rgba(0,0,0,.45)}
.meta{margin-top:8px;font-size:14px;font-weight:700;color:#cbd5e1;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.panel{flex:1;margin-top:-28px;border-radius:24px 24px 0 0;background:#0b1220;padding:20px 16px 32px;box-shadow:0 -10px 40px rgba(0,0,0,.35)}
.tabs{display:flex;gap:8px;margin-bottom:14px}
.tab{flex:1;padding:10px 8px;border-radius:12px;border:1px solid rgba(148,163,184,.2);background:#111827;color:#94a3b8;font-size:12px;font-weight:800;text-align:center}
.tab.is-on{background:linear-gradient(135deg,#1d4ed8,#2563eb);border-color:transparent;color:#fff}
.section{display:none}
.section.is-on{display:block}
.card{border-radius:16px;border:1px solid rgba(148,163,184,.18);background:linear-gradient(160deg,${pal.bg[0]},${pal.bg[1]});padding:16px;color:${pal.text}}
.eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;color:${pal.accent};margin-bottom:8px}
.card-name{font-size:1.35rem;font-weight:900;line-height:1.2}
.card-role{margin-top:4px;font-size:13px;font-weight:700;color:${pal.sub}}
.row{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;font-weight:600;color:${pal.sub}}
.ico{opacity:.75;width:1.1em;flex-shrink:0}
.valid{margin-top:12px;font-size:11px;font-weight:700;color:${pal.accent}}
.art{margin-top:14px;aspect-ratio:1;border-radius:14px;background:rgba(15,23,42,.35);border:1px solid rgba(148,163,184,.15);display:flex;align-items:center;justify-content:center}
.art img{width:42%;opacity:.55;filter:grayscale(1)}
.footer-live{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(56,189,248,.25)}
.footer-live strong{font-size:12px;font-weight:900;color:#e2e8f0}
.footer-live span{display:block;font-size:10px;color:#94a3b8;margin-top:2px}
.sub{display:grid;gap:8px;margin-top:14px}
.sub a{display:block;padding:13px 14px;border-radius:12px;background:#111827;border:1px solid rgba(148,163,184,.2);color:#e2e8f0;font-size:13px;font-weight:800;text-align:center;text-decoration:none}
.viral{margin-top:18px;text-align:center;font-size:12px;line-height:1.55;color:#94a3b8}
.viral a{color:#7dd3fc;font-weight:800;text-decoration:none}
.waste{display:none;padding:24px;text-align:center;color:#fca5a5;font-weight:800}
.waste.show{display:block}
</style>
</head>
<body>
<div class="shell" id="vlue-showcase">
  <header class="hero">
    <span class="badge"><i class="live-dot" aria-hidden="true"></i> VLUE · FULL SHOWCASE</span>
    <h1 class="name">${name}</h1>
    ${title ? `<p class="meta">${title}</p>` : ""}
    ${org ? `<p class="meta">${org}</p>` : ""}
  </header>
  <main class="panel">
    <div class="waste" id="vlue-waste">이 명함은 유효기간이 만료되어 폐기되었습니다.</div>
    <div id="vlue-body">
      <div class="tabs" role="tablist">
        <button type="button" class="tab is-on" data-tab="front" id="tab-front">앞면 · 프로필</button>
        <button type="button" class="tab" data-tab="back" id="tab-back">뒷면 · 연락</button>
      </div>
      <section class="section is-on" id="sec-front" data-sec="front">
        <div class="card">
          <p class="eyebrow">DIGITAL ID · PROFILE</p>
          <p class="card-name">${name}</p>
          ${title ? `<p class="card-role">${title}</p>` : ""}
          ${org ? `<p class="card-role">${org}</p>` : ""}
          ${phone ? `<div class="row"><span class="ico">☎</span>${phone}</div>` : ""}
          ${email ? `<div class="row"><span class="ico">✉</span>${email}</div>` : ""}
          <div class="art" aria-hidden="true"><img src="${escapeHtml(feedImage)}" alt=""/></div>
        </div>
        <div class="footer-live">
          <div>
            <strong>VLUE | 인증확인</strong>
            <span>Verified in real-time channel</span>
          </div>
          <span class="badge" style="margin:0"><i class="live-dot"></i> LIVE</span>
        </div>
      </section>
      <section class="section" id="sec-back" data-sec="back">
        <div class="card">
          <p class="eyebrow">CONTACT</p>
          ${phone ? `<div class="row"><span class="ico">☎</span>${phone}</div>` : ""}
          ${email ? `<div class="row"><span class="ico">✉</span>${email}</div>` : ""}
          ${address ? `<div class="row"><span class="ico">⌂</span>${address}</div>` : ""}
          ${website ? `<div class="row"><span class="ico">↗</span>${website}</div>` : ""}
          ${!phone && !email && !address && !website ? `<div class="row">공개된 연락처가 없습니다.</div>` : ""}
        </div>
        <div class="sub">
          <a href="${escapeHtml(galleryUrl)}" download="VLUE-gallery-card.png">명함 이미지 저장</a>
          <a href="${escapeHtml(vcfUrl)}" download="VLUE-contact.vcf">연락처에 저장</a>
        </div>
      </section>
    </div>
    <div class="viral">
      [VLUE 인증] 실시간 검증된 디지털 인증명함입니다.<br/>
      <a href="${escapeHtml(createUrl)}">나도 명함 만들기</a>
    </div>
  </main>
</div>
<script>
(function(){
  var VALIDATE='${escapeHtml(validateUrl)}';
  document.querySelectorAll('.tab').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('is-on',b===btn);});
      document.querySelectorAll('.section').forEach(function(s){
        s.classList.toggle('is-on',s.getAttribute('data-sec')===id);
      });
    });
  });
  fetch(VALIDATE,{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.valid||d.expired||d.status==='expired'){
      var waste=document.getElementById('vlue-waste');
      var body=document.getElementById('vlue-body');
      if(waste)waste.classList.add('show');
      if(body)body.style.display='none';
    }
  }).catch(function(){});
})();
</script>
</body>
</html>`;
}
