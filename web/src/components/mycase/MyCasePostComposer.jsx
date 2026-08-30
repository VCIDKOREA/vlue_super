import { useCallback, useMemo, useState } from "react";
import { createMycase } from "../../lib/mycaseApi.js";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import {
  MYCASE_FEED_CATEGORIES,
  MYCASE_FEED_MAX_IMAGES,
  buildFeedPostPayloadJson
} from "../../lib/mycase/mycasePostPayload.js";
import { readSelectedDccLineId } from "../../lib/dccLineState.js";
import AppFullScreenView from "../AppFullScreenView.jsx";
import ShowcasePhotoEditor from "../showcase/ShowcasePhotoEditor.jsx";
import "../showcase/showcase-style-settings.css";
import "../../styles/showcase-call-glass.css";
import "./my-case-composer.css";

export default function MyCasePostComposer({ open, onClose, onToast, onCreated }) {
  const [category, setCategory] = useState("daily");
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const membershipTier = useMemo(() => readMembershipTier(), [open]);

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
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title="새 게시물"
      reserveBottomNav
      className="bg-white"
    >
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

        <div className="my-case-composer__photos">
          <ShowcasePhotoEditor
            photos={images}
            onChange={setImages}
            membershipTier={membershipTier}
            maxPhotos={MYCASE_FEED_MAX_IMAGES}
            enableTextOverlay
          />
        </div>

        <p className="my-case-composer__hint">
          사진을 탭하면 쇼케이스와 같이 문구·글꼴·색·위치를 꾸밀 수 있습니다. 게시물당 최대{" "}
          {MYCASE_FEED_MAX_IMAGES}장 · 통화 쇼케이스 송출용 사진은 게시물에서 따로 선택합니다.
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
