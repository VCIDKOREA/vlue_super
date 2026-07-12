import { readDigitalCardActive } from "../bizcardAccountSync.js";
import { readLetteringFixedIdentity } from "../letteringBizcardStorage.js";
import { scrubLetteringDemoPollution } from "../letteringDemoPollution.js";
import { readShowcaseStyle } from "./showcaseStyleStorage.js";

/** 통화 송출·미리보기용 카드 + 스타일 설정 병합 */
export function applyShowcaseStyleToCard(card, membershipTier = "free", opts = {}) {
  const style = readShowcaseStyle();
  const merged = scrubLetteringDemoPollution({ ...card, showcaseStyle: style, membershipTier });
  const digitalActive = opts.digitalCardActive ?? readDigitalCardActive();

  if (digitalActive) {
    const fixed = readLetteringFixedIdentity();
    return scrubLetteringDemoPollution({
      ...merged,
      hideBroadcastName: false,
      name: String(merged.name || fixed.name || "").trim(),
      organization: String(merged.organization || fixed.organization || "").trim(),
      phone: String(merged.phone || fixed.phone || "").trim()
    });
  }

  /* 디지털인증명함 미사용 — VLUE 이름/상호 송출 OFF. 상대 전화부 저장 이름은 수신측에서 별도 표시 */
  if (style.showBroadcastName === false) {
    return {
      ...merged,
      hideBroadcastName: true,
      name: "",
      organization: "",
      title: "",
      department: "",
      displayName: ""
    };
  }

  return { ...merged, hideBroadcastName: false };
}
