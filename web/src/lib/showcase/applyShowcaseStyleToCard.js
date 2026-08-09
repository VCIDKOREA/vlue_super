import { readDigitalCardActive } from "../bizcardAccountSync.js";
import { readLetteringFixedIdentity } from "../letteringBizcardStorage.js";
import { scrubLetteringDemoPollution } from "../letteringDemoPollution.js";
import { readActiveShowcaseStyle } from "./showcaseStyleStorage.js";

/** 통화 송출·미리보기용 카드 + 스타일 설정 병합 */
export function applyShowcaseStyleToCard(card, membershipTier = "free", opts = {}) {
  const peerMode = Boolean(opts.peerMode || opts.skipFixedIdentity);
  const style =
    opts.style ||
    (card?.showcaseStyle && typeof card.showcaseStyle === "object" ? card.showcaseStyle : null) ||
    (peerMode ? null : readActiveShowcaseStyle());

  /*
   * 통화 오버레이·피어 명함: 상대 DB 값을 그대로 송출.
   * scrub/고정신원 병합 금지 — ceo@vlue.kr·VCID KOREA 가 「데모 오염」으로 지워지는 사고 방지.
   */
  if (peerMode) {
    const styleSafe = style
      ? { ...style, showBroadcastName: style.showBroadcastName !== false }
      : null;
    return {
      ...card,
      ...(styleSafe ? { showcaseStyle: styleSafe } : {}),
      membershipTier,
      hideBroadcastName: false
    };
  }

  const merged = scrubLetteringDemoPollution({
    ...card,
    ...(style ? { showcaseStyle: style } : {}),
    membershipTier
  });
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
  if (style?.showBroadcastName === false) {
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
