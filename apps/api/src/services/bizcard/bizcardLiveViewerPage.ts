import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { themePalette, normalizeBizcardTemplate } from "./bizcardClassicSpec.js";
import { escapeHtml } from "./bizcardHtmlUtil.js";
import {
  cardValidateApiUrl,
  cardViewUrl,
  getKakaoShareButtonImageUrl,
  getVlueCreateUrl
} from "./bizcardPublicUrls.js";

function paletteFor(snapshot: BizcardClassicSnapshot) {
  return themePalette(normalizeBizcardTemplate(snapshot.designTemplate));
}

/** 라이브 홀로그램 웹 뷰어 + 3원화 소장 + 바이럴 배너 */
export function buildBizcardLiveViewerPage(opts: {
  cardId: string;
  card: BizcardClassicSnapshot;
  apiBase: string;
}) {
  const base = opts.apiBase.replace(/\/$/, "");
  const cardId = opts.cardId;
  const pal = paletteFor(opts.card);
  const name = escapeHtml(opts.card.name || "—");
  const org = escapeHtml(opts.card.organization || "");
  const title = escapeHtml(
    [opts.card.title, opts.card.department].filter(Boolean).join(" · ")
  );
  const phone = escapeHtml(opts.card.phone || "");
  const email = escapeHtml(opts.card.email || "");
  const address = escapeHtml(opts.card.address || "");
  const createUrl = getVlueCreateUrl();
  const validateUrl = cardValidateApiUrl(base, cardId);
  const galleryUrl = `${base}/api/v1/card/gallery-png/${encodeURIComponent(cardId)}`;
  const vcfUrl = `${base}/api/v1/card/vcf/${encodeURIComponent(cardId)}`;
  const walletUrl = `${base}/api/v1/card/wallet-pass/${encodeURIComponent(cardId)}`;
  const ogImage = `${base}/api/v1/card/share-button.png`;

  const contacts = [
    phone ? `<div class="row"><span class="ico">☎</span>${phone}</div>` : "",
    email ? `<div class="row"><span class="ico">✉</span>${email}</div>` : "",
    address ? `<div class="row"><span class="ico">⌂</span>${address}</div>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="robots" content="noindex"/>
<title>${name} · VLUE 라이브 명함</title>
<meta property="og:type" content="website"/>
<meta property="og:title" content="VLUE 디지털 인증명함"/>
<meta property="og:description" content="실시간 라이브 홀로그램 검증"/>
<meta property="og:image" content="${escapeHtml(ogImage)}"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#16161c;color:#e2e8f0;font-family:Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;min-height:100vh;padding:12px 12px 24px}
.wrap{max-width:420px;margin:0 auto}
.stage{background:#16161c;border-radius:16px;padding:8px 0 4px}
.card{width:100%;aspect-ratio:90/50;border-radius:14px;position:relative;overflow:hidden;background:linear-gradient(145deg,${pal.bg[0]},${pal.bg[1]},${pal.bg[2]});border:1px solid ${pal.border}}
.card-inner{padding:14px 16px;height:100%;display:flex;flex-direction:column;position:relative;z-index:1}
.top{display:flex;align-items:flex-start;gap:10px}
.org{font-size:0.72rem;font-weight:900;color:${pal.accent}}
.badge{margin-left:auto;font-size:0.55rem;font-weight:900;padding:3px 8px;border-radius:999px;background:rgba(15,23,42,.55);color:#e2e8f0}
.name{margin-top:auto;font-size:1.35rem;font-weight:900;color:${pal.text};line-height:1.15}
.role{font-size:0.78rem;font-weight:700;color:${pal.sub};margin-top:4px}
.contacts{margin-top:8px;font-size:0.68rem;font-weight:600;color:${pal.sub}}
.contacts .row{display:flex;gap:6px;margin-top:3px}
.holo{position:absolute;top:10px;right:12px;width:52px;height:22px;border-radius:999px;background:rgba(15,23,42,.55);overflow:hidden;z-index:2}
.holo-shine{position:absolute;inset:0;background:linear-gradient(105deg,transparent,rgba(125,211,252,.65),transparent);animation:shine 4s ease-in-out infinite}
.holo-txt{position:relative;font-size:0.5rem;font-weight:900;letter-spacing:.12em;text-align:center;line-height:22px;color:#fff}
.live{position:absolute;right:12px;bottom:10px;font-size:0.55rem;font-weight:700;color:${pal.sub};font-family:ui-monospace,monospace;z-index:2}
@keyframes shine{0%,100%{transform:translateX(-140%);opacity:.3}50%{transform:translateX(140%);opacity:1}}
.waste{display:none;position:absolute;inset:0;background:#e5e7eb;border-radius:14px;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#4b5563;font-weight:800;padding:12px;z-index:5}
.waste.show{display:flex}
.actions{display:grid;gap:8px;margin-top:14px}
.btn{display:block;width:100%;padding:14px 16px;border-radius:12px;font-size:0.88rem;font-weight:800;text-align:center;text-decoration:none;border:none;cursor:pointer}
.btn-primary{background:#2563eb;color:#fff}
.btn-secondary{background:#1e293b;color:#e2e8f0;border:1px solid rgba(148,163,184,.35)}
.btn-wallet{background:linear-gradient(135deg,#0f172a,#334155);color:#f8fafc;border:1px solid rgba(56,189,248,.35)}
.btn-contact{background:#0d9488;color:#fff}
.viral{margin-top:16px;padding:14px;border-radius:12px;background:#0f1419;border:1px solid rgba(56,189,248,.2);text-align:center;font-size:0.72rem;line-height:1.5;color:#94a3b8}
.viral a{color:#7dd3fc;font-weight:800;text-decoration:none}
.hint{margin-top:8px;font-size:0.65rem;color:#64748b;text-align:center;line-height:1.45}
</style>
</head>
<body>
<div class="wrap">
  <div class="stage">
    <div class="card" id="vlue-live-card">
      <div class="holo" id="vlue-holo"><span class="holo-shine"></span><span class="holo-txt">VLUE</span></div>
      <span class="live" id="vlue-live-ts">LIVE</span>
      <div class="card-inner" id="vlue-card-body">
        <div class="top">
          <div>
            <div class="org">${org || "VLUE"}</div>
            <span class="badge">VLUE ✓</span>
          </div>
        </div>
        <div class="name">${name}</div>
        ${title ? `<div class="role">${title}</div>` : ""}
        <div class="contacts">${contacts}</div>
      </div>
      <div class="waste" id="vlue-waste">
        <span style="font-size:2rem">⚠️</span>
        <p style="margin-top:8px;font-size:0.85rem">유효기간이 만료되어<br/>폐기된 명함입니다.</p>
      </div>
    </div>
  </div>

  <div class="actions">
    <a class="btn btn-primary" href="${escapeHtml(galleryUrl)}" download="VLUE-gallery-card.png">휴대폰 갤러리에 명함 저장</a>
    <a class="btn btn-wallet" href="${escapeHtml(walletUrl)}">움직이는 홀로그램 명함 · 폰 지갑에 추가</a>
    <a class="btn btn-contact" href="${escapeHtml(vcfUrl)}" download="VLUE-contact.vcf">내 휴대폰 연락처에 즉시 저장</a>
  </div>
  <p class="hint">갤러리 PNG에는 진본 검증 QR이 포함됩니다. 지갑(.pkpass)은 개발 스텁이며 Apple 서명 연동 후 정식 발급됩니다.</p>

  <div class="viral">
    [VLUE 인증] 본 명함은 위조 방지 기술이 적용된 유료 멤버십 보안 명함입니다.<br/>
    <a href="${escapeHtml(createUrl)}">나도 5초 만에 명함 만들기</a>
  </div>
</div>
<script>
(function(){
  var VALIDATE='${escapeHtml(validateUrl)}';
  var CARD_ID='${escapeHtml(cardId)}';
  function pad(n){return (n<10?'0':'')+n;}
  function tick(){
    var el=document.getElementById('vlue-live-ts');
    if(!el)return;
    var d=new Date();
    el.textContent='LIVE '+d.getFullYear()+'.'+pad(d.getMonth()+1)+'.'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  function holoTilt(e){
    var h=document.getElementById('vlue-holo');
    if(!h)return;
    var g=Number(e.gamma)||0,b=Number(e.beta)||0;
    h.style.transform='translate('+(g*0.25)+'px,'+((b-45)*0.12)+'px)';
  }
  function invalidate(){
    var body=document.getElementById('vlue-card-body');
    var waste=document.getElementById('vlue-waste');
    if(body)body.style.display='none';
    if(waste)waste.classList.add('show');
  }
  tick();setInterval(tick,1000);
  if(window.DeviceOrientationEvent){
    window.addEventListener('deviceorientation',holoTilt,true);
  }
  fetch(VALIDATE,{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.valid||d.expired||d.status==='expired')invalidate();
  }).catch(function(){invalidate();});
})();
</script>
</body>
</html>`;
}
