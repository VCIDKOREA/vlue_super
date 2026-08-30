import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

function measureNavHeightPx() {
  if (typeof document === "undefined") return 56;
  const nav = document.querySelector(".vlue-bottom-nav, .bottom-nav, nav[aria-label='하단 메뉴']");
  if (!nav) return 56;
  const rect = nav.getBoundingClientRect();
  return Math.max(48, Math.round(rect.height || 56));
}

/**
 * 통화 쇼케이스 사진 선택 트레이 — 웹: 우측 고정 / 앱: 팔로우쇼케이스형 하단 시트
 */
export default function MyCaseShowcasePickTray({
  enabled = true,
  variant = "sidebar",
  onToast
}) {
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [navBottomPx, setNavBottomPx] = useState(() => measureNavHeightPx());
  const panelRef = useRef(null);
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

  useEffect(() => {
    if (variant !== "sheet") return undefined;
    const sync = () => {
      const nav = measureNavHeightPx();
      setNavBottomPx(nav);
      document.documentElement.style.setProperty("--vlue-bottom-nav-offset", `${nav}px`);
      const toggle = panelRef.current?.querySelector(".my-case-pick-tray__toggle");
      const trayH = toggle ? Math.ceil(toggle.getBoundingClientRect().height) : 80;
      document.documentElement.style.setProperty("--my-case-pick-tray-collapsed-h", `${Math.max(72, trayH)}px`);
    };
    sync();
    window.addEventListener("resize", sync);
    const t = window.setInterval(sync, 800);
    return () => {
      window.removeEventListener("resize", sync);
      window.clearInterval(t);
      document.documentElement.style.removeProperty("--my-case-pick-tray-collapsed-h");
    };
  }, [variant, expanded, items.length]);

  const onComplete = useCallback(() => {
    if (!items.length) {
      onToast?.("먼저 게시물에서 쇼케이스에 넣을 사진을 선택해 주세요.");
      return;
    }
    setExpanded(false);
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
    window.setTimeout(() => dispatchMycaseShowcasePickApply(), 120);
    onToast?.(
      isPaidLetteringTier(membershipTier)
        ? `선택한 ${items.length}장을 쇼케이스 설정에 반영합니다.`
        : "선택한 사진을 쇼케이스 설정에 반영합니다."
    );
  }, [items.length, membershipTier, onToast]);

  if (!enabled) return null;

  const tierHint = isPaidLetteringTier(membershipTier)
    ? `통화 쇼케이스는 최대 ${limit}장까지 선택할 수 있습니다.`
    : "통화 쇼케이스용으로는 1장만 선택할 수 있습니다.";

  const trayBody = (
    <>
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
    </>
  );

  if (variant === "sidebar") {
    return (
      <aside
        className={`my-case-pick-tray my-case-pick-tray--sidebar${items.length ? " has-items" : ""}`}
        aria-label="쇼케이스 선택"
      >
        <div className="my-case-pick-tray__head">
          <strong>쇼케이스 선택</strong>
          <span className="my-case-pick-tray__count">
            {items.length}/{limit}
          </span>
        </div>
        {trayBody}
      </aside>
    );
  }

  return (
    <section
      className={`my-case-pick-tray my-case-pick-tray--sheet${expanded ? " is-expanded" : " is-collapsed"}${
        items.length ? " has-items" : ""
      }`}
      aria-label="쇼케이스 선택"
    >
      {expanded ? (
        <button
          type="button"
          className="my-case-pick-tray__backdrop"
          aria-label="쇼케이스 선택 닫기"
          onClick={() => setExpanded(false)}
        />
      ) : null}
      <div ref={panelRef} className="my-case-pick-tray__panel" style={{ paddingBottom: `${navBottomPx}px` }}>
        <div className="my-case-pick-tray__toggle">
          <span className="my-case-pick-tray__handle" aria-hidden />
          <button
            type="button"
            className="my-case-pick-tray__toggle-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span className="my-case-pick-tray__toggle-title">
              쇼케이스 선택
              <span className="my-case-pick-tray__count">{items.length}/{limit}</span>
            </span>
            <span className="my-case-pick-tray__toggle-hint">
              {expanded ? "내리기" : "올리기"}
              {expanded ? <ChevronDown size={15} aria-hidden /> : <ChevronUp size={15} aria-hidden />}
            </span>
          </button>
        </div>
        {expanded ? <div className="my-case-pick-tray__body">{trayBody}</div> : null}
      </div>
    </section>
  );
}
