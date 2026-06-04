import { escapeHtml } from "./bizcardHtmlUtil.js";
import { cardViewUrl, getVlueCreateUrl } from "./bizcardPublicUrls.js";

/** QR 스캔 — 만료 시 경고, 유효 시 라이브 뷰어 안내 */
export function buildBizcardVerifyPageHtml(opts: {
  cardId: string;
  apiBase: string;
  valid: boolean;
  message: string;
}) {
  const origin = opts.apiBase.replace(/\/$/, "");
  const viewUrl = cardViewUrl(origin, opts.cardId);
  const createUrl = getVlueCreateUrl();

  if (opts.valid) {
    return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="0;url=${escapeHtml(viewUrl)}"/>
<title>VLUE 진본 확인</title>
</head><body style="margin:0;background:#16161c;color:#e2e8f0;font-family:Pretendard,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<p>라이브 홀로그램 뷰어로 이동합니다… <a href="${escapeHtml(viewUrl)}" style="color:#7dd3fc">바로가기</a></p>
</body></html>`;
  }

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>무효화된 명함</title>
<style>
body{margin:0;background:#16161c;color:#e2e8f0;font-family:Pretendard,Apple SD Gothic Neo,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:24px;box-sizing:border-box}
.card{width:min(100%,360px);aspect-ratio:90/50;background:#e5e7eb;border-radius:16px;border:2px dashed #9ca3af;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px;color:#4b5563}
h1{font-size:1.1rem;margin:16px 0 8px}
p{font-size:0.9rem;color:#94a3b8;text-align:center;line-height:1.5}
a.btn{display:inline-block;margin-top:20px;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:12px;font-weight:800}
.viral{margin-top:auto;padding-top:32px;font-size:0.75rem;color:#64748b;text-align:center}
</style></head><body>
<div class="card">
  <span style="font-size:2rem">⚠️</span>
  <strong>유효기간이 만료되어<br/>폐기된 명함입니다.</strong>
</div>
<h1>진본 검증 실패</h1>
<p>${escapeHtml(opts.message || "이 명함은 더 이상 유효하지 않습니다.")}</p>
<a class="btn" href="${escapeHtml(createUrl)}">나도 5초 만에 명함 만들기</a>
<p class="viral">[VLUE 인증] 위조 방지 유료 멤버십 보안 명함</p>
</body></html>`;
}
