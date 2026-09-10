import "./vlue-brand-wordmark.css";

/**
 * VLUÉ 워드마크 — 유니코드 É가 폰트·자간에서 깨져 보이므로
 * E + 악센트를 분리 배치해 가독성·정렬을 맞춤.
 */
export default function VlueBrandWordmark({
  className = "",
  style,
  as: Tag = "span",
  ...rest
}) {
  return (
    <Tag
      className={`vlue-brand-wordmark ${className}`.trim()}
      style={style}
      aria-label="VLUÉ"
      {...rest}
    >
      <span className="vlue-brand-wordmark__base" aria-hidden>
        VLU
        <span className="vlue-brand-wordmark__e">
          E
          <span className="vlue-brand-wordmark__accent" />
        </span>
      </span>
    </Tag>
  );
}
