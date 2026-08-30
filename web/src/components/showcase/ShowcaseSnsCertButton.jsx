import VlueCyanVerifiedSeal from "../VlueCyanVerifiedSeal.jsx";

/**
 * SNS 인증 마크 — DCC 상호 옆 · 쇼케이스 하단 프로필바 등 인라인 배치용
 */
export default function ShowcaseSnsCertButton({
  onClick,
  className = "",
  size = 18,
  ...rest
}) {
  return (
    <button
      type="button"
      className={`showcase-sns-cert-mark showcase-sns-cert-mark--inline ${className}`.trim()}
      aria-label="SNS 인증 내역"
      title="SNS 인증"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      {...rest}
    >
      <VlueCyanVerifiedSeal size={size} />
    </button>
  );
}
