import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createMycase, patchMycase } from "../../lib/mycaseApi.js";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import {
  MYCASE_FEED_CATEGORIES,
  MYCASE_FEED_MAX_IMAGES,
  buildFeedPostPayloadJson,
  parseMycasePostPayload
} from "../../lib/mycase/mycasePostPayload.js";
import { notifyMycaseFeedMutated } from "../../lib/mycase/mycaseFeedEvents.js";
import { readSelectedDccLineId } from "../../lib/dccLineState.js";
import AppFullScreenView from "../AppFullScreenView.jsx";
import ShowcasePhotoEditor from "../showcase/ShowcasePhotoEditor.jsx";
import "../showcase/showcase-style-settings.css";
import "../../styles/showcase-call-glass.css";
import "./my-case-composer.css";

export default function MyCasePostComposer({
  open,
  onClose,
  onToast,
  onCreated,
  layout = "mobile",
  editTarget = null
}) {
  const isWebDesktop = layout === "desktop";
  const [category, setCategory] = useState("daily");
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const membershipTier = useMemo(() => readMembershipTier(), [open]);
  const isEdit = Boolean(editTarget?.caseId);

  useEffect(() => {
    if (!open) return;
    if (editTarget?.caseId) {
      const parsed = parseMycasePostPayload(editTarget.payloadJson, editTarget.item);
      setCategory(parsed.category || "daily");
      setCaption(parsed.caption || editTarget.item?.title || "");
      setImages(Array.isArray(parsed.images) ? parsed.images : []);
      return;
    }
    setCategory("daily");
    setCaption("");
    setImages([]);
  }, [open, editTarget?.caseId, editTarget?.payloadJson, editTarget?.item]);

  useEffect(() => {
    if (!open || !isWebDesktop || typeof document === "undefined") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isWebDesktop]);

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

      if (isEdit) {
        const res = await patchMycase(editTarget.caseId, {
          title,
          thumbnailUrl: images[0]?.url || null,
          payloadJson,
          isPublic: true
        });
        if (!res.ok) {
          onToast?.(res.message || "게시물 수정에 실패했습니다.");
          return;
        }
        onToast?.("게시물을 수정했습니다.");
        notifyMycaseFeedMutated();
        onCreated?.(res.item);
        onClose?.();
        return;
      }

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
      notifyMycaseFeedMutated();
      setCaption("");
      setImages([]);
      setCategory("daily");
      onCreated?.(res.item);
      onClose?.();
    } finally {
      setBusy(false);
    }
  }, [images, category, caption, onToast, onCreated, onClose, isEdit, editTarget?.caseId]);

  if (!open) return null;

  const shell = (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title={isEdit ? "게시물 수정" : "새 게시물"}
      reserveBottomNav={!isWebDesktop}
      className={`bg-white my-case-composer-shell${isWebDesktop ? " my-case-composer-shell--web" : ""}`}
    >
      <div className="my-case-composer-viewport">
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
            rows={3}
            value={caption}
            placeholder="게시물 설명 (선택)"
            onChange={(e) => setCaption(e.target.value)}
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
          사진을 탭하면 쇼케이스와 같이 문구·글꼴·색·위치를 꾸밀 수 있습니다. 썸네일 좌상단을
          드래그해 순서를 바꿀 수 있습니다. 게시물당 최대 {MYCASE_FEED_MAX_IMAGES}장 · 통화
          쇼케이스 송출용 사진은 게시물에서 따로 선택합니다.
        </p>

        <button type="button" className="my-case-composer__submit" disabled={busy} onClick={() => void submit()}>
          {busy ? "저장 중…" : isEdit ? "수정 저장" : "게시물 등록"}
        </button>
        </div>
      </div>
    </AppFullScreenView>
  );

  if (isWebDesktop && typeof document !== "undefined") {
    return createPortal(shell, document.body);
  }
  return shell;
}

function mycaseCategoryLabelFallback(category) {
  return MYCASE_FEED_CATEGORIES.find((c) => c.id === category)?.label || "케이스함";
}
