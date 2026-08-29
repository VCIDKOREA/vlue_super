import { useEffect, useMemo, useState } from "react";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import {
  MYCASE_SHOWCASE_PICK_CHANGED_EVENT,
  dispatchMycaseShowcasePickApply,
  readMycaseShowcasePick,
  showcasePickLimitForTier
} from "../../lib/mycase/mycaseShowcasePick.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "../../lib/showcase/showcaseStyleStorage.js";
import "./my-case-pick-tray.css";

/**
 * 통화 쇼케이스 사진 선택 트레이 — 웹: 우측 고정 / 앱: 하단 시트
 */
export default function MyCaseShowcasePickTray({
  enabled = true,
  variant = "sidebar",
  onToast
}) {
  const [tick, setTick] = useState(0);
  const membershipTier = useMemo(() => readMembershipTier(), [tick]);
  const limit = showcasePickLimitForTier(membershipTier);
  const { items } = useMemo(() => {
    void tick;
    return readMycaseShowcasePick();
  }, [tick]);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(MYCASE_SHOWCASE_PICK_CHANGED_EVENT, bump);
    return () => window.removeEventListener(MYCASE_SHOWCASE_PICK_CHANGED_EVENT, bump);
  }, []);

  if (!enabled) return null;

  const onComplete = () => {
    if (!items.length) {
      onToast?.("먼저 게시물에서 쇼케이스에 넣을 사진을 선택해 주세요.");
      return;
    }
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
    window.setTimeout(() => dispatchMycaseShowcasePickApply(), 120);
    onToast?.(
      isPaidLetteringTier(membershipTier)
        ? `선택한 ${items.length}장을 쇼케이스 설정에 반영합니다.`
        : "선택한 사진을 쇼케이스 설정에 반영합니다."
    );
  };

  const tierHint = isPaidLetteringTier(membershipTier)
    ? `통화 쇼케이스는 최대 ${limit}장까지 선택할 수 있습니다.`
    : "통화 쇼케이스용으로는 1장만 선택할 수 있습니다.";

  return (
    <aside
      className={`my-case-pick-tray my-case-pick-tray--${variant}${items.length ? " has-items" : ""}`}
      aria-label="쇼케이스 선택"
    >
      <div className="my-case-pick-tray__head">
        <strong>쇼케이스 선택</strong>
        <span className="my-case-pick-tray__count">
          {items.length}/{limit}
        </span>
      </div>
      <p className="my-case-pick-tray__hint">{tierHint}</p>
      <ul className="my-case-pick-tray__list">
        {items.map((row) => (
          <li key={`${row.caseId}-${row.imageId}`} className="my-case-pick-tray__item">
            <span className="my-case-pick-tray__order">{row.order}</span>
            <img src={row.imageUrl} alt="" />
          </li>
        ))}
        {Array.from({ length: Math.max(0, limit - items.length) }).map((_, i) => (
          <li key={`empty-${i}`} className="my-case-pick-tray__item my-case-pick-tray__item--empty">
            <span className="my-case-pick-tray__order">{items.length + i + 1}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="my-case-pick-tray__done" onClick={onComplete}>
        선택완료
      </button>
    </aside>
  );
}
