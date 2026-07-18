/**
 * Meta 검수용 정적 약관 HTML 생성 (해시 SPA와 별개 — 크롤러가 JS 없이 본문 확인)
 * 실행: node web/scripts/generate-legal-static.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVACY_POLICY_ARTICLES, PRIVACY_POLICY_VERSION } from "../src/legal/vluePrivacyPolicy.js";
import { TERMS_ARTICLES, TERMS_VERSION } from "../src/legal/vlueTermsArticles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function page({ title, version, articles, extra = "" }) {
  const body = articles
    .map((a) => {
      const paras = (a.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("\n");
      const danger = (a.dangerBlocks || [])
        .map((p) => `<p class="danger">${esc(p)}</p>`)
        .join("\n");
      return `<section id="article-${a.id}"><h2>${esc(a.title)}</h2>\n${paras}\n${danger}</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} | VLUE</title>
<meta name="description" content="VLUE ${esc(title)}" />
<style>
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;color:#0f172a;background:#fff;margin:0;padding:24px}
main{max-width:780px;margin:0 auto}
h1{font-size:1.6rem;margin:0 0 8px}
.meta{color:#64748b;font-size:.9rem;margin-bottom:28px}
h2{font-size:1.1rem;margin:28px 0 10px}
p,li{margin:0 0 10px}
ol{padding-left:1.25rem}
.danger{color:#9f1239;font-weight:600}
a{color:#2563eb}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:.85rem}
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="meta">버전 ${esc(version)} · VCID KOREA / VLUE</p>
${extra}
${body}
<footer>
<p>문의: <a href="mailto:support@vlue.kr">support@vlue.kr</a></p>
<p><a href="https://www.vlue.kr/">www.vlue.kr</a></p>
</footer>
</main>
</body>
</html>
`;
}

for (const name of ["privacy", "terms", "data-deletion"]) {
  mkdirSync(join(publicDir, name), { recursive: true });
}

writeFileSync(
  join(publicDir, "privacy", "index.html"),
  page({
    title: "개인정보처리방침",
    version: PRIVACY_POLICY_VERSION,
    articles: PRIVACY_POLICY_ARTICLES
  })
);

writeFileSync(
  join(publicDir, "terms", "index.html"),
  page({
    title: "서비스 이용약관",
    version: TERMS_VERSION,
    articles: TERMS_ARTICLES
  })
);

const deletionExtra = `<section id="deletion">
<h2>사용자 데이터 삭제 안내</h2>
<p>Instagram·Meta 등 외부 로그인 연동을 통해 VLUE에 제공된 개인정보는 아래 방법으로 삭제 요청할 수 있습니다.</p>
<ol>
<li>VLUE 앱 또는 웹에서 회원 탈퇴를 진행합니다.</li>
<li>또는 고객지원 이메일(<a href="mailto:support@vlue.kr">support@vlue.kr</a>)로 데이터 삭제를 요청합니다.</li>
<li>요청 확인 후 지체 없이 파기하며, 관계 법령상 보관이 필요한 항목만 법정 기간 동안 분리 보관합니다.</li>
</ol>
<p>관련 조항은 아래 개인정보처리방침 제4조·제6조를 따릅니다.</p>
</section>`;

writeFileSync(
  join(publicDir, "data-deletion", "index.html"),
  page({
    title: "사용자 데이터 삭제 안내",
    version: PRIVACY_POLICY_VERSION,
    articles: PRIVACY_POLICY_ARTICLES.filter((a) => a.id === 4 || a.id === 6),
    extra: deletionExtra
  })
);

console.log("[legal-static] wrote privacy/, terms/, data-deletion/");
