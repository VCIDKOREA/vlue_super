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
};

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

  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;">
  <tr>
    ${logoCell}
    <td style="vertical-align:top;">
      ${nameLine ? `<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111;">${esc(nameLine)}</p>` : ""}
      ${metaLines.map((line) => `<p style="margin:0 0 2px 0;font-size:13px;line-height:1.5;color:#555;">${esc(line)}</p>`).join("")}
    </td>
  </tr>
</table>`;
}

/**
 * [시작 인사말 + 채팅 본문 + 끝 인사말 + 디지털 명함 서명] HTML 조립.
 * Outlook/Gmail 호환을 위해 인라인 스타일 table 구조 사용.
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
    </td></tr>
  </table>
</body>
</html>`;

  const text = [greeting, "", chatBody, "", closing].filter((s, i, arr) => s || i < arr.length).join("\n");

  return { html, text };
}
