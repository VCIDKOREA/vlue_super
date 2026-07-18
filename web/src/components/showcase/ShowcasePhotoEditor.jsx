import { useEffect, useRef, useState } from "react";
import { AlignCenter, ImagePlus, Palette, Square, Type, X } from "lucide-react";
import { SHOWCASE_MAX_PHOTOS } from "../../lib/showcase/showcaseStyleStorage.js";
import { maxShowcasePhotosForTier } from "../../lib/showcase/tentShowcaseTypes.js";
import { SHOWCASE_FONT_SETS } from "../../lib/showcase/showcaseStyleTypes.js";
import ShowcasePhotoTextOverlay, {
  OVERLAY_POS_PRESETS,
  SHOWCASE_TEXT_ANIMS,
  SHOWCASE_TEXT_BORDERS,
  normalizePhotoOverlay
} from "./ShowcasePhotoTextOverlay.jsx";

/**
 * 쇼케이스 사진 편집
 * - limit=1(개인커스텀): 인스타 스토리형 스튜디오
 * - limit>1: 썸네일 그리드 + 선택 시트
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
  const [replaceId, setReplaceId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  /** @type {['text'|'font'|'color'|'size'|'pos'|'border'|'anim'|null, Function]} */
  const [tool, setTool] = useState("text");
  const limit = Math.max(1, Number(maxPhotos) || maxShowcasePhotosForTier(membershipTier) || SHOWCASE_MAX_PHOTOS);
  const singleMode = limit === 1;
  const selected = photos.find((p) => p.id === selectedId) || (singleMode ? photos[0] || null : null);
  const canAdd = photos.length < limit;
  const cells = canAdd ? [...photos, null] : photos;
  const overlay = selected ? normalizePhotoOverlay(selected) : null;

  useEffect(() => {
    if (!singleMode) return;
    if (photos[0]?.id) setSelectedId(photos[0].id);
    else setSelectedId(null);
  }, [singleMode, photos]);

  const patchSelected = (patch) => {
    if (!selected) return;
    onChange(photos.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));
  };

  const onFiles = async (fileList, { replacePhotoId } = {}) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (replacePhotoId) {
      const file = files[0];
      if (!file || !/^image\//i.test(file.type)) return;
      const url = await readAsDataUrl(file);
      onChange(photos.map((p) => (p.id === replacePhotoId ? { ...p, url } : p)));
      return;
    }

    const next = [...photos];
    let lastId = "";
    for (const file of files.slice(0, limit - next.length)) {
      if (!/^image\//i.test(file.type)) continue;
      const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      lastId = id;
      next.push({
        id,
        url: await readAsDataUrl(file),
        caption: "",
        overlayText: "",
        overlayFont: "pretendard",
        overlayFontSize: 28,
        overlayColor: "#ffffff",
        overlayX: 50,
        overlayY: 50,
        overlayAnim: "fade",
        overlayBorder: "none",
        emojiStickers: []
      });
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

  const onPreviewPointer = (e) => {
    if (!selected || !enableTextOverlay) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    patchSelected({
      overlayX: Math.min(100, Math.max(0, x)),
      overlayY: Math.min(100, Math.max(0, y))
    });
  };

  const toggleTool = (id) => setTool((prev) => (prev === id ? null : id));

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
              ? "사진 추가 후 탭하면 텍스트·크기·위치·애니메이션을 설정합니다"
              : "빈 칸을 눌러 추가 · 사진을 눌러 바꾸거나 삭제"}
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
              <span>탭해서 1장 선택</span>
            </button>
          </div>
        ) : (
          <div className="showcase-photo-studio">
            <div className="showcase-photo-studio__stage">
              <button
                type="button"
                className="showcase-photo-studio__canvas"
                onClick={onPreviewPointer}
                aria-label="텍스트 위치 — 사진에서 탭"
              >
                <img src={selected.url} alt="" draggable={false} />
                {enableTextOverlay ? <ShowcasePhotoTextOverlay photo={selected} /> : null}
              </button>
            </div>

            {enableTextOverlay && overlay ? (
              <>
                {tool === "text" ? (
                  <div className="showcase-photo-studio__composer">
                    <input
                      type="text"
                      className="showcase-photo-studio__input"
                      placeholder="문구 입력…"
                      maxLength={80}
                      value={selected.overlayText || ""}
                      onChange={(e) => patchSelected({ overlayText: e.target.value.slice(0, 80) })}
                    />
                  </div>
                ) : null}

                {tool === "font" ? (
                  <div className="showcase-photo-studio__sheet" role="listbox" aria-label="글꼴">
                    {SHOWCASE_FONT_SETS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        role="option"
                        aria-selected={overlay.overlayFont === f.id}
                        className={`showcase-photo-studio__chip${overlay.overlayFont === f.id ? " is-on" : ""}`}
                        style={{ fontFamily: f.css }}
                        onClick={() => patchSelected({ overlayFont: f.id })}
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
                        className={`showcase-photo-studio__swatch${overlay.overlayColor.toLowerCase() === c ? " is-on" : ""}`}
                        style={{ background: c }}
                        aria-label={c}
                        onClick={() => patchSelected({ overlayColor: c })}
                      />
                    ))}
                    <label className="showcase-photo-studio__swatch showcase-photo-studio__swatch--custom">
                      <input
                        type="color"
                        value={overlay.overlayColor}
                        onChange={(e) => patchSelected({ overlayColor: e.target.value })}
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
                      value={overlay.overlayFontSize}
                      onChange={(e) => patchSelected({ overlayFontSize: Number(e.target.value) })}
                      aria-label={`크기 ${overlay.overlayFontSize}`}
                    />
                    <span className="showcase-photo-studio__range-label">{overlay.overlayFontSize}px</span>
                  </div>
                ) : null}

                {tool === "pos" ? (
                  <div className="showcase-photo-studio__sheet">
                    {OVERLAY_POS_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`showcase-photo-studio__chip${
                          overlay.overlayX === p.x && overlay.overlayY === p.y ? " is-on" : ""
                        }`}
                        onClick={() => patchSelected({ overlayX: p.x, overlayY: p.y })}
                      >
                        {p.label}
                      </button>
                    ))}
                    <p className="showcase-photo-studio__tip">
                      위·아래 검정 여백을 탭해도 텍스트를 둘 수 있어요
                    </p>
                  </div>
                ) : null}

                {tool === "border" ? (
                  <div className="showcase-photo-studio__sheet">
                    {SHOWCASE_TEXT_BORDERS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`showcase-photo-studio__chip${overlay.overlayBorder === b.id ? " is-on" : ""}`}
                        onClick={() => patchSelected({ overlayBorder: b.id })}
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
                        className={`showcase-photo-studio__chip${overlay.overlayAnim === a.id ? " is-on" : ""}`}
                        onClick={() => patchSelected({ overlayAnim: a.id })}
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
            ) : null}

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
                삭제
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
              <button
                type="button"
                className="showcase-photo-editor__sheet-preview"
                onClick={onPreviewPointer}
                aria-label="텍스트 위치 — 사진에서 탭"
              >
                <img src={selected.url} alt="" draggable={false} />
                {enableTextOverlay ? <ShowcasePhotoTextOverlay photo={selected} /> : null}
                {enableTextOverlay ? (
                  <span className="showcase-photo-editor__pos-hint">위·아래 여백을 탭해 텍스트 위치 지정</span>
                ) : null}
              </button>

              {enableTextOverlay && overlay ? (
                <div className="showcase-photo-editor__overlay-tools">
                  <label className="showcase-photo-editor__field">
                    <span>사진 위 텍스트</span>
                    <textarea
                      rows={2}
                      placeholder="인스타처럼 사진 위에 올릴 문구"
                      value={selected.overlayText || ""}
                      onChange={(e) => patchSelected({ overlayText: e.target.value.slice(0, 80) })}
                    />
                  </label>
                  <div className="showcase-photo-editor__row">
                    <label className="showcase-photo-editor__field">
                      <span>글꼴</span>
                      <select
                        value={overlay.overlayFont}
                        onChange={(e) => patchSelected({ overlayFont: e.target.value })}
                      >
                        {SHOWCASE_FONT_SETS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="showcase-photo-editor__field showcase-photo-editor__field--color">
                      <span>색</span>
                      <input
                        type="color"
                        value={overlay.overlayColor}
                        onChange={(e) => patchSelected({ overlayColor: e.target.value })}
                        aria-label="텍스트 색상"
                      />
                    </label>
                  </div>
                  <label className="showcase-photo-editor__field">
                    <span>크기 {overlay.overlayFontSize}px</span>
                    <input
                      type="range"
                      min={14}
                      max={56}
                      value={overlay.overlayFontSize}
                      onChange={(e) => patchSelected({ overlayFontSize: Number(e.target.value) })}
                    />
                  </label>
                  <div className="showcase-photo-editor__presets" role="group" aria-label="텍스트 위치">
                    {OVERLAY_POS_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`showcase-photo-editor__preset${
                          overlay.overlayX === p.x && overlay.overlayY === p.y ? " is-active" : ""
                        }`}
                        onClick={() => patchSelected({ overlayX: p.x, overlayY: p.y })}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label className="showcase-photo-editor__field">
                    <span>애니메이션</span>
                    <select
                      value={overlay.overlayAnim}
                      onChange={(e) => patchSelected({ overlayAnim: e.target.value })}
                    >
                      {SHOWCASE_TEXT_ANIMS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="showcase-photo-editor__field">
                    <span>테두리</span>
                    <select
                      value={overlay.overlayBorder}
                      onChange={(e) => patchSelected({ overlayBorder: e.target.value })}
                    >
                      {SHOWCASE_TEXT_BORDERS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
          </div>
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
              삭제
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

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
