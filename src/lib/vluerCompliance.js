/** B2B·귀속 직원 VLUER 메뉴 차단 안내 */
export const VLUER_COMPLIANCE_BLOCK_MESSAGE =
  "소속 기업의 사내 규정(겸업 금지) 보호를 위해 기업 비즈니스 계정은 VLUER 추천 활동 및 정산 기능을 이용할 수 없습니다.";

export function isVluerFeatureLocked(membershipCtx, vluerMe) {
  if (membershipCtx?.override_by_company || membershipCtx?.corporate_active) {
    return true;
  }
  if (vluerMe?.b2bSettlementExcluded) return true;
  if (vluerMe?.canActAsVluer === false && vluerMe?.isEligibleForVluerSettlement === false) {
    return true;
  }
  return false;
}
