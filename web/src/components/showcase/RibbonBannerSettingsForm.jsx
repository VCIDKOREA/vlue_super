import { useEffect, useRef, useState } from "react";
import {
  clearRibbonBanner,
  readRibbonBanner,
  writeRibbonBanner
} from "../../lib/showcase/ribbonBannerStorage.js";

/**
 * 유료 회원 전용 — 빅푸시 하단 띠배너 이미지·링크 등록.
 */
export default function RibbonBannerSettingsForm({ isDarkMode = false, onToast }) {
  const [draft, setDraft] = useState(() => readRibbonBanner());
  const fileRef = useRef(null);
  const inputCls = isDarkMode
    ? "border-white/10 bg-white/5 text-gray-100"
    : "border-slate-200 bg-white text-slate-900";

  useEffect(() => {
    setDraft(readRibbonBanner());
  }, []);

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast?.("이미지 파일만 등록할 수 있습니다.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      onToast?.("이미지는 1.5MB 이하로 등록해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result || "");
      if (!imageUrl.startsWith("data:image/")) {
        onToast?.("이미지를 읽지 못했습니다.");
        return;
      }
      setDraft((prev) => ({ ...prev, imageUrl }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const next = writeRibbonBanner({
      imageUrl: draft.imageUrl,
      linkUrl: draft.linkUrl
    });
    setDraft(next);
    onToast?.(
      next.imageUrl
        ? "띠배너가 저장됐습니다. 미등록 시 AdMob으로 자동 전환됩니다."
        : "띠배너 이미지를 등록하면 노출됩니다. 현재는 AdMob으로 표시됩니다."
    );
  };

  const clear = () => {
    const next = clearRibbonBanner();
    setDraft(next);
    onToast?.("커스텀 띠배너를 지웠습니다. AdMob 띠배너가 표시됩니다.");
  };

  return (
    <section
      className={`showcase-ribbon-settings rounded-2xl border p-3 ${
        isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
      }`}
      aria-label="빅푸시 띠배너 등록"
    >
      <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
        빅푸시 하단 띠배너 (유료)
      </p>
      <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        설정에서만 미리보는 커스텀 이미지입니다. 빅푸시·통화 화면 아래에는 광고가 붙지 않으며, 홈 하단 고정
        배너만 노출됩니다.
      </p>

      <div
        className={`mt-2 flex h-[50px] items-center justify-center overflow-hidden rounded-lg border ${
          isDarkMode ? "border-white/10 bg-black/30" : "border-slate-200 bg-white"
        }`}
      >
        {draft.imageUrl ? (
          <img src={draft.imageUrl} alt="띠배너 미리보기" className="h-full w-full object-cover" />
        ) : (
          <span className={`text-[10px] font-bold ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
            미리보기 · 미등록 시 AdMob
          </span>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-black text-white active:scale-[0.98]"
          onClick={() => fileRef.current?.click()}
        >
          이미지 선택
        </button>
        <button
          type="button"
          className={`rounded-lg border px-3 py-2 text-[11px] font-bold active:scale-[0.98] ${inputCls}`}
          onClick={clear}
        >
          삭제 · AdMob
        </button>
      </div>

      <label className={`mt-2 block text-[10px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        연결 링크 (선택)
        <input
          type="url"
          inputMode="url"
          placeholder="https://"
          value={draft.linkUrl}
          onChange={(e) => setDraft((prev) => ({ ...prev, linkUrl: e.target.value }))}
          className={`mt-1 w-full rounded-lg border px-2.5 py-2 text-[12px] outline-none ${inputCls}`}
        />
      </label>

      <button
        type="button"
        className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-[12px] font-black text-white active:scale-[0.99]"
        onClick={save}
      >
        띠배너 저장
      </button>
    </section>
  );
}
