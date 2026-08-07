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
const DEFAULT_CARD_W = 280;
const DEFAULT_CARD_H = 100;

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
  onExpand
}) {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const viewportRef = useRef(readViewport());
  const cardSizeRef = useRef({ w: DEFAULT_CARD_W, h: DEFAULT_CARD_H });
  const posRef = useRef(sessionMiniCasePos || { x: 16, y: 56 });
  const [pos, setPos] = useState(() => sessionMiniCasePos || { x: 16, y: 56 });
  const [cardSize, setCardSize] = useState({ w: DEFAULT_CARD_W, h: DEFAULT_CARD_H });
  const [dragging, setDragging] = useState(false);
  const [nativeSync] = useState(() => hasNativeMiniOverlay());

  const { peekRight, peekLeft } = peekFlags(pos, cardSize.w, viewportRef.current.vw);
  const frameW = peekRight || peekLeft ? EDGE_KEEP_PX : cardSize.w;
  const frameH = peekRight || peekLeft ? 120 : cardSize.h;

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
      const w = isPeek ? EDGE_KEEP_PX : cw;
      const h = isPeek ? 120 : ch;
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
        const cardEl = el.querySelector(".companion-mini-case__card") || el;
        const w = Math.max(160, Math.round(cardEl.offsetWidth || DEFAULT_CARD_W));
        const h = Math.max(72, Math.round(cardEl.offsetHeight || DEFAULT_CARD_H));
        cardSizeRef.current = { w, h };
        setCardSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
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
      const fw = isPeek ? EDGE_KEEP_PX : cw;
      const fh = isPeek ? 120 : ch;
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
  }, []);

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
          /* EDGE_HIDDEN Tap → VISIBLE (Showcase 복원은 카드 Tap / onExpand) */
          const revealed = revealPosFromPeek(final, cw, vw);
          applyPos(revealed, { commitVisibility: true });
          syncNativeVisibility(false);
        } else {
          /* VISIBLE Tap → Showcase 복원 Request */
          onExpand?.();
        }
        return;
      }

      /* Drag End → peek이면 EDGE_HIDDEN, 아니면 VISIBLE */
      applyPos(final, { commitVisibility: true });
    },
    [applyPos, onExpand, syncNativeVisibility]
  );

  const style = nativeSync
    ? {
        position: "relative",
        left: 0,
        top: 0,
        zIndex: 240,
        touchAction: "none",
        width: "max-content"
      }
    : {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 240,
        touchAction: "none"
      };

  return (
    <div
      ref={rootRef}
      className={`companion-mini-case${dragging ? " is-dragging" : ""}${
        peekRight ? " is-peek-right" : ""
      }${peekLeft ? " is-peek-left" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Mini Case · SHOWCASE 열기 · 드래그로 위치 이동"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (peekRight || peekLeft) {
            const revealed = revealPosFromPeek(posRef.current, cardSizeRef.current.w, viewportRef.current.vw);
            applyPos(revealed, { commitVisibility: true });
            syncNativeVisibility(false);
          } else {
            onExpand?.();
          }
        }
      }}
    >
      {peekRight || peekLeft ? (
        <div className="companion-mini-case__peek" aria-hidden>
          <span className="companion-mini-case__peek-rail" />
          <span className="companion-mini-case__peek-knob">{peekRight ? "‹" : "›"}</span>
        </div>
      ) : (
        <div className="companion-mini-case__card">
          <p className="companion-mini-case__line1">
            <span className="companion-mini-case__name">{displayName || "—"}</span>
            <span className="companion-mini-case__live" aria-hidden>
              🟢
            </span>
            <span className="companion-mini-case__duration">{durationLabel}</span>
          </p>
          <p className="companion-mini-case__line2">
            <span className="companion-mini-case__phone">{phoneLabel || "—"}</span>
            <span
              className={`companion-mini-case__badge${verified ? " is-verified" : " is-unverified"}`}
            >
              {statusLabel || (verified ? "인증" : "미인증")}
            </span>
          </p>
          <p className="companion-mini-case__expand-hint">▼ SHOWCASE 열기</p>
        </div>
      )}
    </div>
  );
}
