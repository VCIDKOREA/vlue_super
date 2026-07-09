import { getShowcasePermissions } from "./showcaseStylePermissions.js";
import { readShowcaseStyle } from "./showcaseStyleStorage.js";

/** 통화 송출·미리보기용 카드 + 스타일 설정 병합 */
export function applyShowcaseStyleToCard(card, membershipTier = "free") {
  const style = readShowcaseStyle();
  const perms = getShowcasePermissions(membershipTier);
  const merged = { ...card, showcaseStyle: style };

  if (!perms.showNameOrg) {
    return {
      ...merged,
      name: "",
      organization: "",
      title: "",
      department: "",
      displayName: merged.phone || merged.displayName
    };
  }
  return merged;
}
