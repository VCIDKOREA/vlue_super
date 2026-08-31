import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { readEffectiveMembershipTier } from "../../lib/effectiveMembership.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import {
  MYCASE_SHOWCASE_PICK_CHANGED_EVENT,
  countMycaseShowcasePickFilled,
  ensureMycaseShowcasePickSeeded,
  goToShowcaseSettingsWithPick,
  readExistingShowcaseHasContent,
  readMycaseShowcasePickSlots,
  reorderMycaseShowcasePick,
  showcasePickLimitForTier
} from "../../lib/mycase/mycaseShowcasePick.js";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOrder, setDragOrder] = useState(null);
  const [navBottomPx, setNavBottomPx] = useState(() => measureNavHeightPx());
  const panelRef = useRef(null);
  const membershipTier = useMemo(() => readEffectiveMembershipTier(), [tick]);
  const limit = showcasePickLimitForTier(membershipTier);

  useEffect(() => {
    if (!enabled) return;
    ensureMycaseShowcasePickSeeded(membershipTier);
    setTick((n) => n + 1);
  }, [enabled, membershipTier]);

  const slots = useMemo(() => {
    void tick;
    return readMycaseShowcasePickSlots(membershipTier);
  }, [tick, membershipTier]);

  const filledCount = useMemo(() => {
    void tick;
    return countMycaseShowcasePickFilled(membershipTier);
  }, [tick, membershipTier]);

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
  }, [variant, expanded, filledCount]);

  const onRequestComplete = useCallback(() => {
    if (!filledCount) {
      onToast?.("먼저 게시물에서 쇼케이스에 넣을 사진을 선택해 주세요.");
      return;
    }
    setConfirmOpen(true);
  }, [filledCount, onToast]);

  const onConfirmComplete = useCallback(() => {
    setConfirmOpen(false);
    setExpanded(false);
    const channel = variant === "sidebar" ? "web" : "app";
    const ok = goToShowcaseSettingsWithPick({ channel });
    if (!ok) {
      onToast?.("선택한 사진을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
  }, [variant, onToast]);

  const hasExistingShowcase = useMemo(() => readExistingShowcaseHasContent(), [confirmOpen, tick]);

  const onDragStart = useCallback((order) => {
    setDragOrder(order);
  }, []);

  const onDragOver = useCallback((e, order) => {
    e.preventDefault();
    if (dragOrder && dragOrder !== order) {
      e.dataTransfer.dropEffect = "move";
    }
  }, [dragOrder]);

  const onDrop = useCallback(
    (e, toOrder) => {
      e.preventDefault();
      const fromOrder = dragOrder;
      setDragOrder(null);
      if (!fromOrder || fromOrder === toOrder) return;
      const fromSlot = slots.find((x) => x.order === fromOrder);
      if (!String(fromSlot?.imageUrl || "").trim()) return;
      reorderMycaseShowcasePick(fromOrder, toOrder, membershipTier);
    },
    [dragOrder, slots, membershipTier]
  );

  if (!enabled) return null;

  const confirmDialog =
    confirmOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="my-case-pick-confirm" role="dialog" aria-modal="true" aria-labelledby="my-case-pick-confirm-title">
            <button
              type="button"
              className="my-case-pick-confirm__backdrop"
              aria-label="닫기"
              onClick={() => setConfirmOpen(false)}
            />
            <div className="my-case-pick-confirm__panel">
              {hasExistingShowcase ? (
                <p className="my-case-pick-confirm__lead">쇼케이스 사진을 변경합니다.</p>
              ) : null}
              <h2 id="my-case-pick-confirm-title" className="my-case-pick-confirm__title">
                선택한 사진은 쇼케이스 저장이 필요합니다.
                <br />
                쇼케이스 설정 화면으로 이동하시겠습니까?
              </h2>
              <div className="my-case-pick-confirm__actions">
                <button
                  type="button"
                  className="my-case-pick-confirm__btn my-case-pick-confirm__btn--ghost"
                  onClick={() => setConfirmOpen(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="my-case-pick-confirm__btn my-case-pick-confirm__btn--ok"
                  onClick={onConfirmComplete}
                >
                  확인
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const tierHint = isPaidLetteringTier(membershipTier)
    ? `통화 쇼케이스는 최대 ${limit}장까지 선택할 수 있습니다. 드래그로 순서를 바꿀 수 있습니다.`
    : "통화 쇼케이스용으로는 1장만 선택할 수 있습니다.";

  const trayBody = (
    <>
      <p className="my-case-pick-tray__hint">{tierHint}</p>
      <ul className="my-case-pick-tray__list my-case-pick-tray__list--slots">
        {slots.map((row) => {
          const hasImage = Boolean(String(row.imageUrl || "").trim());
          return (
            <li
              key={`slot-${row.order}`}
              className={`my-case-pick-tray__item${hasImage ? "" : " my-case-pick-tray__item--empty"}${
                dragOrder === row.order ? " is-dragging" : ""
              }`}
              draggable={hasImage}
              onDragStart={() => onDragStart(row.order)}
              onDragEnd={() => setDragOrder(null)}
              onDragOver={(e) => onDragOver(e, row.order)}
              onDrop={(e) => onDrop(e, row.order)}
            >
              <span className="my-case-pick-tray__order">{row.order}</span>
              {hasImage ? (
                <>
                  <img src={row.imageUrl} alt="" draggable={false} />
                  <span className="my-case-pick-tray__drag" aria-hidden>
                    <GripVertical size={12} />
                  </span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <button type="button" className="my-case-pick-tray__done" onClick={onRequestComplete}>
        선택완료
      </button>
    </>
  );

  if (variant === "sidebar") {
    return (
      <>
        {confirmDialog}
        <aside
          className={`my-case-pick-tray my-case-pick-tray--sidebar${filledCount ? " has-items" : ""}`}
          aria-label="쇼케이스 선택"
        >
          <div className="my-case-pick-tray__head">
            <strong>쇼케이스 선택</strong>
            <span className="my-case-pick-tray__count">
              {filledCount}/{limit}
            </span>
          </div>
          {trayBody}
        </aside>
      </>
    );
  }

  return (
    <>
      {confirmDialog}
      <section
        className={`my-case-pick-tray my-case-pick-tray--sheet${expanded ? " is-expanded" : " is-collapsed"}${
          filledCount ? " has-items" : ""
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
                <span className="my-case-pick-tray__count">{filledCount}/{limit}</span>
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
    </>
  );
}
