import { useEffect, useRef } from "react";
import { resolveShowcaseBgmLabel } from "../../lib/showcase/showcaseYoutube.js";

/** 통화·미리보기 BGM 제목 마키 */
export default function ShowcaseBgmMarquee({
  styleConfig,
  visible = true,
  className = "",
  /** true: 🎵제목 — compact 슬라이드 바용 */
  compact = false
}) {
  const trackRef = useRef(null);
  const label = resolveShowcaseBgmLabel(styleConfig);
  const line = compact ? `🎵${label}` : `🎵 현재 설정된 BGM: ${label}`;

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !label) return;
    el.style.setProperty("--marquee-duration", `${Math.max(8, label.length * 0.35)}s`);
  }, [label]);

  if (!visible || !label) return null;

  return (
    <div className={`showcase-bgm-marquee${compact ? " showcase-bgm-marquee--compact" : ""} ${className}`.trim()} role="status" aria-live="polite">
      <div className="showcase-bgm-marquee__inner">
        <span ref={trackRef} className="showcase-bgm-marquee__track">
          {line}
          <span className="showcase-bgm-marquee__gap" aria-hidden>
            ···
          </span>
          {line}
        </span>
      </div>
    </div>
  );
}
