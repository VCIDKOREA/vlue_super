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

export const MAX_PHOTO_TEXT_OVERLAYS = 8;
export const MAX_OVERLAY_TEXT_CHARS = 240;

function newOverlayId() {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** @param {object} raw */
export function normalizeOneTextOverlay(raw = {}) {
  const fontId = String(raw.font || raw.overlayFont || raw.fontFamily || "pretendard");
  const fontMeta = SHOWCASE_FONT_SETS.find((f) => f.id === fontId);
  const border = SHOWCASE_TEXT_BORDERS.some((b) => b.id === (raw.border || raw.overlayBorder))
    ? raw.border || raw.overlayBorder
    : "none";
  const anim = SHOWCASE_TEXT_ANIMS.some((a) => a.id === (raw.anim || raw.overlayAnim))
    ? raw.anim || raw.overlayAnim
    : "none";
  return {
    id: String(raw.id || "").trim() || newOverlayId(),
    text: String(raw.text ?? raw.overlayText ?? ""),
    font: fontId,
    fontCss: fontMeta?.css || "inherit",
    fontSize: Math.min(64, Math.max(12, Number(raw.fontSize ?? raw.overlayFontSize) || 28)),
    color: String(raw.color || raw.overlayColor || "#ffffff"),
    x: Math.min(100, Math.max(0, Number(raw.x ?? raw.overlayX) || 50)),
    y: Math.min(100, Math.max(0, Number(raw.y ?? raw.overlayY) || 50)),
    anim,
    border
  };
}

/**
 * 사진의 텍스트 레이어 목록 (레거시 overlayText 단일 필드 호환)
 * @param {object} photo
 * @param {{ includeEmpty?: boolean }} [opts]
 */
export function listPhotoTextOverlays(photo = {}, opts = {}) {
  const includeEmpty = Boolean(opts.includeEmpty);
  const raw = Array.isArray(photo.textOverlays) ? photo.textOverlays : null;
  if (raw && raw.length) {
    const list = raw.map((row) => normalizeOneTextOverlay(row));
    return includeEmpty ? list : list.filter((o) => String(o.text || "").trim());
  }
  const legacyText = String(photo.overlayText || "");
  if (!legacyText.trim() && !includeEmpty) return [];
  if (!legacyText.trim() && !photo.overlayFont && includeEmpty) return [];
  return [
    normalizeOneTextOverlay({
      id: photo.overlayId || "tx-legacy",
      text: legacyText,
      font: photo.overlayFont,
      fontSize: photo.overlayFontSize,
      color: photo.overlayColor,
      x: photo.overlayX,
      y: photo.overlayY,
      anim: photo.overlayAnim,
      border: photo.overlayBorder
    })
  ];
}

/** 편집용 — 레이어가 없으면 빈 1개 생성 */
export function ensurePhotoTextOverlays(photo = {}) {
  const list = listPhotoTextOverlays(photo, { includeEmpty: true });
  if (list.length) return list;
  return [createEmptyTextOverlay({ y: 50 })];
}

export function createEmptyTextOverlay(partial = {}) {
  const n = Number(partial.index) || 0;
  return normalizeOneTextOverlay({
    id: newOverlayId(),
    text: "",
    font: "pretendard",
    fontSize: 28,
    color: "#ffffff",
    x: 50,
    y: Math.min(88, 28 + (n % 5) * 12),
    anim: "fade",
    border: "none",
    ...partial
  });
}

/**
 * textOverlays 를 사진에 저장 + 레거시 단일 필드 동기화 (구 뷰어 호환)
 * @param {object} photo
 * @param {object[]} overlays
 */
export function applyTextOverlaysToPhoto(photo, overlays) {
  const list = (Array.isArray(overlays) ? overlays : [])
    .slice(0, MAX_PHOTO_TEXT_OVERLAYS)
    .map((row) => normalizeOneTextOverlay(row));
  const primary = list.find((o) => String(o.text || "").trim()) || list[0] || null;
  return {
    ...photo,
    textOverlays: list,
    overlayText: primary ? String(primary.text || "") : "",
    overlayFont: primary?.font || "pretendard",
    overlayFontSize: primary?.fontSize || 28,
    overlayColor: primary?.color || "#ffffff",
    overlayX: primary?.x ?? 50,
    overlayY: primary?.y ?? 50,
    overlayAnim: primary?.anim || "fade",
    overlayBorder: primary?.border || "none"
  };
}

/** @deprecated listPhotoTextOverlays / normalizeOneTextOverlay 사용 */
export function normalizePhotoOverlay(photo = {}) {
  const list = ensurePhotoTextOverlays(photo);
  const o = list[0] || createEmptyTextOverlay();
  return {
    overlayText: o.text,
    overlayFont: o.font,
    overlayFontCss: o.fontCss,
    overlayFontSize: o.fontSize,
    overlayColor: o.color,
    overlayX: o.x,
    overlayY: o.y,
    overlayAnim: o.anim,
    overlayBorder: o.border
  };
}

function OverlayBubble({
  overlay,
  interactive = false,
  dragging = false,
  selected = false,
  className = "",
  onPointerDown
}) {
  const text = String(overlay?.text || "");
  if (!text.trim() && !interactive) return null;
  if (!text.trim() && interactive && !selected) return null;
  return (
    <p
      className={[
        "showcase-photo-text-overlay",
        `showcase-photo-text-overlay--border-${overlay.border}`,
        `showcase-photo-text-overlay--${overlay.anim}`,
        interactive ? "showcase-photo-text-overlay--interactive" : "",
        dragging ? "is-dragging" : "",
        selected ? "is-selected" : "",
        !text.trim() ? "is-empty" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        fontSize: `${overlay.fontSize}px`,
        color: overlay.color,
        fontFamily: overlay.fontCss
      }}
      data-overlay-id={overlay.id}
      onPointerDown={interactive ? onPointerDown : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "텍스트 위치 드래그" : undefined}
    >
      {text.trim() ? text : "문구"}
    </p>
  );
}

/**
 * 사진 위 Instagram 스타일 텍스트 오버레이 (다중 레이어)
 */
export default function ShowcasePhotoTextOverlay({
  photo,
  className = "",
  interactive = false,
  dragging = false,
  draggingId = "",
  selectedId = "",
  overlays: overlaysProp = null,
  onPointerDown,
  onSelectOverlay
}) {
  const overlays =
    Array.isArray(overlaysProp) && overlaysProp.length
      ? overlaysProp.map((row) => normalizeOneTextOverlay(row))
      : interactive
        ? ensurePhotoTextOverlays(photo)
        : listPhotoTextOverlays(photo);

  if (!overlays.length) return null;

  return (
    <>
      {overlays.map((o) => (
        <OverlayBubble
          key={o.id}
          overlay={o}
          interactive={interactive}
          dragging={dragging && draggingId === o.id}
          selected={selectedId === o.id}
          className={className}
          onPointerDown={(e) => {
            onSelectOverlay?.(o.id);
            onPointerDown?.(e, o.id);
          }}
        />
      ))}
    </>
  );
}
