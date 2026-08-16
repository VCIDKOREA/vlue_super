/**
 * 정통 90×50mm 비즈니스 명함 — 동적 SVG 코어 (프론트·API OG PNG 공통)
 */
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

export const BIZCARD_ASPECT = 90 / 50;
export const BIZCARD_CARD_W = 900;
export const BIZCARD_CARD_H = 500;
export const BIZCARD_CANVAS_W = 900;
export const BIZCARD_CANVAS_H = 680;
export const BIZCARD_CARD_Y = 48;
export const BIZCARD_BANNER_Y = 568;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escJs(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

function truncate(s, max) {
  const t = String(s || "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function themePalette(templateId) {
  const tpl = normalizeLetteringBizcardTemplate(templateId);
  if (tpl === "classic-light") {
    return {
      bg: ["#ffffff", "#f8fbff", "#eff6ff"],
      accent: "#2563eb",
      text: "#0f172a",
      sub: "#64748b",
      border: "rgba(147,197,253,0.55)"
    };
  }
  if (tpl === "professional-gold") {
    return {
      bg: ["#1a1508", "#2d2410", "#1f1a0c"],
      accent: "#d4af37",
      text: "#faf6eb",
      sub: "#c9b896",
      border: "rgba(212,175,55,0.45)"
    };
  }
  if (tpl === "creative-gradient") {
    return {
      bg: ["#312e81", "#7c3aed", "#db2777"],
      accent: "#f9a8d4",
      text: "#ffffff",
      sub: "#e9d5ff",
      border: "rgba(249,168,212,0.4)"
    };
  }
  return {
    bg: ["#0f172a", "#1e293b", "#0b1220"],
    accent: "#38bdf8",
    text: "#f8fafc",
    sub: "#94a3b8",
    border: "rgba(56,189,248,0.35)"
  };
}

export function cardToSvgSnapshot(card) {
  return {
    organization: card?.organization || "",
    name: card?.name || card?.displayName || "",
    title: card?.title || "",
    department: card?.department || card?.dept || "",
    phone: card?.phone ? formatLetteringPhoneDisplay(card.phone) || String(card.phone).trim() : "",
    email: card?.email || "",
    address:
      card?.address ||
      card?.businessAddress ||
      card?.companyAddress ||
      "",
    website: card?.website || card?.homepage || "",
    logoUrl: card?.logoUrl || "",
    designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate)
  };
}

/** OG·썸네일 — 명함 카드 면만 (여백 없음) */
export function buildBizcardCardLayerSvg(data, opts = {}) {
  const w = Math.max(360, Math.floor(opts.width || BIZCARD_CARD_W));
  const h = Math.max(200, Math.floor(opts.height || BIZCARD_CARD_H));
  const invalidated = Boolean(opts.invalidated);
  if (invalidated) {
    return buildInvalidateCardLayerSvg({ width: w, height: h });
  }

  const pal = themePalette(data.designTemplate);
  const sx = w / BIZCARD_CARD_W;
  const sy = h / BIZCARD_CARD_H;
  const pad = 36 * sx;
  const org = truncate(data.organization || "VLUE", 28);
  const name = truncate(data.name || "—", 18);
  const title = truncate(data.title || "", 22);
  const dept = truncate(data.department || "", 24);
  const roleLine = [title, dept].filter(Boolean).join(" · ");
  const email = truncate(data.email || "", 36);
  const phone = truncate(data.phone || "", 20);
  const address = truncate(data.address || "", 40);
  const logo = String(data.logoUrl || "").trim();
  const logoSize = 64 * sy;
  const gradId = `bg-${Math.random().toString(36).slice(2, 9)}`;
  const holoId = `holo-${Math.random().toString(36).slice(2, 9)}`;

  const logoBlock =
    logo.startsWith("http") || logo.startsWith("data:image")
      ? `<image href="${esc(logo)}" x="${pad}" y="${32 * sy}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
      : `<rect x="${pad}" y="${32 * sy}" width="${logoSize}" height="${logoSize}" rx="${10 * sx}" fill="rgba(255,255,255,0.1)"/>
         <text x="${pad + logoSize / 2}" y="${32 * sy + logoSize * 0.62}" text-anchor="middle" font-size="${logoSize * 0.42}" font-weight="900" fill="${pal.accent}">${esc(org.slice(0, 1))}</text>`;

  const contacts = [];
  if (email) contacts.push({ icon: "✉", value: email });
  if (phone) contacts.push({ icon: "☎", value: phone });
  if (address) contacts.push({ icon: "⌂", value: address });

  const contactStartY = h - pad - contacts.length * 22 * sy;
  const contactSvg = contacts
    .map((row, i) => {
      const y = contactStartY + i * 22 * sy;
      return `<text x="${pad}" y="${y}" font-family="Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif" font-size="${11 * sy}" font-weight="700" fill="${pal.sub}">${esc(`${row.icon} ${row.value}`)}</text>`;
    })
    .join("");

  const nameY = 200 * sy;
  const rx = 14 * Math.min(sx, sy);

  return `<g id="vlue-card-face">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${pal.bg[0]}"/>
      <stop offset="55%" stop-color="${pal.bg[1]}"/>
      <stop offset="100%" stop-color="${pal.bg[2]}"/>
    </linearGradient>
    <linearGradient id="${holoId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="45%" stop-color="rgba(125,211,252,0.55)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${gradId})" stroke="${pal.border}" stroke-width="1.5"/>
  ${logoBlock}
  <text x="${pad + logoSize + 12 * sx}" y="${58 * sy}" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${20 * sy}" font-weight="900" fill="${pal.accent}">${esc(org)}</text>
  <rect x="${w - pad - 88 * sx}" y="${34 * sy}" width="${78 * sx}" height="${18 * sy}" rx="${9 * sy}" fill="rgba(15,23,42,0.5)"/>
  <text x="${w - pad - 49 * sx}" y="${47 * sy}" text-anchor="middle" font-size="${8 * sy}" font-weight="900" fill="#e2e8f0" letter-spacing="0.12em">VLUE ✓</text>
  <text x="${pad}" y="${nameY}" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${44 * sy}" font-weight="900" fill="${pal.text}">${esc(name)}</text>
  ${roleLine ? `<text x="${pad}" y="${nameY + 36 * sy}" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${16 * sy}" font-weight="700" fill="${pal.sub}">${esc(roleLine)}</text>` : ""}
  ${contactSvg}
  <g id="vlue-holo" transform="translate(${w - pad - 72 * sx},${36 * sy})">
    <rect class="vlue-holo-badge" width="${64 * sx}" height="${22 * sy}" rx="${11 * sy}" fill="rgba(15,23,42,0.55)"/>
    <rect class="vlue-holo-shine" x="${-20 * sx}" y="0" width="${28 * sx}" height="${22 * sy}" rx="${8 * sy}" fill="url(#${holoId})" opacity="0.85"/>
    <text x="${32 * sx}" y="${15 * sy}" text-anchor="middle" font-size="${8 * sy}" font-weight="900" fill="#fff" letter-spacing="0.1em">VLUE</text>
  </g>
  <text id="vlue-live-ts" x="${w - pad}" y="${h - 16 * sy}" text-anchor="end" font-family="ui-monospace,monospace" font-size="${8 * sy}" font-weight="700" fill="${pal.sub}">LIVE</text>
</g>`;
}

export function buildInvalidateCardLayerSvg(opts = {}) {
  const w = Math.max(360, Math.floor(opts.width || BIZCARD_CARD_W));
  const h = Math.max(200, Math.floor(opts.height || BIZCARD_CARD_H));
  const rx = 14 * Math.min(w / BIZCARD_CARD_W, h / BIZCARD_CARD_H);
  return `<g id="vlue-card-face">
  <rect width="${w}" height="${h}" rx="${rx}" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" stroke-dasharray="10 7"/>
  <text x="50%" y="42%" text-anchor="middle" font-size="${Math.round(h * 0.1)}" font-weight="900" fill="#6b7280">⚠️</text>
  <text x="50%" y="54%" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${Math.round(h * 0.048)}" font-weight="800" fill="#4b5563">유효기간이 만료되어</text>
  <text x="50%" y="66%" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${Math.round(h * 0.048)}" font-weight="800" fill="#4b5563">폐기된 명함입니다.</text>
  <text x="50%" y="78%" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="${Math.round(h * 0.04)}" font-weight="700" fill="#6b7280">(VLUE 실시간 검증 · 수정 불가)</text>
</g>`;
}

export function buildViralBannerSvg(createUrl, opts = {}) {
  const w = Math.floor(opts.width || BIZCARD_CANVAS_W);
  const h = Math.floor(opts.height || 112);
  const url = esc(createUrl || "https://www.vlue.kr/membership");
  return `<rect width="${w}" height="${h}" fill="#0f1419"/>
  <rect x="24" y="16" width="${w - 48}" height="${h - 32}" rx="14" fill="rgba(30,41,59,0.85)" stroke="rgba(56,189,248,0.25)" stroke-width="1"/>
  <text x="48" y="44" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="13" font-weight="800" fill="#e2e8f0">[VLUE 인증] 본 명함은 위조가 불가능한 유료 멤버십 보안 명함입니다.</text>
  <a href="${url}" target="_blank" rel="noopener noreferrer">
    <rect x="48" y="58" width="168" height="36" rx="10" fill="#2563eb"/>
    <text x="132" y="81" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="14" font-weight="900" fill="#ffffff">앱 다운로드</text>
  </a>`;
}

function buildGuardScript(cardId, apiBase) {
  const id = escJs(cardId);
  const base = escJs(String(apiBase || "").replace(/\/$/, ""));
  const wasteXml = escJs(
    buildInvalidateCardLayerSvg({ width: BIZCARD_CARD_W, height: BIZCARD_CARD_H })
  );
  return `(function(){
var CARD_ID='${id}';
var API_BASE='${base}';
var WASTE_XML='${wasteXml}';
var VALIDATE=API_BASE+'/api/v1/card/validate/'+encodeURIComponent(CARD_ID);
function pad(n){return (n<10?'0':'')+n;}
function tick(){
  var el=document.getElementById('vlue-live-ts');
  if(!el)return;
  var d=new Date();
  el.textContent='LIVE '+d.getFullYear()+'.'+pad(d.getMonth()+1)+'.'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
function holoTilt(e){
  var g=document.getElementById('vlue-holo');
  if(!g)return;
  var gamma=Number(e.gamma)||0,beta=Number(e.beta)||0;
  g.setAttribute('transform','translate('+(792+gamma*0.35)+','+(36+(beta-45)*0.15)+')');
}
function destroyCard(){
  var layer=document.getElementById('vlue-card-layer');
  if(layer) layer.remove();
  var stage=document.getElementById('vlue-stage');
  var banner=document.getElementById('vlue-viral-banner');
  if(!stage||document.getElementById('vlue-waste-layer'))return;
  var wrap=document.createElementNS('http://www.w3.org/2000/svg','g');
  wrap.setAttribute('id','vlue-waste-layer');
  wrap.setAttribute('transform','translate(0,48)');
  try{
    var parsed=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+WASTE_XML+'</svg>','image/svg+xml');
    var node=parsed.documentElement.firstElementChild;
    if(node) wrap.appendChild(document.importNode(node,true));
  }catch(e){}
  if(banner) stage.insertBefore(wrap,banner); else stage.appendChild(wrap);
}
function boot(){
  tick();
  setInterval(tick,1000);
  if(window.DeviceOrientationEvent){
    window.addEventListener('deviceorientation',holoTilt,true);
  }
  fetch(VALIDATE,{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.valid||d.expired||d.status==='expired') destroyCard();
  }).catch(function(){destroyCard();});
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}else{boot();}
})();`;
}

const SVG_STYLES = `
  .vlue-holo-shine { animation: vlue-holo-sweep 4.2s ease-in-out infinite; }
  @keyframes vlue-holo-sweep {
    0% { transform: translateX(-140%); opacity: 0.25; }
    45% { opacity: 1; }
    100% { transform: translateX(260%); opacity: 0.25; }
  }
  #vlue-viral-banner a { cursor: pointer; }
`;

/** 스크립트 내장형 동적 SVG 명함 (다운로드·호스팅·공유) */
export function buildDynamicBizcardSvgDocument({ card, cardId, apiBase, createUrl }) {
  const snap = cardToSvgSnapshot(card);
  const cardLayer = buildBizcardCardLayerSvg(snap, { width: BIZCARD_CARD_W, height: BIZCARD_CARD_H });
  const banner = buildViralBannerSvg(createUrl);
  const script = buildGuardScript(cardId, apiBase);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${BIZCARD_CANVAS_W}" height="${BIZCARD_CANVAS_H}" viewBox="0 0 ${BIZCARD_CANVAS_W} ${BIZCARD_CANVAS_H}">
  <title>VLUE 인증명함 — ${esc(snap.name)}</title>
  <style type="text/css"><![CDATA[${SVG_STYLES}]]></style>
  <rect width="100%" height="100%" fill="#16161c"/>
  <g id="vlue-stage">
    <g id="vlue-card-layer" transform="translate(0,${BIZCARD_CARD_Y})">
      ${cardLayer}
    </g>
    <g id="vlue-viral-banner" transform="translate(0,${BIZCARD_BANNER_Y})">
      ${banner}
    </g>
  </g>
  <script type="text/javascript"><![CDATA[${script}]]></script>
</svg>`;
}

/** OG·PNG 렌더 — 카드 면만 단일 SVG 문서 */
export function buildBizcardCardSvgDocument(data, opts = {}) {
  const w = Math.max(360, Math.floor(opts.width || BIZCARD_CARD_W));
  const h = Math.max(200, Math.floor(opts.height || BIZCARD_CARD_H));
  const inner = buildBizcardCardLayerSvg(data, {
    width: w,
    height: h,
    invalidated: Boolean(opts.invalidated)
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${inner}
</svg>`;
}

/** @deprecated — buildBizcardCardSvgDocument 사용 */
export function buildClassicBizcardSvg(data, opts) {
  return buildBizcardCardSvgDocument(data, opts);
}
