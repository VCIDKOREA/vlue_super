import { SHOWCASE_FONT_SETS } from "../../lib/showcase/showcaseStyleTypes.js";

export const SHOWCASE_TEXT_ANIMS = [
  { id: "none", label: "없음" },
  { id: "fade", label: "페이드" },
  { id: "slide-up", label: "위로 슬라이드" },
  { id: "typewriter", label: "타이핑" },
  { id: "bounce", label: "바운스" },
  { id: "pulse", label: "펄스" }
];

/** 텍스트 테두리·배경 스타일 */
export const SHOWCASE_TEXT_BORDERS = [
  { id: "none", label: "없음" },
  { id: "pill", label: "알약" },
  { id: "circle", label: "원형" },
  { id: "box", label: "박스" },
  { id: "outline", label: "외곽선" },
  { id: "glow", label: "글로우" }
];

export const OVERLAY_POS_PRESETS = [
  { id: "top", label: "위", x: 50, y: 18 },
  { id: "center", label: "가운데", x: 50, y: 50 },
  { id: "bottom", label: "아래", x: 50, y: 82 }
];

export function normalizePhotoOverlay(photo = {}) {
  const fontId = String(photo.overlayFont || photo.fontFamily || "pretendard");
  const fontMeta = SHOWCASE_FONT_SETS.find((f) => f.id === fontId);
  const border = SHOWCASE_TEXT_BORDERS.some((b) => b.id === photo.overlayBorder)
    ? photo.overlayBorder
    : "none";
  return {
    overlayText: String(photo.overlayText || "").trim(),
    overlayFont: fontId,
    overlayFontCss: fontMeta?.css || "inherit",
    overlayFontSize: Math.min(64, Math.max(12, Number(photo.overlayFontSize) || 28)),
    overlayColor: String(photo.overlayColor || "#ffffff"),
    overlayX: Math.min(100, Math.max(0, Number(photo.overlayX) || 50)),
    overlayY: Math.min(100, Math.max(0, Number(photo.overlayY) || 50)),
    overlayAnim: SHOWCASE_TEXT_ANIMS.some((a) => a.id === photo.overlayAnim)
      ? photo.overlayAnim
      : "none",
    overlayBorder: border
  };
}

/**
 * 사진 위 Instagram 스타일 텍스트 오버레이
 * @param {{ photo: object, className?: string, interactive?: boolean, dragging?: boolean, onPointerDown?: (e: PointerEvent) => void }} props
 */
export default function ShowcasePhotoTextOverlay({
  photo,
  className = "",
  interactive = false,
  dragging = false,
  onPointerDown
}) {
  const o = normalizePhotoOverlay(photo);
  if (!o.overlayText) return null;
  return (
    <p
      className={[
        "showcase-photo-text-overlay",
        `showcase-photo-text-overlay--border-${o.overlayBorder}`,
        `showcase-photo-text-overlay--${o.overlayAnim}`,
        interactive ? "showcase-photo-text-overlay--interactive" : "",
        dragging ? "is-dragging" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${o.overlayX}%`,
        top: `${o.overlayY}%`,
        fontSize: `${o.overlayFontSize}px`,
        color: o.overlayColor,
        fontFamily: o.overlayFontCss
      }}
      onPointerDown={interactive ? onPointerDown : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "텍스트 위치 드래그" : undefined}
    >
      {o.overlayText}
    </p>
  );
}
