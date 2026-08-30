import { useEffect, useRef, useState } from "react";
import { AlignCenter, ImagePlus, Palette, Plus, Square, Trash2, Type, X } from "lucide-react";
import { SHOWCASE_MAX_PHOTOS } from "../../lib/showcase/showcaseStyleStorage.js";
import { maxShowcasePhotosForTier } from "../../lib/showcase/tentShowcaseTypes.js";
import { SHOWCASE_FONT_SETS } from "../../lib/showcase/showcaseStyleTypes.js";
import ShowcasePhotoTextOverlay, {
  OVERLAY_POS_PRESETS,
  SHOWCASE_TEXT_ANIMS,
  SHOWCASE_TEXT_BORDERS,
  MAX_OVERLAY_TEXT_CHARS,
  MAX_PHOTO_TEXT_OVERLAYS,
  applyTextOverlaysToPhoto,
  createEmptyTextOverlay,
  ensurePhotoTextOverlays,
  listPhotoTextOverlays,
  normalizeOneTextOverlay
} from "./ShowcasePhotoTextOverlay.jsx";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import { SHOWCASE_CALL_IMAGE_GUIDE, isLikelyImageFile } from "../../lib/fitImageFile.js";

function clampPercent(n) {
  return Math.min(100, Math.max(0, n));
}

/** 픽셀 → % (소수 1자리 — 부드러운 드래그) */
function pointerToPercent(clientX, clientY, el) {
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 50, y: 50 };
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: clampPercent(Math.round(x * 10) / 10),
    y: clampPercent(Math.round(y * 10) / 10)
  };
}

/**
 * 쇼케이스 사진 편집
 * - limit=1(개인커스텀): 인스타 스토리형 스튜디오
 * - limit>1: 썸네일 그리드 + 선택 시트
 * - 사진당 여러 텍스트 레이어 · 여러 줄(Enter) · 레이어별 글꼴
 */
export default function ShowcasePhotoEditor({
  photos = [],
  onChange,
  membershipTier = "paid",
  maxPhotos,
  enableTextOverlay = true
}) {
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const studioCanvasRef = useRef(null);
  const sheetCanvasRef = useRef(null);
  const dragMovedRef = useRef(false);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [replaceId, setReplaceId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState("");
  /** @type {['text'|'font'|'color'|'size'|'pos'|'border'|'anim'|null, Function]} */
  const [tool, setTool] = useState("text");
  /** 드래그 중 로컬 위치 — 부모 onChange 지연 없이 커서를 따라감 */
  const [dragPos, setDragPos] = useState(null);
  const [draggingId, setDraggingId] = useState("");
  const limit = Math.max(1, Number(maxPhotos) || maxShowcasePhotosForTier(membershipTier) || SHOWCASE_MAX_PHOTOS);
  const singleMode = limit === 1;
  const selected = photos.find((p) => p.id === selectedId) || (singleMode ? photos[0] || null : null);
  const canAdd = photos.length < limit;
  const cells = canAdd ? [...photos, null] : photos;

  const overlays = selected && enableTextOverlay ? ensurePhotoTextOverlays(selected) : [];
  const activeOverlay =
    overlays.find((o) => o.id === selectedOverlayId) || overlays[0] || null;

  const previewOverlays =
    selected && dragPos && draggingId
      ? overlays.map((o) => (o.id === draggingId ? { ...o, x: dragPos.x, y: dragPos.y } : o))
      : overlays;

  useEffect(() => {
    if (!singleMode) return;
    if (photos[0]?.id) setSelectedId(photos[0].id);
    else setSelectedId(null);
  }, [singleMode, photos]);

  useEffect(() => {
    if (!selected || !enableTextOverlay) {
      setSelectedOverlayId("");
      return;
    }
    const list = ensurePhotoTextOverlays(selected);
    if (!list.some((o) => o.id === selectedOverlayId)) {
      setSelectedOverlayId(list[0]?.id || "");
    }
  }, [selected?.id, selected?.textOverlays, selected?.overlayText, enableTextOverlay, selectedOverlayId]);

  const commitPhoto = (nextPhoto) => {
    if (!selected) return;
    onChange(photos.map((p) => (p.id === selected.id ? nextPhoto : p)));
  };

  const commitOverlays = (nextOverlays) => {
    if (!selected) return;
    commitPhoto(applyTextOverlaysToPhoto(selected, nextOverlays));
  };

  const patchActiveOverlay = (patch) => {
    if (!selected || !activeOverlay) return;
    const next = overlays.map((o) =>
      o.id === activeOverlay.id ? normalizeOneTextOverlay({ ...o, ...patch }) : o
    );
    commitOverlays(next);
  };

  const addTextOverlay = () => {
    if (!selected) return;
    if (overlays.length >= MAX_PHOTO_TEXT_OVERLAYS) return;
    const created = createEmptyTextOverlay({ index: overlays.length });
    const next = [...overlays, created];
    commitOverlays(next);
    setSelectedOverlayId(created.id);
    setTool("text");
  };

  /** 선택 텍스트만 비우기(레이어 유지) — 사진은 그대로 */
  const clearActiveOverlayText = () => {
    if (!activeOverlay) return;
    patchActiveOverlay({ text: "" });
    setTool("text");
  };

  /** 선택 텍스트 레이어 삭제 — 사진은 그대로 */
  const removeActiveOverlay = () => {
    if (!selected || !activeOverlay) return;
    const next = overlays.filter((o) => o.id !== activeOverlay.id);
    const ensured = next.length ? next : [createEmptyTextOverlay()];
    commitOverlays(ensured);
    setSelectedOverlayId(ensured[0]?.id || "");
    setTool("text");
  };

  /** 사진의 모든 텍스트 제거 — 사진은 그대로 */
  const clearAllOverlayText = () => {
    if (!selected) return;
    const blank = createEmptyTextOverlay();
    commitOverlays([blank]);
    setSelectedOverlayId(blank.id);
    setTool("text");
  };

  const onOverlayPointerDown = (e, canvasRef, overlayId) => {
    if (!selected || !enableTextOverlay) return;
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const photoId = selected.id;
    const oxId = String(overlayId || activeOverlay?.id || "").trim();
    if (!oxId) return;
    const target = ensurePhotoTextOverlays(selected).find((o) => o.id === oxId);
    if (!target) return;
    setSelectedOverlayId(oxId);
    dragMovedRef.current = false;
    const pointer = pointerToPercent(e.clientX, e.clientY, canvas);
    const baseX = Number(target.x) || 50;
    const baseY = Number(target.y) || 50;
    const offsetX = baseX - pointer.x;
    const offsetY = baseY - pointer.y;
    setDraggingId(oxId);
    setDragPos({ x: baseX, y: baseY });
    const pointerId = e.pointerId;
    try {
      canvas.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      dragMovedRef.current = true;
      const p = pointerToPercent(ev.clientX, ev.clientY, canvas);
      setDragPos({
        x: clampPercent(Math.round((p.x + offsetX) * 10) / 10),
        y: clampPercent(Math.round((p.y + offsetY) * 10) / 10)
      });
    };
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      const p = pointerToPercent(ev.clientX, ev.clientY, canvas);
      const finalPos = {
        x: clampPercent(Math.round((p.x + offsetX) * 10) / 10),
        y: clampPercent(Math.round((p.y + offsetY) * 10) / 10)
      };
      const row = photosRef.current.find((r) => r.id === photoId);
      if (row) {
        const list = ensurePhotoTextOverlays(row).map((o) =>
          o.id === oxId ? { ...o, x: finalPos.x, y: finalPos.y } : o
        );
        onChange(
          photosRef.current.map((r) => (r.id === photoId ? applyTextOverlaysToPhoto(r, list) : r))
        );
      }
      setDraggingId("");
      setDragPos(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /** 빈 영역 탭 — 선택 텍스트를 그 위치로 (드래그 직후 클릭은 무시) */
  const onCanvasBackgroundPointerUp = (e) => {
    if (!selected || !enableTextOverlay || !activeOverlay) return;
    if (draggingId || dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    if (e.target?.closest?.(".showcase-photo-text-overlay")) return;
    const el = e.currentTarget;
    const pos = pointerToPercent(e.clientX, e.clientY, el);
    patchActiveOverlay({ x: pos.x, y: pos.y });
  };

  const onFiles = async (fileList, { replacePhotoId } = {}) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (replacePhotoId) {
      const file = files[0];
      if (!file || !isLikelyImageFile(file)) return;
      try {
        const uploaded = await compressAndUploadMediaImageOrThrow(file, "showcase");
        onChange(photos.map((p) => (p.id === replacePhotoId ? { ...p, url: uploaded.url } : p)));
      } catch {
        /* ignore */
      }
      return;
    }

    const next = [...photos];
    let lastId = "";
    for (const file of files.slice(0, limit - next.length)) {
      if (!isLikelyImageFile(file)) continue;
      try {
        const uploaded = await compressAndUploadMediaImageOrThrow(file, "showcase");
        const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        lastId = id;
        const blank = createEmptyTextOverlay();
        next.push(
          applyTextOverlaysToPhoto(
            {
              id,
              url: uploaded.url,
              caption: "",
              emojiStickers: []
            },
            [blank]
          )
        );
      } catch {
        /* skip bad file */
      }
      if (next.length >= limit) break;
    }
    onChange(next.slice(0, limit));
    if (lastId && enableTextOverlay) {
      setSelectedId(lastId);
      setTool("text");
    }
  };

  const removePhoto = (id) => {
    onChange(photos.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleTool = (id) => setTool((prev) => (prev === id ? null : id));

  const textToolsPanel =
    enableTextOverlay && selected && activeOverlay ? (
      <>
        {tool === "text" ? (
          <div className="showcase-photo-studio__composer">
            <textarea
              className="showcase-photo-studio__input showcase-photo-studio__input--multiline"
              placeholder={"문구 입력… (Enter로 줄바꿈)\n여러 텍스트는 「텍스트 추가」"}
              rows={3}
              maxLength={MAX_OVERLAY_TEXT_CHARS}
              value={activeOverlay.text || ""}
              onChange={(e) =>
                patchActiveOverlay({ text: e.target.value.slice(0, MAX_OVERLAY_TEXT_CHARS) })
              }
            />
            <div className="showcase-photo-studio__text-actions" role="group" aria-label="텍스트 레이어">
              <button
                type="button"
                className="showcase-photo-studio__mini-btn"
                disabled={overlays.length >= MAX_PHOTO_TEXT_OVERLAYS}
                onClick={addTextOverlay}
              >
                <Plus size={14} aria-hidden /> 텍스트 추가
              </button>
              <button
                type="button"
                className="showcase-photo-studio__mini-btn"
                onClick={clearActiveOverlayText}
                disabled={!String(activeOverlay.text || "").trim()}
              >
                문구 비우기
              </button>
              <button
                type="button"
                className="showcase-photo-studio__mini-btn showcase-photo-studio__mini-btn--danger"
                onClick={removeActiveOverlay}
                disabled={overlays.length <= 1 && !String(activeOverlay.text || "").trim()}
              >
                <Trash2 size={13} aria-hidden /> 이 텍스트 삭제
              </button>
              <button
                type="button"
                className="showcase-photo-studio__mini-btn showcase-photo-studio__mini-btn--danger"
                onClick={clearAllOverlayText}
                disabled={!listPhotoTextOverlays(selected).length}
              >
                전체 텍스트 삭제
              </button>
            </div>
            {overlays.length > 1 ? (
              <div className="showcase-photo-studio__layers" role="listbox" aria-label="텍스트 레이어 선택">
                {overlays.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={o.id === activeOverlay.id}
                    className={`showcase-photo-studio__layer-chip${o.id === activeOverlay.id ? " is-on" : ""}`}
                    onClick={() => {
                      setSelectedOverlayId(o.id);
                      setTool("text");
                    }}
                  >
                    {i + 1}. {String(o.text || "").trim().split("\n")[0] || "빈 문구"}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="showcase-photo-studio__tip">
              Enter로 여러 줄 · 텍스트마다 글꼴·색·크기를 따로 지정할 수 있습니다 (최대{" "}
              {MAX_PHOTO_TEXT_OVERLAYS}개)
            </p>
          </div>
        ) : null}

        {tool === "font" ? (
          <div className="showcase-photo-studio__sheet" role="listbox" aria-label="글꼴">
            {SHOWCASE_FONT_SETS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="option"
                aria-selected={activeOverlay.font === f.id}
                className={`showcase-photo-studio__chip${activeOverlay.font === f.id ? " is-on" : ""}`}
                style={{ fontFamily: f.css }}
                onClick={() => patchActiveOverlay({ font: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        {tool === "color" ? (
          <div className="showcase-photo-studio__sheet showcase-photo-studio__sheet--colors">
            {["#ffffff", "#e2e8f0", "#93c5fd", "#2b6ff0", "#38bdf8", "#0f172a", "#fef08a"].map((c) => (
              <button
                key={c}
                type="button"
                className={`showcase-photo-studio__swatch${activeOverlay.color.toLowerCase() === c ? " is-on" : ""}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => patchActiveOverlay({ color: c })}
              />
            ))}
            <label className="showcase-photo-studio__swatch showcase-photo-studio__swatch--custom">
              <input
                type="color"
                value={activeOverlay.color}
                onChange={(e) => patchActiveOverlay({ color: e.target.value })}
                aria-label="직접 색상"
              />
            </label>
          </div>
        ) : null}

        {tool === "size" ? (
          <div className="showcase-photo-studio__sheet">
            <input
              type="range"
              className="showcase-photo-studio__range"
              min={14}
              max={56}
              value={activeOverlay.fontSize}
              onChange={(e) => patchActiveOverlay({ fontSize: Number(e.target.value) })}
              aria-label={`크기 ${activeOverlay.fontSize}`}
            />
            <span className="showcase-photo-studio__range-label">{activeOverlay.fontSize}px</span>
          </div>
        ) : null}

        {tool === "pos" ? (
          <div className="showcase-photo-studio__sheet">
            {OVERLAY_POS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`showcase-photo-studio__chip${
                  activeOverlay.x === p.x && activeOverlay.y === p.y ? " is-on" : ""
                }`}
                onClick={() => patchActiveOverlay({ x: p.x, y: p.y })}
              >
                {p.label}
              </button>
            ))}
            <p className="showcase-photo-studio__tip">
              텍스트를 드래그해 옮기거나, 빈 곳을 탭해 위치를 지정하세요
            </p>
          </div>
        ) : null}

        {tool === "border" ? (
          <div className="showcase-photo-studio__sheet">
            {SHOWCASE_TEXT_BORDERS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`showcase-photo-studio__chip${activeOverlay.border === b.id ? " is-on" : ""}`}
                onClick={() => patchActiveOverlay({ border: b.id })}
              >
                {b.label}
              </button>
            ))}
          </div>
        ) : null}

        {tool === "anim" ? (
          <div className="showcase-photo-studio__sheet">
            {SHOWCASE_TEXT_ANIMS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`showcase-photo-studio__chip${activeOverlay.anim === a.id ? " is-on" : ""}`}
                onClick={() => patchActiveOverlay({ anim: a.id })}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="showcase-photo-studio__dock" role="toolbar" aria-label="텍스트 도구">
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "text" ? " is-on" : ""}`}
            onClick={() => toggleTool("text")}
          >
            <Type size={18} aria-hidden />
            <span>텍스트</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "border" ? " is-on" : ""}`}
            onClick={() => toggleTool("border")}
          >
            <Square size={17} aria-hidden />
            <span>테두리</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "font" ? " is-on" : ""}`}
            onClick={() => toggleTool("font")}
          >
            <span className="showcase-photo-studio__aa" aria-hidden>
              Aa
            </span>
            <span>글꼴</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "color" ? " is-on" : ""}`}
            onClick={() => toggleTool("color")}
          >
            <Palette size={18} aria-hidden />
            <span>색</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "size" ? " is-on" : ""}`}
            onClick={() => toggleTool("size")}
          >
            <span className="showcase-photo-studio__aa" aria-hidden>
              A
            </span>
            <span>크기</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "pos" ? " is-on" : ""}`}
            onClick={() => toggleTool("pos")}
          >
            <AlignCenter size={18} aria-hidden />
            <span>위치</span>
          </button>
          <button
            type="button"
            className={`showcase-photo-studio__tool${tool === "anim" ? " is-on" : ""}`}
            onClick={() => toggleTool("anim")}
          >
            <span className="showcase-photo-studio__aa" aria-hidden>
              ✦
            </span>
            <span>효과</span>
          </button>
        </div>
      </>
    ) : null;

  return (
    <div
      className={`showcase-photo-editor${singleMode ? " showcase-photo-editor--single showcase-photo-editor--studio" : " showcase-photo-editor--grid"}`}
    >
      {!singleMode ? (
        <>
          <div className="showcase-photo-editor__intro">
            <p className="showcase-photo-editor__title">사진</p>
            <p className="showcase-photo-editor__count">
              {photos.length}/{limit} · 페이지당 최대 {limit}장
            </p>
          </div>
          <p className="showcase-photo-editor__hint">
            {enableTextOverlay
              ? `${SHOWCASE_CALL_IMAGE_GUIDE.sizeHint}. 사진 추가 후 탭하면 여러 줄·여러 텍스트·글꼴을 설정합니다`
              : `${SHOWCASE_CALL_IMAGE_GUIDE.sizeHint}. 빈 칸을 눌러 추가 · 사진을 눌러 바꾸거나 삭제`}
          </p>
        </>
      ) : null}

      {singleMode ? (
        photos.length === 0 ? (
          <div className="showcase-photo-studio">
            <button
              type="button"
              className="showcase-photo-studio__empty"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={36} strokeWidth={1.5} aria-hidden />
              <strong>사진 추가</strong>
              <span>{SHOWCASE_CALL_IMAGE_GUIDE.sizeHint}</span>
            </button>
          </div>
        ) : (
          <div className="showcase-photo-studio">
            <div className="showcase-photo-studio__stage">
              <div
                ref={studioCanvasRef}
                role="img"
                className={`showcase-photo-studio__canvas${draggingId ? " is-dragging" : ""}`}
                onPointerUp={onCanvasBackgroundPointerUp}
                aria-label="텍스트를 드래그해 위치를 조정하세요"
              >
                <img src={selected.url} alt="" draggable={false} />
                {enableTextOverlay ? (
                  <ShowcasePhotoTextOverlay
                    photo={selected}
                    overlays={previewOverlays}
                    interactive
                    dragging={Boolean(draggingId)}
                    draggingId={draggingId}
                    selectedId={activeOverlay?.id || ""}
                    onSelectOverlay={setSelectedOverlayId}
                    onPointerDown={(e, id) => onOverlayPointerDown(e, studioCanvasRef, id)}
                  />
                ) : null}
              </div>
            </div>

            {textToolsPanel}

            <div className="showcase-photo-studio__actions">
              <button
                type="button"
                className="showcase-photo-studio__action"
                onClick={() => {
                  setReplaceId(selected.id);
                  replaceRef.current?.click();
                }}
              >
                사진 바꾸기
              </button>
              <button
                type="button"
                className="showcase-photo-studio__action showcase-photo-studio__action--danger"
                onClick={() => removePhoto(selected.id)}
              >
                사진 삭제
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {photos.length === 0 ? (
            <button
              type="button"
              className="showcase-photo-editor__empty-hero"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={28} strokeWidth={1.5} aria-hidden />
              <strong>사진 추가</strong>
              <span>갤러리에서 선택 · 최대 {limit}장</span>
            </button>
          ) : (
            <div className="showcase-photo-editor__grid" role="list">
              {cells.map((photo, index) =>
                photo ? (
                  <button
                    key={photo.id}
                    type="button"
                    className={`showcase-photo-editor__cell${selectedId === photo.id ? " is-selected" : ""}`}
                    role="listitem"
                    onClick={() => setSelectedId(photo.id)}
                    aria-label={`사진 ${index + 1}`}
                  >
                    <img src={photo.url} alt="" />
                  </button>
                ) : (
                  <button
                    key="empty-add"
                    type="button"
                    className="showcase-photo-editor__cell showcase-photo-editor__cell--empty"
                    role="listitem"
                    onClick={() => fileRef.current?.click()}
                    aria-label="사진 추가"
                  >
                    <ImagePlus size={22} strokeWidth={1.6} aria-hidden />
                    <span>추가</span>
                  </button>
                )
              )}
            </div>
          )}

          {selected ? (
            <div className="showcase-photo-editor__sheet">
              <div
                ref={sheetCanvasRef}
                role="img"
                className={`showcase-photo-editor__sheet-preview${draggingId ? " is-dragging" : ""}`}
                onPointerUp={onCanvasBackgroundPointerUp}
                aria-label="텍스트를 드래그해 위치를 조정하세요"
              >
                <img src={selected.url} alt="" draggable={false} />
                {enableTextOverlay ? (
                  <ShowcasePhotoTextOverlay
                    photo={selected}
                    overlays={previewOverlays}
                    interactive
                    dragging={Boolean(draggingId)}
                    draggingId={draggingId}
                    selectedId={activeOverlay?.id || ""}
                    onSelectOverlay={setSelectedOverlayId}
                    onPointerDown={(e, id) => onOverlayPointerDown(e, sheetCanvasRef, id)}
                  />
                ) : null}
                {enableTextOverlay ? (
                  <span className="showcase-photo-editor__pos-hint">
                    텍스트를 드래그하거나 빈 곳을 탭해 위치 지정
                  </span>
                ) : null}
              </div>

              {enableTextOverlay ? (
                <div className="showcase-photo-editor__overlay-tools">{textToolsPanel}</div>
              ) : null}

              <div className="showcase-photo-editor__sheet-actions">
                <button
                  type="button"
                  className="showcase-photo-editor__sheet-btn"
                  onClick={() => {
                    setReplaceId(selected.id);
                    replaceRef.current?.click();
                  }}
                >
                  사진 바꾸기
                </button>
                <button
                  type="button"
                  className="showcase-photo-editor__sheet-btn showcase-photo-editor__sheet-btn--danger"
                  onClick={() => removePhoto(selected.id)}
                >
                  사진 삭제
                </button>
                <button
                  type="button"
                  className="showcase-photo-editor__sheet-close"
                  onClick={() => setSelectedId(null)}
                  aria-label="닫기"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={limit > 1}
        className="lbq-hidden-file-input"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="lbq-hidden-file-input"
        onChange={(e) => {
          void onFiles(e.target.files, { replacePhotoId: replaceId });
          setReplaceId(null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
