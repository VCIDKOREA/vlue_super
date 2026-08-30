import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createMycase } from "../../lib/mycaseApi.js";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import {
  MYCASE_FEED_CATEGORIES,
  MYCASE_FEED_MAX_IMAGES,
  buildFeedPostPayloadJson
} from "../../lib/mycase/mycasePostPayload.js";
import { readSelectedDccLineId } from "../../lib/dccLineState.js";
import AppFullScreenView from "../AppFullScreenView.jsx";
import "./my-case-composer.css";

export default function MyCasePostComposer({ open, onClose, onToast, onCreated }) {
  const [category, setCategory] = useState("daily");
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = MYCASE_FEED_MAX_IMAGES - images.length;
    if (room <= 0) {
      onToast?.(`게시물당 최대 ${MYCASE_FEED_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded = [];
      for (const file of files.slice(0, room)) {
        const res = await compressAndUploadMediaImageOrThrow(file, "showcase");
        const url = String(res.url || "").trim();
        if (url) uploaded.push({ id: `feed-${Date.now()}-${uploaded.length}`, url });
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, MYCASE_FEED_MAX_IMAGES));
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "사진 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = (id) => setImages((prev) => prev.filter((x) => x.id !== id));

  const submit = useCallback(async () => {
    if (!images.length) {
      onToast?.("사진을 1장 이상 추가해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const lineId = readSelectedDccLineId();
      const payloadJson = buildFeedPostPayloadJson({
        category,
        caption: caption || mycaseCategoryLabelFallback(category),
        images,
        lineId
      });
      const title =
        String(caption || "").trim().slice(0, 40) ||
        MYCASE_FEED_CATEGORIES.find((c) => c.id === category)?.label ||
        "케이스함";
      const res = await createMycase({
        title,
        thumbnailUrl: images[0]?.url || null,
        payloadJson,
        isPublic: true
      });
      if (!res.ok) {
        onToast?.(res.message || "게시물 저장에 실패했습니다.");
        return;
      }
      onToast?.("게시물이 케이스함에 등록되었습니다.");
      setCaption("");
      setImages([]);
      setCategory("daily");
      onCreated?.(res.item);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }, [images, category, caption, onToast, onCreated, onClose]);

  if (!open) return null;

  return (
    <AppFullScreenView open={open} onClose={onClose} title="새 게시물" className="bg-white">
      <div className="my-case-composer">
        <div className="my-case-composer__cats">
          {MYCASE_FEED_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`my-case-composer__cat${category === c.id ? " is-active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="my-case-composer__label">
          설명
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="게시물 설명을 입력하세요"
            rows={3}
            maxLength={2000}
          />
        </label>

        <div className="my-case-composer__grid">
          {images.map((img) => (
            <div key={img.id} className="my-case-composer__cell">
              <img src={img.url} alt="" />
              <button type="button" className="my-case-composer__remove" onClick={() => removeImage(img.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < MYCASE_FEED_MAX_IMAGES ? (
            <button
              type="button"
              className="my-case-composer__add"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? <Loader2 className="animate-spin" size={22} /> : <ImagePlus size={28} strokeWidth={1.5} />}
              <span>{images.length}/{MYCASE_FEED_MAX_IMAGES}</span>
            </button>
          ) : null}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />

        <p className="my-case-composer__hint">
          게시물당 최대 {MYCASE_FEED_MAX_IMAGES}장 · 통화 쇼케이스 송출용 사진은 게시물에서 따로 선택합니다.
        </p>

        <button type="button" className="my-case-composer__submit" disabled={busy} onClick={() => void submit()}>
          {busy ? "저장 중…" : "게시물 등록"}
        </button>
      </div>
    </AppFullScreenView>
  );
}

function mycaseCategoryLabelFallback(category) {
  return MYCASE_FEED_CATEGORIES.find((c) => c.id === category)?.label || "케이스함";
}
