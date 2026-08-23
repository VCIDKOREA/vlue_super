import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MINI_CASE_EDGE_KEEP_PX } from "../../lib/call/companionMvpFlags.js";
import {
  hasNativeMiniOverlay,
  nativeGetScreenSize,
  nativeSetMiniCaseVisibility,
  nativeUpdateMiniOverlayFrame
} from "../../lib/call/nativeCallControl.js";

/** 통화 세션 동안 Mini Case 위치 유지 — 통화 종료 시 reset (앱 종료 아님) */
let sessionMiniCasePos = null;

export function resetCompanionMiniCaseSessionPos() {
  sessionMiniCasePos = null;
}

const EDGE_KEEP_PX = MINI_CASE_EDGE_KEEP_PX;
const DRAG_CLICK_MAX_PX = 10;
/** 화면 기준 가로형 — WebView 100vw 에 의존하지 않음 */
const DEFAULT_CARD_W = 312;
const DEFAULT_CARD_H = 118;
const PEEK_W = 32;
const PEEK_H = 112;
const FRAME_PAD_PX = 8;

function resolveCardWidthCss(vw) {
  const side = 24;
  const ideal = 312;
  const max = Math.max(240, Math.round(vw - side));
  return Math.min(ideal, max);
}

function readViewport() {
  const native = nativeGetScreenSize();
  if (native) {
    const d = native.d > 0 ? native.d : 1;
    return {
      vw: native.w / d,
      vh: native.h / d,
      density: d,
      nativeSync: hasNativeMiniOverlay()
    };
  }
  return {
    vw: typeof window !== "undefined" ? window.innerWidth || 360 : 360,
    vh: typeof window !== "undefined" ? window.innerHeight || 640 : 640,
    density: 1,
    nativeSync: false
  };
}

function defaultPos(w, vw) {
  return {
    x: Math.max(16, Math.round((vw - w) / 2)),
    y: 56
  };
}

function clampPos(x, y, w, h, vw, vh) {
  /* 최소 EDGE_KEEP_PX 는 화면 안 — 완전 이탈 방지. 가장자리 자동 스냅 없음 */
  const minX = EDGE_KEEP_PX - w;
  const maxX = vw - EDGE_KEEP_PX;
  const minY = EDGE_KEEP_PX - h;
  const maxY = vh - EDGE_KEEP_PX;
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
}

function peekFlags(pos, cardW, vw) {
  const visibleLeft = Math.max(0, pos.x);
  const visibleRight = Math.min(vw, pos.x + cardW);
  const visibleW = Math.max(0, visibleRight - visibleLeft);
  const peek = visibleW <= EDGE_KEEP_PX + 8;
  return {
    peekRight: peek && pos.x > vw / 2,
    peekLeft: peek && pos.x < vw / 2
  };
}

/** peek → 카드가 화면 안으로 들어오도록 좌표 보정 (Visibility VISIBLE용) */
function revealPosFromPeek(pos, cardW, vw) {
  const { peekLeft, peekRight } = peekFlags(pos, cardW, vw);
  if (peekRight) {
    return { x: Math.max(16, vw - cardW - 16), y: pos.y };
  }
  if (peekLeft) {
    return { x: 16, y: pos.y };
  }
  return pos;
}

/**
 * Companion MVP — Mini Case Floating Controller
 *
 * Position(MINI_CASE)과 Visibility(VISIBLE|EDGE_HIDDEN)는 분리.
 * 좌표: updateMiniOverlayFrame / Visibility: setMiniCaseVisibility.
 */
export default function CompanionMiniCase({
  displayName = "",
  phoneLabel = "",
  statusLabel = "",
  durationLabel = "0:00",
  verified = false,
  onExpand,
  customBody = null,
  hideExpand = false,
  locked = false,
  brandText = "VLUE LIVE"
}) {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const viewportRef = useRef(readViewport());
  const initialW = resolveCardWidthCss(viewportRef.current.vw);
  const cardSizeRef = useRef({ w: initialW, h: DEFAULT_CARD_H });
  const posRef = useRef(sessionMiniCasePos || { x: 16, y: 56 });
  const [pos, setPos] = useState(() => sessionMiniCasePos || { x: 16, y: 56 });
  const [cardSize, setCardSize] = useState({ w: initialW, h: DEFAULT_CARD_H });
  const [dragging, setDragging] = useState(false);
  const [nativeSync] = useState(() => hasNativeMiniOverlay());

  const { peekRight, peekLeft } = peekFlags(pos, cardSize.w, viewportRef.current.vw);
  const frameW = peekRight || peekLeft ? PEEK_W : cardSize.w;
  const frameH = peekRight || peekLeft ? PEEK_H : cardSize.h;

  const syncNativeFrame = useCallback(
    (nextPos, w, h) => {
      if (!nativeSync) return;
      const { density } = viewportRef.current;
      const d = density > 0 ? density : 1;
      nativeUpdateMiniOverlayFrame(nextPos.x * d, nextPos.y * d, w * d, h * d);
    },
    [nativeSync]
  );

  const syncNativeVisibility = useCallback(
    (isPeek) => {
      if (!nativeSync) return;
      nativeSetMiniCaseVisibility(isPeek ? "EDGE_HIDDEN" : "VISIBLE");
    },
    [nativeSync]
  );

  const applyPos = useCallback(
    (next, { commitVisibility = false } = {}) => {
      const { vw, vh } = viewportRef.current;
      const cw = cardSizeRef.current.w;
      const ch = cardSizeRef.current.h;
      const clamped = clampPos(next.x, next.y, cw, ch, vw, vh);
      posRef.current = clamped;
      sessionMiniCasePos = clamped;
      setPos(clamped);
      const peek = peekFlags(clamped, cw, vw);
      const isPeek = peek.peekRight || peek.peekLeft;
      const w = isPeek ? PEEK_W : cw;
      const h = isPeek ? PEEK_H : ch;
      syncNativeFrame(clamped, w, h);
      if (commitVisibility) {
        syncNativeVisibility(isPeek);
      }
    },
    [syncNativeFrame, syncNativeVisibility]
  );

  useLayoutEffect(() => {
    viewportRef.current = readViewport();
    const el = rootRef.current;
    if (!el) return undefined;

    const measureCard = () => {
      viewportRef.current = readViewport();
      const { vw, vh } = viewportRef.current;
      if (
        !el.classList.contains("is-peek-right") &&
        !el.classList.contains("is-peek-left")
      ) {
        /* 화면 폭 기준 가로 — overlay WebView 의 offsetWidth(창 크기)에 묶지 않음 */
        const w = resolveCardWidthCss(vw);
        const h = Math.max(
          96,
          Math.round(el.offsetHeight || DEFAULT_CARD_H)
        );
        const pad = FRAME_PAD_PX;
        cardSizeRef.current = { w: w + pad, h: h + pad };
        setCardSize((prev) =>
          prev.w === w + pad && prev.h === h + pad ? prev : { w: w + pad, h: h + pad }
        );
      }
      const base = sessionMiniCasePos || posRef.current;
      const cw = cardSizeRef.current.w;
      const ch = cardSizeRef.current.h;
      const raw = sessionMiniCasePos ? base : defaultPos(cw, vw);
      const clamped = clampPos(raw.x, raw.y, cw, ch, vw, vh);
      posRef.current = clamped;
      sessionMiniCasePos = clamped;
      setPos(clamped);
      const peek = peekFlags(clamped, cw, vw);
      const isPeek = peek.peekRight || peek.peekLeft;
      const fw = isPeek ? PEEK_W : cw;
      const fh = isPeek ? PEEK_H : ch;
      syncNativeFrame(clamped, fw, fh);
      syncNativeVisibility(isPeek);
    };

    measureCard();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureCard) : null;
    ro?.observe(el);
    const onResize = () => {
      viewportRef.current = readViewport();
      applyPos(posRef.current, { commitVisibility: true });
    };
    window.addEventListener("resize", onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [applyPos, nativeSync, syncNativeFrame, syncNativeVisibility]);

  useEffect(() => {
    if (!nativeSync) return;
    syncNativeFrame(posRef.current, frameW, frameH);
  }, [nativeSync, frameW, frameH, syncNativeFrame]);

  const onPointerDown = useCallback((e) => {
    if (locked) return;
    if (e.button != null && e.button !== 0) return;
    const el = rootRef.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    const cur = posRef.current;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.screenX ?? e.clientX,
      startY: e.screenY ?? e.clientY,
      origX: cur.x,
      origY: cur.y,
      moved: 0,
      last: cur
    };
    setDragging(true);
  }, [locked]);

  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const cx = e.screenX ?? e.clientX;
      const cy = e.screenY ?? e.clientY;
      const dx = cx - d.startX;
      const dy = cy - d.startY;
      d.moved = Math.max(d.moved, Math.hypot(dx, dy));
      const next = { x: d.origX + dx, y: d.origY + dy };
      d.last = next;
      /* 드래그 중: 좌표만 — Visibility는 Drag End에서 commit */
      applyPos(next, { commitVisibility: false });
    },
    [applyPos]
  );

  const endDrag = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || (e.pointerId != null && d.pointerId !== e.pointerId)) return;
      const moved = d.moved;
      const final = d.last || posRef.current;
      dragRef.current = null;
      setDragging(false);
      try {
        rootRef.current?.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }

      const { vw } = viewportRef.current;
      const cw = cardSizeRef.current.w;
      const peekBefore = peekFlags(final, cw, vw);
      const wasPeek = peekBefore.peekLeft || peekBefore.peekRight;

      if (moved <= DRAG_CLICK_MAX_PX) {
        if (wasPeek) {
          /* EDGE_HIDDEN Tap → VISIBLE (Showcase 복원은 「쇼케이스 돌아가기」 버튼만) */
          const revealed = revealPosFromPeek(final, cw, vw);
          applyPos(revealed, { commitVisibility: true });
          syncNativeVisibility(false);
        }
        return;
      }

      /* Drag End → peek이면 EDGE_HIDDEN, 아니면 VISIBLE */
      applyPos(final, { commitVisibility: true });
    },
    [applyPos, syncNativeVisibility]
  );

  const cssCardW = peekRight || peekLeft ? PEEK_W : resolveCardWidthCss(viewportRef.current.vw);
  const style = nativeSync
    ? {
        position: "relative",
        left: 0,
        top: 0,
        zIndex: 240,
        touchAction: "none",
        width: cssCardW,
        maxWidth: cssCardW,
        boxSizing: "border-box"
      }
    : {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 240,
        touchAction: "none",
        width: cssCardW,
        maxWidth: cssCardW,
        boxSizing: "border-box"
      };

  return (
    <div
      ref={rootRef}
      className={`companion-mini-case${dragging ? " is-dragging" : ""}${
        peekRight ? " is-peek-right" : ""
      }${peekLeft ? " is-peek-left" : ""}`}
      role="group"
      tabIndex={-1}
      aria-label={hideExpand ? "VLUE 미니케이스 · 드래그로 위치 이동" : "VLUE 미니케이스 · 드래그로 위치 이동 · 쇼케이스 복원은 하단 버튼"}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {peekRight || peekLeft ? (
        <div className="companion-mini-case__peek" aria-hidden>
          <span className="companion-mini-case__peek-shell">
            <span className="companion-mini-case__peek-rail" />
            <span className="companion-mini-case__peek-knob">
              {peekRight ? "‹" : "›"}
            </span>
          </span>
        </div>
      ) : (
        <>
          <div className="companion-mini-case__brand" aria-hidden>
            <span className="companion-mini-case__brand-mark" />
            <span className="companion-mini-case__brand-text">{brandText}</span>
          </div>
          {customBody ? (
            <div className="companion-mini-case__card companion-mini-case__card--custom">{customBody}</div>
          ) : (
            <div className="companion-mini-case__card">
              <p className="companion-mini-case__line1">
                <span className="companion-mini-case__name">{displayName || "—"}</span>
                <span
                  className={`companion-mini-case__badge${verified ? " is-verified" : " is-unverified"}`}
                >
                  {statusLabel || (verified ? "인증" : "미인증")}
                </span>
                <span className="companion-mini-case__live" aria-hidden>
                  <span className="companion-mini-case__live-dot" />
                </span>
                <span className="companion-mini-case__duration">{durationLabel}</span>
              </p>
              <p className="companion-mini-case__line2">
                <span className="companion-mini-case__phone">{phoneLabel || "—"}</span>
              </p>
            </div>
          )}
          {hideExpand ? null : (
            <button
              type="button"
              className="companion-mini-case__expand"
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="companion-mini-case__expand-shine" aria-hidden="true" />
              <span className="companion-mini-case__expand-icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.2 7.4L6 3.6l3.8 3.8"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="companion-mini-case__expand-label">쇼케이스 돌아가기</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
