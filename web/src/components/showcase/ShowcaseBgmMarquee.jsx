import { useEffect, useRef } from "react";
import { resolveShowcaseBgmLabel } from "../../lib/showcase/showcaseYoutube.js";

/** 통화 중 BGM 제목 마키 자막 */
export default function ShowcaseBgmMarquee({ styleConfig, visible = true, className = "" }) {
  const trackRef = useRef(null);
  const label = resolveShowcaseBgmLabel(styleConfig);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !label) return;
    el.style.setProperty("--marquee-duration", `${Math.max(8, label.length * 0.35)}s`);
  }, [label]);

  if (!visible || !label) return null;

  return (
    <div className={`showcase-bgm-marquee ${className}`.trim()} role="status" aria-live="polite">
      <div className="showcase-bgm-marquee__inner">
        <span ref={trackRef} className="showcase-bgm-marquee__track">
          🎵 현재 설정된 BGM: {label}
          <span className="showcase-bgm-marquee__gap" aria-hidden>
            ···
          </span>
          🎵 현재 설정된 BGM: {label}
        </span>
      </div>
    </div>
  );
}
