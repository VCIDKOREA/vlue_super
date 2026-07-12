import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { SHOWCASE_MAX_PHOTOS } from "../../lib/showcase/showcaseStyleStorage.js";
import { maxShowcasePhotosForTier } from "../../lib/showcase/tentShowcaseTypes.js";

/**
 * 인스타·카톡식 사진 그리드 — 빈 칸 탭으로 추가, 사진 탭으로 삭제/교체
 * 무료: 1장 · 유료: 최대 10장
 */
export default function ShowcasePhotoEditor({
  photos = [],
  onChange,
  membershipTier = "paid",
  maxPhotos
}) {
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const [replaceId, setReplaceId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const limit = Math.max(1, Number(maxPhotos) || maxShowcasePhotosForTier(membershipTier) || SHOWCASE_MAX_PHOTOS);
  const selected = photos.find((p) => p.id === selectedId) || null;
  const canAdd = photos.length < limit;
  const cells = canAdd ? [...photos, null] : photos;

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
    for (const file of files.slice(0, limit - next.length)) {
      if (!/^image\//i.test(file.type)) continue;
      next.push({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: await readAsDataUrl(file),
        caption: "",
        overlayText: "",
        overlayFont: "pretendard",
        emojiStickers: []
      });
      if (next.length >= limit) break;
    }
    onChange(next.slice(0, limit));
  };

  const removePhoto = (id) => {
    onChange(photos.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="showcase-photo-editor showcase-photo-editor--grid">
      <div className="showcase-photo-editor__intro">
        <p className="showcase-photo-editor__title">사진</p>
        <p className="showcase-photo-editor__count">
          {photos.length}/{limit}
          {limit >= 10 ? " · 최대 10장" : " · 무료 1장"}
        </p>
      </div>
      <p className="showcase-photo-editor__hint">빈 칸을 눌러 추가 · 사진을 눌러 바꾸거나 삭제</p>

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
          <div className="showcase-photo-editor__sheet-preview">
            <img src={selected.url} alt="" />
          </div>
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={limit > 1}
        className="sr-only"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="sr-only"
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
