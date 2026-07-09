import { Volume2, VolumeX } from "lucide-react";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

/** 인스타 릴스 스타일 Mute/Unmute */
export default function ShowcaseBgmMuteButton({ className = "" }) {
  const { canToggleMute, effectiveMuted, toggleMute } = useShowcaseBgm();

  if (!canToggleMute) return null;

  return (
    <button
      type="button"
      className={`showcase-bgm-mute ${className}`.trim()}
      onClick={toggleMute}
      aria-label={effectiveMuted ? "음소거 해제" : "음소거"}
      aria-pressed={effectiveMuted}
    >
      {effectiveMuted ? <VolumeX size={18} strokeWidth={2.2} /> : <Volume2 size={18} strokeWidth={2.2} />}
    </button>
  );
}
