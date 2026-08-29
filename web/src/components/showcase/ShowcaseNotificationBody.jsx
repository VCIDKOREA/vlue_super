import { useMemo } from "react";
import { COMMENT_CASE_USER_EVENT } from "../../lib/showcase/commentRichText.js";

/** 알림 본문 — 선두 @아이디를 케이스함 링크로 렌더 */
export function splitShowcaseNotificationActor(body, actorHandle, actorName) {
  const text = String(body || "");
  let h = String(actorHandle || "").replace(/^@+/, "").trim();
  const name = String(actorName || "").trim();
  if (!h) {
    const fromBody = text.match(/^@([^\s@]+?)님이/);
    if (fromBody) h = fromBody[1];
  }
  if (!h) return null;
  if (text.startsWith(`@${h}님이`)) {
    return { handle: h, tail: text.slice(`@${h}`.length) };
  }
  if (text.startsWith(`${h}님이`)) {
    return { handle: h, tail: text.slice(`${h}`.length) };
  }
  if (name && text.startsWith(`${name}님이`)) {
    return { handle: h, tail: text.slice(`${name}`.length) };
  }
  if (text.startsWith(`@${h}`)) {
    return { handle: h, tail: text.slice(`@${h}`.length) };
  }
  return { handle: h, tail: text };
}

function openActorShowcase({ userId, handle, name, onNavigate }) {
  const detail = {
    userId: String(userId || "").trim() || undefined,
    handle: String(handle || "").replace(/^@+/, "").trim(),
    name: String(name || "").trim()
  };
  if (typeof onNavigate === "function") {
    onNavigate(detail);
  }
  if (!detail.userId && detail.handle) {
    window.dispatchEvent(new CustomEvent("vlue-open-member-by-handle", { detail: { handle: detail.handle } }));
    return;
  }
  window.dispatchEvent(new CustomEvent(COMMENT_CASE_USER_EVENT, { detail }));
}

export default function ShowcaseNotificationBody({
  body,
  actorUserId = "",
  actorHandle = "",
  actorName = "",
  className = "",
  inline = false,
  onNavigate
}) {
  const split = useMemo(
    () => splitShowcaseNotificationActor(body, actorHandle, actorName),
    [body, actorHandle, actorName]
  );

  const Tag = inline ? "span" : "p";

  if (!split?.handle) {
    return (
      <Tag className={className}>
        {body || "내용이 없습니다."}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <button
        type="button"
        className="font-bold text-primary-600 underline underline-offset-2 hover:text-primary-700"
        onClick={(e) => {
          e.stopPropagation();
          openActorShowcase({
            userId: actorUserId,
            handle: split.handle,
            name: actorName || split.handle,
            onNavigate
          });
        }}
      >
        @{split.handle}
      </button>
      <span>{split.tail}</span>
    </Tag>
  );
}
