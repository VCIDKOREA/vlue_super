import { extractLatestReplyBody } from "../services/mailTalk/emailReplyParser.js";
import { buildBusinessEmailHtml } from "../services/mailTalk/businessEmailTemplate.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const replySample = `안녕하세요, 견적서 보내드립니다.
확인 부탁드립니다.

---- Original Message ----
From: client@gmail.com
Sent: Monday, June 2, 2025
Subject: Re: 견적

이전 내용입니다.`;

const latest = extractLatestReplyBody({ text: replySample });
assert(latest.includes("견적서"), "should keep latest body");
assert(!latest.includes("Original Message"), "should strip quoted thread");
assert(!latest.includes("이전 내용"), "should strip old content");

const gmailSample = `네 알겠습니다. 내일 방문하겠습니다.

On Tue, Jun 2, 2026 at 10:00 AM Kim <kim@vlue.kr> wrote:
> 안내드립니다.`;

const gmailLatest = extractLatestReplyBody({ text: gmailSample });
assert(gmailLatest.includes("내일 방문"), "gmail On-wrote pattern");
assert(!gmailLatest.includes("안내드립니다"), "gmail quote removed");

const html = buildBusinessEmailHtml({
  chatBody: "견적 확인 부탁드립니다.",
  subject: "견적 회신",
  template: {
    greetingText: "안녕하세요.",
    closingText: "감사합니다.",
    displayName: "홍길동",
    jobTitle: "대리",
    companyName: "VCID KOREA",
    email: "hong@vlue.kr"
  }
});

assert(html.html.includes("<table"), "signature uses table layout");
assert(html.html.includes("견적 확인"), "chat body embedded");
assert(html.text.includes("안녕하세요"), "plain text fallback");

console.log("[mail-talk] emailReplyParser + businessEmailTemplate OK");
