import {
  dispatchCommentHashtag,
  dispatchCommentMention,
  normalizeCommentHashtag,
  normalizeCommentMention
} from "../showcase/commentRichText.js";

/** http(s) · www. · #태그 · @아이디 */
const INTRO_TOKEN_RE = /(https?:\/\/[^\s]+|www\.[^\s]+|[#＠@][^\s#@＠]+)/gu;

/**
 * @returns {Array<{ type: 'text'|'url'|'hashtag'|'mention', value: string, raw: string, href?: string }>}
 */
export function parseIntroRichText(raw) {
  const text = String(raw || "");
  if (!text) return [];
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(INTRO_TOKEN_RE.source, INTRO_TOKEN_RE.flags);
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index), raw: text.slice(last, m.index) });
    }
    const token = m[1];
    const mark = token[0];
    if (/^https?:\/\//i.test(token)) {
      parts.push({ type: "url", value: token, raw: token, href: token });
    } else if (/^www\./i.test(token)) {
      parts.push({ type: "url", value: token, raw: token, href: `https://${token}` });
    } else if (mark === "#") {
      const body = token.slice(1);
      if (body) parts.push({ type: "hashtag", value: body, raw: token });
      else parts.push({ type: "text", value: token, raw: token });
    } else if (mark === "@" || mark === "＠") {
      const body = token.slice(1).replace(/^@+/, "");
      if (body) parts.push({ type: "mention", value: body, raw: token });
      else parts.push({ type: "text", value: token, raw: token });
    } else {
      parts.push({ type: "text", value: token, raw: token });
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last), raw: text.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: text, raw: text }];
}

export const INTRO_PREVIEW_LINES = 4;

export function splitIntroLines(text) {
  return String(text || "").split("\n");
}

export function introNeedsMoreLines(text, maxLines = INTRO_PREVIEW_LINES) {
  return splitIntroLines(text).length > maxLines;
}

export function clipIntroLines(text, maxLines = INTRO_PREVIEW_LINES) {
  return splitIntroLines(text).slice(0, maxLines).join("\n");
}

export function openIntroHashtag(tag) {
  const bare = normalizeCommentHashtag(tag);
  if (bare) dispatchCommentHashtag(bare);
}

export function openIntroMention(handle) {
  const bare = normalizeCommentMention(handle);
  if (bare) dispatchCommentMention(bare);
}
