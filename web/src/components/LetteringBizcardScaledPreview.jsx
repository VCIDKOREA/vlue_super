import { useEffect, useRef, useState } from "react";

/** 명함 UI 설계 기준 너비(px) — 90×50mm 비율과 맞춤 */
const PREVIEW_DESIGN_WIDTH_PX = 300;
/** 플립 면 + 버튼 대략 높이(측정 전 폴백) */
const PREVIEW_FALLBACK_HEIGHT_PX = 248;

/**
 * 미리보기 영역 너비에 맞춰 명함 전체를 균일 축소.
 */
export default function LetteringBizcardScaledPreview({ children, className = "", isDarkMode = false }) {
  const hostRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(PREVIEW_FALLBACK_HEIGHT_PX);

  useEffect(() => {
    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;

    const update = () => {
      const w = host.clientWidth;
      const nextScale = w > 0 ? Math.min(1, w / PREVIEW_DESIGN_WIDTH_PX) : 1;
      setScale(nextScale);
      const h = inner.offsetHeight;
      if (h > 0) setInnerHeight(h);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [children]);

  const slotWidth = PREVIEW_DESIGN_WIDTH_PX * scale;
  const slotHeight = Math.ceil(innerHeight * scale) + 12;
  const supportsZoom = typeof CSS !== "undefined" && CSS.supports("zoom", "0.5");

  return (
    <div
      ref={hostRef}
      className={`lettering-bizcard-preview-host${isDarkMode ? " lettering-bizcard-preview-host--dark" : ""} ${className}`.trim()}
      style={{ minHeight: slotHeight }}
    >
      <div
        className="lettering-bizcard-preview-host__slot"
        style={{
          width: slotWidth,
          height: slotHeight,
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        <div
          ref={innerRef}
          className={`lettering-bizcard-preview-host__inner${supportsZoom ? " lettering-bizcard-preview-host__inner--zoom" : ""}`}
          style={
            supportsZoom
              ? { width: PREVIEW_DESIGN_WIDTH_PX, zoom: scale }
              : {
                  width: PREVIEW_DESIGN_WIDTH_PX,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left"
                }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
