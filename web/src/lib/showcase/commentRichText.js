/**
 * 댓글 본문 — #해시태그 · @멘션 토큰 분리 (인스타/유튜브형)
 */

const TOKEN_RE = /([#＠@][^\s#@＠]+)/gu;

/**
 * @param {string} raw
 * @returns {Array<{ type: 'text'|'hashtag'|'mention', value: string, raw: string }>}
 */
export function parseCommentRichText(raw) {
  const text = String(raw || "");
  if (!text) return [];
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index), raw: text.slice(last, m.index) });
    }
    const token = m[1];
    const mark = token[0];
    const body = token.slice(1);
    if (mark === "#" && body) {
      parts.push({ type: "hashtag", value: body, raw: token });
    } else if ((mark === "@" || mark === "＠") && body) {
      parts.push({ type: "mention", value: body.replace(/^@+/, ""), raw: token });
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

export function normalizeCommentHashtag(tag) {
  return String(tag || "")
    .replace(/^#+/, "")
    .trim()
    .normalize("NFC")
    .toLowerCase()
    .slice(0, 120);
}

export function normalizeCommentMention(handle) {
  return String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .replace(/^@+/, "")
    .slice(0, 64);
}

/** @param {Array<{ parentId?: string|null }>} comments */
export function groupCommentsWithReplies(comments) {
  const list = Array.isArray(comments) ? comments : [];
  const roots = [];
  const byParent = new Map();
  for (const c of list) {
    const pid = c.parentId ? String(c.parentId) : "";
    if (!pid) {
      roots.push({ ...c, replies: [] });
    } else {
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(c);
    }
  }
  for (const root of roots) {
    const kids = byParent.get(root.id) || [];
    root.replies = kids.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  /* orphan replies (부모 삭제 등) — 루트로 노출 */
  const rootIds = new Set(roots.map((r) => r.id));
  for (const [pid, kids] of byParent) {
    if (rootIds.has(pid)) continue;
    for (const k of kids) roots.push({ ...k, replies: [] });
  }
  return roots;
}

export const COMMENT_HASHTAG_EVENT = "vlue-open-hashtag-search";
export const COMMENT_MENTION_EVENT = "vlue-open-member-by-handle";

export function dispatchCommentHashtag(tag) {
  const bare = normalizeCommentHashtag(tag);
  if (!bare || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_HASHTAG_EVENT, { detail: { tag: bare } }));
}

export function dispatchCommentMention(handle) {
  const bare = normalizeCommentMention(handle);
  if (!bare || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MENTION_EVENT, { detail: { handle: bare } }));
}
