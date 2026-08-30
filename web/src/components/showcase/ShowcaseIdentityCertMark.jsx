import VlueCyanVerifiedSeal from "../VlueCyanVerifiedSeal.jsx";
import ShowcaseSnsCertButton from "./ShowcaseSnsCertButton.jsx";

/**
 * 쇼케이스·DCC 인라인 인증 마크
 * - SNS 인증(Instagram/Kakao) 있으면 탭 가능한 SNS 마크
 * - 없으면 VLUE 인증 실(seal)
 */
export default function ShowcaseIdentityCertMark({
  showSnsCert = false,
  onOpenSnsCert,
  verified = false,
  size = 16,
  className = ""
}) {
  if (showSnsCert) {
    return <ShowcaseSnsCertButton onClick={onOpenSnsCert} size={size} className={className} />;
  }
  if (!verified) return null;
  return (
    <span
      className={`showcase-identity-cert-seal inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      title="VLUE 인증"
      aria-label="VLUE 인증됨"
    >
      <VlueCyanVerifiedSeal size={size} />
    </span>
  );
}
