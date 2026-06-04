import { cloneElement, isValidElement } from "react";
import { letteringBizcardThemeClass, normalizeLetteringBizcardTemplate } from "../lib/letteringBizcardTemplates.js";

/** 명함 + 테마 클래스 — 보안 레이어는 각 면에만 렌더 */
export default function LetteringBizcardSecureFrame({
  children,
  designTemplate,
  card,
  cardId = "",
  className = ""
}) {
  const themeClass = letteringBizcardThemeClass(designTemplate);
  const tpl = normalizeLetteringBizcardTemplate(designTemplate);
  const securityOverlay = {
    card,
    cardId,
    issuedAt: card?.issuedAt || card?.issued_at || null
  };

  const enhanced =
    isValidElement(children) && typeof children.type !== "string"
      ? cloneElement(children, { securityOverlay })
      : children;

  return (
    <div className={`lettering-bizcard-secure-frame ${themeClass} ${className}`.trim()} data-design-template={tpl}>
      {enhanced}
    </div>
  );
}
