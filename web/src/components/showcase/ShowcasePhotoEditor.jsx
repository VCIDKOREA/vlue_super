import { useRef } from "react";
import { ImagePlus, Sticker, Type } from "lucide-react";
import { SHOWCASE_FONT_SETS } from "../../lib/showcase/showcaseStyleTypes.js";
import { SHOWCASE_MAX_PHOTOS } from "../../lib/showcase/showcaseStyleStorage.js";
import { maxShowcasePhotosForTier } from "../../lib/showcase/tentShowcaseTypes.js";

const EMOJI_PICKS = ["😀", "🚀", "🔥", "✨", "💙", "☕", "🎵", "📸", "💼", "🌸"];

/**
 * 갤러리 멀티 선택 + 사진 꾸미기 (폰트·이모지 스티커)
 * 무료: 1장 · 유료: 최대 10장
 */
export default function ShowcasePhotoEditor({
  photos = [],
  onChange,
  inputCls = "",
  membershipTier = "paid",
  maxPhotos
}) {
  const fileRef = useRef(null);
  const limit = Math.max(1, Number(maxPhotos) || maxShowcasePhotosForTier(membershipTier) || SHOWCASE_MAX_PHOTOS);

  const onFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, limit - photos.length);
    if (!files.length) return;
    const next = [...photos];
    for (const file of files) {
      if (!/^image\//i.test(file.type)) continue;
      const url = await readAsDataUrl(file);
      next.push({
        id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        caption: "",
        overlayText: "",
        overlayFont: "pretendard",
        emojiStickers: []
      });
      if (next.length >= limit) break;
    }
    onChange(next.slice(0, limit));
  };

  const updatePhoto = (id, patch) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addSticker = (photoId, emoji) => {
    const p = photos.find((x) => x.id === photoId);
    if (!p) return;
    const stickers = [
      ...(p.emojiStickers || []),
      { id: `st-${Date.now()}`, emoji, x: 20 + Math.random() * 50, y: 20 + Math.random() * 40 }
    ];
    updatePhoto(photoId, { emojiStickers: stickers });
  };

  const removePhoto = (id) => onChange(photos.filter((p) => p.id !== id));

  return (
    <div className="showcase-photo-editor">
      <div className="showcase-photo-editor__header">
        <p className="showcase-photo-editor__count">
          <ImagePlus size={14} aria-hidden /> 사진 {photos.length}/{limit}
        </p>
        {photos.length < limit ? (
          <button type="button" className="showcase-photo-editor__add" onClick={() => fileRef.current?.click()}>
            갤러리에서 추가
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={limit > 1}
          className="sr-only"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="showcase-photo-editor__list">
        {photos.map((p) => (
          <div key={p.id} className="showcase-photo-editor__item">
            <img src={p.url} alt="" className="showcase-photo-editor__thumb" />
            <div className="showcase-photo-editor__fields">
              <label className="showcase-photo-editor__field">
                <Type size={12} aria-hidden />
                <select
                  className={`showcase-style-settings__input ${inputCls}`}
                  value={p.overlayFont || "pretendard"}
                  onChange={(e) => updatePhoto(p.id, { overlayFont: e.target.value })}
                >
                  {SHOWCASE_FONT_SETS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <input
                className={`showcase-style-settings__input ${inputCls}`}
                placeholder="사진 위 텍스트 (이모지 😀🚀🔥 가능)"
                value={p.overlayText || ""}
                onChange={(e) => updatePhoto(p.id, { overlayText: e.target.value })}
              />
              <div className="showcase-photo-editor__emoji-row">
                <Sticker size={12} aria-hidden />
                {EMOJI_PICKS.map((em) => (
                  <button key={em} type="button" className="showcase-photo-editor__emoji" onClick={() => addSticker(p.id, em)}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="showcase-photo-editor__remove" onClick={() => removePhoto(p.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>
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
