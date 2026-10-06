/**
 * Meta 검수용 정적 약관 HTML 생성 (해시 SPA와 별개 — 크롤러가 JS 없이 본문 확인)
 * 실행: node web/scripts/generate-legal-static.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVACY_POLICY_ARTICLES, PRIVACY_POLICY_VERSION } from "../src/legal/vluePrivacyPolicy.js";
import { TERMS_ARTICLES, TERMS_VERSION } from "../src/legal/vlueTermsArticles.js";
import { REFUND_POLICY_ARTICLES, REFUND_POLICY_VERSION } from "../src/legal/vlueRefundPolicy.js";

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

for (const name of ["privacy", "terms", "data-deletion", "refund", "account-deletion"]) {
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

const accountDeletionExtra = `<section id="account-deletion">
<h2>계정 및 관련 데이터 삭제 요청 (VLUÉ · VLUÉ Kids)</h2>
<p>주식회사 VCID KOREA가 운영하는 <strong>VLUÉ</strong> 및 <strong>VLUÉ Kids</strong> 앱에서 계정과 관련 데이터를 삭제하는 방법입니다. 이 안내는 Google Play 스토어 등록용으로도 제공됩니다.</p>
<h2>앱에서 삭제하는 방법</h2>
<ol>
<li>VLUÉ 또는 VLUÉ Kids 앱에 로그인합니다.</li>
<li>설정(또는 프로필)에서 <strong>회원 탈퇴</strong>를 선택합니다.</li>
<li>본인 확인을 완료합니다.
<ul>
<li>VLUÉ(보호자 앱): PASS 본인인증, 등록 이메일 인증, 또는 탈퇴 신청(24시간 유예).</li>
<li>VLUÉ Kids: 자녀 계정에서 회원 탈퇴. 보호자 앱에서 가족 연결을 해지할 수도 있습니다.</li>
</ul>
</li>
<li>탈퇴가 완료되면 계정과 관련 개인정보가 삭제됩니다.</li>
</ol>
<h2>웹·이메일로 요청하는 방법</h2>
<p>앱에서 탈퇴가 어려운 경우 <a href="mailto:support@vlue.kr">support@vlue.kr</a> 로 아래 내용을 보내 주세요.</p>
<ul>
<li>앱 이름: VLUÉ 또는 VLUÉ Kids</li>
<li>로그인 ID(또는 닉네임)</li>
<li>등록 휴대폰 번호(있는 경우)</li>
<li>제목: 계정 삭제 요청</li>
</ul>
<p>요청 확인 후 합리적 기간 내 처리합니다. Kids 계정은 법정대리인(보호자) 확인이 필요할 수 있습니다.</p>
<h2>삭제·보관되는 데이터</h2>
<p><strong>삭제:</strong> 계정 프로필·로그인 정보·표시 이름, 위치 공유·가족 보호 연결, 쇼케이스·채팅 등 서비스 이용 데이터(운영 최소 범위 제외).</p>
<p><strong>법령상 보관 가능:</strong> 전자상거래법 등 계약·결제·분쟁 기록(해당 시 최대 5년 등), 부정 가입 방지용 CI·휴대폰 일방향 해시(식별 가능 개인정보 제외).</p>
<p>탈퇴 신청(수동)은 24시간 유예 후 완료되며, 유예 기간 안에는 복구할 수 있습니다. 자세한 내용은 <a href="https://www.vlue.kr/privacy">개인정보처리방침</a>을 참고하세요.</p>
</section>`;

writeFileSync(
  join(publicDir, "account-deletion", "index.html"),
  page({
    title: "계정 및 데이터 삭제 요청",
    version: PRIVACY_POLICY_VERSION,
    articles: [],
    extra: accountDeletionExtra
  })
);

writeFileSync(
  join(publicDir, "refund", "index.html"),
  page({
    title: "환불·청약철회 규정",
    version: REFUND_POLICY_VERSION,
    articles: REFUND_POLICY_ARTICLES
  })
);

console.log("[legal-static] wrote privacy/, terms/, data-deletion/, account-deletion/, refund/");
