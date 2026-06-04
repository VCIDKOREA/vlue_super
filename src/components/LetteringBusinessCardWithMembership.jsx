import { useMemo } from "react";
import { useB2bMembership } from "../context/B2bMembershipContext.jsx";
import LetteringBusinessCardPanel from "./LetteringBusinessCardPanel.jsx";

/**
 * 로그인 사용자 기업 귀속 시 membership-ui-context 기반 CI/BI 오버라이드 렌더
 */
export default function LetteringBusinessCardWithMembership({ card, securityOverlay = null }) {
  const { resolveDisplayCard, overrideByCompany, personalDataPreserved } = useB2bMembership();
  const resolved = useMemo(() => resolveDisplayCard(card), [card, resolveDisplayCard]);

  return (
    <div>
      <LetteringBusinessCardPanel
        card={card}
        displayCard={resolved.card}
        corporateOverride={resolved.corporateOverride}
        securityOverlay={securityOverlay}
      />
      {overrideByCompany && personalDataPreserved ? (
        <p className="lettering-bizcard-preserved-note" role="note">
          * 개인 명함·템플릿·활동 기록은 서버에 그대로 보관됩니다. 소속 기업 CI/BI가 이 계정의
          모든 명함 화면에 적용됩니다.
        </p>
      ) : null}
    </div>
  );
}
