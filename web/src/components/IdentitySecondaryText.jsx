import { Fragment } from "react";
import { splitIdentityPipeParts } from "../lib/letteringPaidIdentityDisplay.js";

/**
 * 빅푸시·Mini·DCC 2줄 — `이름 | …` 중간 바만 DCC 시안(#00d2ff)
 */
export default function IdentitySecondaryText({ text, className, as: Tag = "span" }) {
  const split = splitIdentityPipeParts(text);
  if (!split) return null;
  if (!split.parts) {
    return <Tag className={className}>{split.plain}</Tag>;
  }
  return (
    <Tag className={className}>
      {split.parts.map((part, i) => (
        <Fragment key={`${i}-${part}`}>
          {i > 0 ? (
            <span className="lettering-identity-sep" aria-hidden="true">
              {" | "}
            </span>
          ) : null}
          {part}
        </Fragment>
      ))}
    </Tag>
  );
}
