import { useEffect, useState } from "react";
import {
  hasCustomRibbonBanner,
  readRibbonBanner,
  RIBBON_BANNER_CHANGED_EVENT
} from "../../lib/showcase/ribbonBannerStorage.js";

const RIBBON_H = 50;

/**
 * 유료 커스텀 띠배너 미리보기 전용 — AdMob 없음.
 * 빅푸시/통화 UI에는 붙이지 않는다. 설정 화면에서만 사용.
 */
export default function ShowcaseRibbonBanner({ className = "" }) {
  const [custom, setCustom] = useState(() => readRibbonBanner());

  useEffect(() => {
    const sync = () => setCustom(readRibbonBanner());
    window.addEventListener(RIBBON_BANNER_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(RIBBON_BANNER_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!hasCustomRibbonBanner(custom)) {
    return (
      <div
        className={`showcase-ribbon-banner flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 ${className}`.trim()}
        style={{ height: RIBBON_H, minHeight: RIBBON_H }}
      >
        <span className="text-[10px] font-bold text-slate-400">커스텀 띠배너 미등록</span>
      </div>
    );
  }

  const href = String(custom.linkUrl || "").trim();
  const img = (
    <img src={custom.imageUrl} alt="등록 배너" className="h-full w-full object-cover" draggable={false} />
  );
  return (
    <div
      className={`showcase-ribbon-banner showcase-ribbon-banner--custom overflow-hidden rounded-lg ${className}`.trim()}
      style={{ height: RIBBON_H, minHeight: RIBBON_H }}
      data-vlue-ribbon="custom"
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
