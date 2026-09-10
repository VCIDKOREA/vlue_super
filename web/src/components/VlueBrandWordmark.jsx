import { VLUE_BRAND_WORDMARK } from "../lib/vlueBrandWordmark.js";
import "./vlue-brand-wordmark.css";

/**
 * 상단/네비 브랜드 표기 — 웹과 동일한 유니코드 텍스트 "VLUÉ" 그대로 사용.
 * (악센트를 CSS로 그리지 않음)
 */
export default function VlueBrandWordmark({
  className = "",
  style,
  as: Tag = "span",
  ...rest
}) {
  return (
    <Tag className={`vlue-brand-wordmark ${className}`.trim()} style={style} {...rest}>
      {VLUE_BRAND_WORDMARK}
    </Tag>
  );
}
