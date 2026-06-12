import { useCallback, useEffect, useRef, useState } from "react";
import SourcingPhotoGrid from "./SourcingPhotoGrid.jsx";
import { isEmbeddableVideoUrl } from "../../../lib/embedVideo.js";
import ExternalEmbedPlayer from "../ExternalEmbedPlayer.jsx";
import { fetchVideoUploadStatus, uploadVideoDirectToCdn } from "../../../lib/directVideoUpload.js";

/**
 * 사진 + 하이브리드 동영상 (파일 CDN 직접 업로드 | 외부 링크)
 */
export default function SourcingUnifiedMediaSection({
  previews,
  onPreviewsChange,
  onPickGalleryFiles,
  videoUrl,
  onVideoUrlChange,
  onToast,
  isDarkMode = false
}) {
  const [videoMode, setVideoMode] = useState("file");
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [cdnReady, setCdnReady] = useState(null);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const sub = isDarkMode ? "text-gray-400" : "text-slate-500";
  const inputCls = isDarkMode
    ? "w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2.5 text-[13px] text-gray-100 outline-none placeholder:text-gray-500"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none";

  const embedOk = isEmbeddableVideoUrl(videoUrl);

  useEffect(() => {
    fetchVideoUploadStatus()
      .then((s) => setCdnReady(s.configured))
      .catch(() => setCdnReady(false));
  }, []);

  const runFileUpload = useCallback(
    async (file) => {
      if (!file) return;
      setUploadError("");
      setUploading(true);
      setUploadPct(0);
      try {
        const publicUrl = await uploadVideoDirectToCdn(file, setUploadPct);
        onVideoUrlChange(publicUrl);
        onToast?.("영상이 CDN에 업로드되었습니다. 서버 저장 없이 URL만 등록됩니다.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "영상 업로드에 실패했습니다.";
        setUploadError(msg);
        if (msg.includes("설정되지 않")) {
          setVideoMode("link");
        }
      } finally {
        setUploading(false);
      }
    },
    [onVideoUrlChange, onToast]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropRef.current?.classList.remove("ring-2", "ring-violet-400");
      const file = e.dataTransfer?.files?.[0];
      if (file) runFileUpload(file);
    },
    [runFileUpload]
  );

  const tabCls = (active) =>
    `flex-1 rounded-lg py-2 text-[11px] font-black ${
      active
        ? "bg-violet-600 text-white"
        : isDarkMode
          ? "bg-white/5 text-gray-400"
          : "bg-slate-100 text-slate-600"
    }`;

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>상품 사진</p>
        <p className={`mt-0.5 text-[11px] ${sub}`}>최대 10장 · 노출 시 갤러리로 분리 표시</p>
        <div className="mt-2">
          <SourcingPhotoGrid
            previews={previews}
            onChange={onPreviewsChange}
            onPickFiles={onPickGalleryFiles}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      <div>
        <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>설명 영상</p>
        <p className={`mt-0.5 text-[11px] leading-relaxed ${sub}`}>
          파일 직접 업로드(CDN) 또는 YouTube · Vimeo · TikTok 링크. 재생 트래픽은 외부 인프라가 부담합니다.
        </p>

        <div className="mt-2 flex gap-1.5">
          <button type="button" className={tabCls(videoMode === "file")} onClick={() => setVideoMode("file")}>
            파일 업로드
          </button>
          <button type="button" className={tabCls(videoMode === "link")} onClick={() => setVideoMode("link")}>
            외부 링크
          </button>
        </div>

        {videoMode === "file" ? (
          <div className="mt-2 space-y-2">
            <div
              ref={dropRef}
              role="button"
              tabIndex={0}
              onDragOver={(e) => {
                e.preventDefault();
                dropRef.current?.classList.add("ring-2", "ring-violet-400");
              }}
              onDragLeave={() => dropRef.current?.classList.remove("ring-2", "ring-violet-400")}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
                isDarkMode ? "border-white/20 bg-[#0f1218]" : "border-slate-300 bg-slate-50"
              }`}
            >
              <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
                mp4 · mov · webm 끌어다 놓기
              </p>
              <p className={`mt-1 text-[11px] ${sub}`}>또는 탭하여 선택 (최대 5GB · CDN 직접 업로드)</p>
              {cdnReady === false ? (
                <p className="mt-2 text-[11px] font-semibold text-amber-600">
                  CDN 미설정 — 외부 링크 탭을 이용해 주세요
                </p>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                runFileUpload(file);
              }}
            />
            {uploading ? (
              <div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? "bg-white/10" : "bg-slate-200"}`}>
                  <div className="h-full bg-violet-600 transition-all" style={{ width: `${uploadPct}%` }} />
                </div>
                <p className={`mt-1 text-center text-[11px] font-bold ${sub}`}>CDN 업로드 중… {uploadPct}%</p>
              </div>
            ) : null}
            {uploadError ? <p className="text-[11px] font-semibold text-rose-600">{uploadError}</p> : null}
          </div>
        ) : (
          <div className="mt-2">
            <input
              value={videoUrl}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              placeholder="YouTube / Vimeo / TikTok / Instagram Live / m3u8 URL"
              className={inputCls}
            />
            {videoUrl && !embedOk ? (
              <p className="mt-1 text-[11px] font-semibold text-amber-600">
                지원: YouTube, Vimeo, TikTok, mp4/mov CDN URL
              </p>
            ) : null}
          </div>
        )}

        {videoUrl ? (
          <div className="mt-3 space-y-2">
            <ExternalEmbedPlayer videoUrl={videoUrl} title="등록 미리보기 영상" />
            <button
              type="button"
              onClick={() => onVideoUrlChange("")}
              className={`w-full rounded-lg border py-2 text-[11px] font-bold ${
                isDarkMode ? "border-white/15 text-gray-300" : "border-slate-200 text-slate-600"
              }`}
            >
              영상 제거
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
