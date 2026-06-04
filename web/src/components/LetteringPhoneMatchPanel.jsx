/** 펼침 — 번호 일치(인증 등록번호)일 때만 표시 */
export default function LetteringPhoneMatchPanel({ match }) {
  if (!match || match.status !== "match") return null;

  return (
    <p className="lettering-phone-match-result lettering-phone-match-result--match" aria-live="polite">
      <span className="lettering-phone-match-result__dot" aria-hidden />
      {match.summary}
    </p>
  );
}
