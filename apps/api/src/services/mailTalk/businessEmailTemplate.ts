export type MailTalkTemplateInput = {
  greetingText?: string | null;
  closingText?: string | null;
  signatureHtml?: string | null;
  logoUrl?: string | null;
  displayName?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  /** 디지털 명함 검증·바이럴 CTA용 */
  cardId?: string | null;
  shopUrl?: string | null;
  verified?: boolean;
};

const VLUE_HOME = "https://www.vlue.kr";
const VLUE_SIGNUP = "https://www.vlue.kr/membership";

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text: string): string {
  const lines = String(text || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.map((line) => `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#222;">${esc(line)}</p>`).join("");
}

function buildViralGrowthFooter(t: MailTalkTemplateInput): string {
  const verifyUrl = t.cardId
    ? `${VLUE_HOME}/card/${encodeURIComponent(t.cardId)}?ref=mailtalk-signature`
    : `${VLUE_HOME}/membership?ref=mailtalk-signature`;
  const shopUrl = String(t.shopUrl || t.website || `${VLUE_HOME}/store`).trim();
  const verifiedBadge = t.verified !== false;

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="margin-top:20px;border-top:2px solid #e8ecf1;padding-top:16px;font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;">
  <tr>
    <td style="padding:0 0 12px 0;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          ${
            verifiedBadge
              ? `<td style="padding:0 8px 0 0;vertical-align:middle;">
                   <span style="display:inline-block;padding:4px 10px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:999px;font-size:12px;font-weight:700;color:#047857;">✓ 신원인증</span>
                 </td>`
              : ""
          }
          <td style="vertical-align:middle;font-size:12px;color:#64748b;">VLUE 디지털 인증명함 · Powered by VLUE</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="padding:0 8px 8px 0;">
            <a href="${esc(shopUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;">공식 상점/자사몰 이동 ↗</a>
          </td>
          <td style="padding:0 0 8px 0;">
            <a href="${esc(verifyUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;background:#f1f5f9;color:#1e293b;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;border:1px solid #cbd5e1;">디지털 명함 검증 🔍</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:4px;">
      <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
        이 메일은 <a href="${VLUE_HOME}" style="color:#2563eb;text-decoration:none;font-weight:600;">VLUE</a> 비즈니스 커뮤니케이션 플랫폼에서 발송되었습니다.
        무료로 가입하고 디지털 명함·메일톡을 시작해 보세요 →
        <a href="${VLUE_SIGNUP}" style="color:#2563eb;text-decoration:none;font-weight:700;">회원가입</a>
      </p>
    </td>
  </tr>
</table>`;
}

function buildDefaultSignatureTable(t: MailTalkTemplateInput): string {
  const logoCell = t.logoUrl
    ? `<td style="padding:0 16px 0 0;vertical-align:top;width:72px;">
         <img src="${esc(t.logoUrl)}" alt="logo" width="64" height="64" style="display:block;border:0;border-radius:8px;max-width:64px;max-height:64px;" />
       </td>`
    : "";

  const nameLine = [t.displayName, t.jobTitle].filter(Boolean).join(" · ");
  const metaLines = [t.companyName, t.phone, t.email, t.website].filter(
    (x): x is string => Boolean(x)
  );

  const identityRow = t.verified !== false
    ? `<p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#059669;">✓ VLUE 신원인증 마크</p>`
    : "";

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;">
  <tr>
    ${logoCell}
    <td style="vertical-align:top;">
      ${identityRow}
      ${nameLine ? `<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111;">${esc(nameLine)}</p>` : ""}
      ${metaLines.map((line) => `<p style="margin:0 0 2px 0;font-size:13px;line-height:1.5;color:#555;">${esc(line)}</p>`).join("")}
    </td>
  </tr>
</table>`;
}

/**
 * 디지털 인증명함 + 바이럴 CTA가 강제 포함된 발신 HTML.
 * Outlook/Gmail 호환 인라인 table 구조.
 */
export function buildBusinessEmailHtml(input: {
  chatBody: string;
  subject?: string;
  template: MailTalkTemplateInput;
}): { html: string; text: string } {
  const greeting = String(input.template.greetingText || "안녕하세요.").trim();
  const closing = String(input.template.closingText || "감사합니다.").trim();
  const chatBody = String(input.chatBody || "").trim();

  const signatureBlock =
    String(input.template.signatureHtml || "").trim() || buildDefaultSignatureTable(input.template);

  const viralFooter = buildViralGrowthFooter(input.template);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation" style="max-width:640px;margin:0 auto;font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;">
    <tr><td style="padding:24px 20px;">
      ${textToHtmlParagraphs(greeting)}
      <div style="margin:16px 0;padding:12px 14px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:4px;">
        ${textToHtmlParagraphs(chatBody)}
      </div>
      ${textToHtmlParagraphs(closing)}
      ${signatureBlock}
      ${viralFooter}
    </td></tr>
  </table>
</body>
</html>`;

  const text = [greeting, "", chatBody, "", closing, "", "— VLUE 디지털 인증명함", VLUE_HOME].join("\n");

  return { html, text };
}
