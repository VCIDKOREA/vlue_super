import { useRef } from "react";
import SourcingPhotoGrid from "./SourcingPhotoGrid.jsx";

export default function SourcingMediaSection({
  listingType,
  onListingTypeChange,
  previews,
  onPreviewsChange,
  onPickGalleryFiles,
  mediaPrimary,
  onMediaPrimaryChange,
  onPickMediaFile,
  isDarkMode = false
}) {
  const mediaFileRef = useRef(null);
  const sub = isDarkMode ? "text-gray-400" : "text-slate-500";
  const tabCls = (active) =>
    `flex-1 rounded-lg py-2 text-[11px] font-black ${
      active
        ? isDarkMode
          ? "bg-violet-600 text-white"
          : "bg-violet-600 text-white"
        : isDarkMode
          ? "bg-white/5 text-gray-400"
          : "bg-slate-100 text-slate-600"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <button type="button" className={tabCls(listingType === "photo_gallery")} onClick={() => onListingTypeChange("photo_gallery")}>
          갤러리 (사진 최대 10장)
        </button>
        <button type="button" className={tabCls(listingType === "media_single")} onClick={() => onListingTypeChange("media_single")}>
          미디어 (1개)
        </button>
      </div>

      {listingType === "photo_gallery" ? (
        <SourcingPhotoGrid
          previews={previews}
          onChange={onPreviewsChange}
          onPickFiles={onPickGalleryFiles}
          isDarkMode={isDarkMode}
        />
      ) : (
        <div
          className={`rounded-2xl border p-3 ${
            isDarkMode ? "border-white/10 bg-[#0f1218]" : "border-slate-200 bg-gray-50"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>미디어</p>
              <p className={`mt-0.5 text-[11px] ${sub}`}>사진 또는 동영상 1개 (인스타그램 스타일)</p>
            </div>
            <label
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-black text-white active:scale-[0.98] ${
                isDarkMode ? "bg-gray-100 text-gray-900" : "bg-gray-900"
              }`}
            >
              갤러리
              <input
                ref={mediaFileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const primary = await onPickMediaFile(file);
                    onMediaPrimaryChange(primary);
                  } catch {
                    /* parent shows error */
                  }
                }}
              />
            </label>
          </div>
          <div
            className={`mt-3 aspect-square w-full max-h-52 overflow-hidden rounded-xl ${
              isDarkMode ? "bg-black/30" : "bg-black/5"
            }`}
          >
            {mediaPrimary?.url ? (
              mediaPrimary.type === "video" ? (
                <video src={mediaPrimary.url} controls className="h-full w-full object-cover" />
              ) : (
                <img src={mediaPrimary.url} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <div className={`flex h-full min-h-[140px] flex-col items-center justify-center gap-1 text-[11px] ${sub}`}>
                <span>미리보기</span>
              </div>
            )}
          </div>
          {mediaPrimary?.url ? (
            <button
              type="button"
              onClick={() => onMediaPrimaryChange(null)}
              className={`mt-2 w-full rounded-lg border py-2 text-[11px] font-bold ${
                isDarkMode ? "border-white/15 text-gray-300" : "border-slate-200 text-slate-600"
              }`}
            >
              미디어 삭제
            </button>
          ) : null}
          <p className={`mt-2 text-[10px] ${sub}`}>영상은 12MB 이하 · 사진은 1MB 이하 자동 압축</p>
        </div>
      )}
    </div>
  );
}
