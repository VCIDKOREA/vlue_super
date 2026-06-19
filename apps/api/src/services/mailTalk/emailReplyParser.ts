/**
 * 답장 메일에서 '이번에 새로 작성된 최신 본문'만 추출.
 * Outlook / Gmail / Apple Mail / 한국어 클라이언트 패턴 지원.
 */

const QUOTE_MARKERS: RegExp[] = [
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^-{2,}\s*원본\s*메시지\s*-{2,}/im,
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
  /^-{2,}\s*전달된\s*메시지\s*-{2,}/im,
  /^On .+ wrote:$/im,
  /^On .+, .+ <.+@.+> wrote:$/im,
  /^\d{4}년?\s*\d{1,2}월?\s*\d{1,2}일?\s*.+님이\s*작성:/im,
  /^보낸\s*사람\s*:/im,
  /^From\s*:/im,
  /^-----Original/i,
  /^_{5,}/m,
  /^>{1,}\s/,
  /^Sent from my (iPhone|iPad|Galaxy|Android)/im,
  /^Sent from Mail for Windows/im,
  /^________________________________$/m
];

const HEADER_BLOCK_START = /^(From|To|Cc|Bcc|Subject|Date|Sent|보낸\s*사람|받는\s*사람|참조|제목|날짜)\s*:/im;

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r\n/g, "\n");
}

function findEarliestQuoteIndex(text: string): number {
  let earliest = text.length;

  for (const re of QUOTE_MARKERS) {
    const reGlobal = new RegExp(re.source, re.flags.includes("m") ? re.flags : `${re.flags}m`);
    const m = reGlobal.exec(text);
    if (m && m.index < earliest) earliest = m.index;
  }

  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (HEADER_BLOCK_START.test(line.trim()) && i + 1 < lines.length) {
      const next = lines[i + 1]?.trim() || "";
      if (HEADER_BLOCK_START.test(next) || /^.+@.+\..+$/.test(next)) {
        if (offset < earliest) earliest = offset;
        break;
      }
    }
    offset += line.length + 1;
  }

  return earliest;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * plain text 또는 HTML 본문에서 최신 작성분만 반환.
 */
export function extractLatestReplyBody(input: {
  text?: string | null;
  html?: string | null;
}): string {
  const rawText = String(input.text || "").trim();
  const rawHtml = String(input.html || "").trim();

  const source = rawText || (rawHtml ? stripHtml(rawHtml) : "");
  if (!source) return "";

  const cutAt = findEarliestQuoteIndex(source);
  const latest = source.slice(0, cutAt);
  return normalizeWhitespace(latest);
}
