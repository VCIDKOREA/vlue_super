import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import { resolvePlaylistTracks } from "../../lib/showcase/showcaseBgmPresets.js";

/**
 * BGM 전송 컨트롤 — 복수곡 ◀ ∥ ▶ / 단곡 ◁ ∥ ▷ (스킵 비활성)
 * 가운데 = 일시정지/재생. 안 나오고 있으면 ▶ 탭 시 재생 강제.
 */
export default function ShowcaseBgmTransport({ className = "", styleConfig = null }) {
  const {
    bgmUrl,
    canSkipTracks,
    isAudible,
    toggleUserMute,
    skipPrev,
    skipNext,
    tracks
  } = useShowcaseBgm();

  const propTracks = resolvePlaylistTracks(styleConfig?.bgm);
  const trackCount = Math.max(tracks?.length || 0, propTracks.length);
  const hasBgm =
    Boolean(bgmUrl) ||
    trackCount > 0 ||
    Boolean(styleConfig?.bgm && styleConfig.bgm.mode !== "none" && !styleConfig.bgm.linkBroken);

  if (!hasBgm) return null;

  const skipEnabled = canSkipTracks || trackCount > 1;
  const paused = !isAudible;
  const prevGlyph = skipEnabled ? "◀" : "◁";
  const nextGlyph = skipEnabled ? "▶" : "▷";
  const midGlyph = paused ? "▶" : "∥";

  return (
    <div
      className={`showcase-bgm-transport ${className}`.trim()}
      role="group"
      aria-label="배경음악 재생 제어"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`showcase-bgm-transport__btn${skipEnabled ? "" : " is-disabled"}`}
        aria-label="이전 곡"
        disabled={!skipEnabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (skipEnabled) skipPrev?.();
        }}
      >
        {prevGlyph}
      </button>
      <button
        type="button"
        className="showcase-bgm-transport__btn showcase-bgm-transport__btn--main"
        aria-label={paused ? "재생" : "일시정지"}
        onPointerUp={(e) => {
          /* 모바일 WebView: click 보다 pointerup 이 안정적 */
          e.preventDefault();
          e.stopPropagation();
          void toggleUserMute?.(styleConfig);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {midGlyph}
      </button>
      <button
        type="button"
        className={`showcase-bgm-transport__btn${skipEnabled ? "" : " is-disabled"}`}
        aria-label="다음 곡"
        disabled={!skipEnabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (skipEnabled) skipNext?.();
        }}
      >
        {nextGlyph}
      </button>
    </div>
  );
}
