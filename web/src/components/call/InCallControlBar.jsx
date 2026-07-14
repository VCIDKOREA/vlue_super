import { useCallback, useState } from "react";
import { Mic, MicOff, PhoneOff, Grid3X3, Volume2 } from "lucide-react";
import {
  nativeEndCallKeepOverlay,
  nativeRevealSystemCallUi,
  nativeSetMicrophoneMute,
  nativeSetSpeakerphoneOn,
  hasNativeAudioControl
} from "../../lib/call/nativeCallControl.js";

/**
 * 하단 고정 통화 제어 — 키패드는 상위(명함 자리)에서 렌더
 */
export default function InCallControlBar({
  platform = "android",
  onEnd,
  brandAccent = "#3B82F6",
  className = "",
  showEndButton = true,
  endLabel = "종료",
  demoMode = false,
  /** 제어형 키패드 (명함 자리 교체용) */
  keypadOpen = false,
  onKeypadOpenChange
}) {
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [demoToast, setDemoToast] = useState("");
  const audioReady =
    !demoMode && (hasNativeAudioControl() || platform === "android" || platform === "ios");

  const flashDemo = (msg) => {
    if (!demoMode) return;
    setDemoToast(msg);
    window.setTimeout(() => setDemoToast(""), 1600);
  };

  const handleEnd = useCallback(() => {
    if (demoMode) {
      flashDemo("미리보기입니다. 실제 통화에서 종료됩니다.");
      onEnd?.();
      return;
    }
    nativeEndCallKeepOverlay();
    onEnd?.();
  }, [onEnd, demoMode]);

  const toggleMute = () => {
    const next = !muted;
    if (!demoMode) nativeSetMicrophoneMute(next);
    else flashDemo(next ? "마이크 끔 (미리보기)" : "마이크 켬 (미리보기)");
    setMuted(next);
  };

  const toggleSpeaker = () => {
    const next = !speaker;
    if (!demoMode) nativeSetSpeakerphoneOn(next);
    else flashDemo(next ? "스피커폰 (미리보기)" : "스피커 끔 (미리보기)");
    setSpeaker(next);
  };

  const toggleKeypad = () => {
    onKeypadOpenChange?.(!keypadOpen);
  };

  const onSwipeUpHint = () => {
    if (platform !== "ios") return;
    setIosHint(true);
    if (!demoMode) nativeRevealSystemCallUi();
    window.setTimeout(() => setIosHint(false), 3200);
  };

  return (
    <div
      className={`incall-control-bar ${className}`.trim()}
      data-platform={platform}
      data-demo={demoMode ? "1" : "0"}
    >
      {platform === "ios" ? (
        <button
          type="button"
          className="incall-control-bar__ios-swipe"
          onClick={onSwipeUpHint}
          aria-label="위로 올려 순정 통화 화면 보기"
        >
          <span className="incall-control-bar__ios-chevron" aria-hidden />
          <span>위로 올려 ARS·녹음 등 순정 통화 기능 사용</span>
        </button>
      ) : null}
      {iosHint ? (
        <p className="incall-control-bar__ios-toast" role="status">
          순정 통화 화면으로 전환했습니다. 다시 내리면 쇼케이스로 돌아갑니다.
        </p>
      ) : null}
      {demoToast ? (
        <p className="incall-control-bar__ios-toast" role="status">
          {demoToast}
        </p>
      ) : null}

      <div
        className={`incall-control-bar__row${showEndButton ? "" : " incall-control-bar__row--three"}`}
      >
        <button
          type="button"
          className={`incall-control-bar__btn${keypadOpen ? " is-active" : ""}`}
          onClick={toggleKeypad}
          aria-pressed={keypadOpen}
          aria-label="키패드"
        >
          <Grid3X3 size={20} />
          <span>키패드</span>
        </button>
        <button
          type="button"
          className={`incall-control-bar__btn${muted ? " is-active" : ""}`}
          onClick={toggleMute}
          disabled={!demoMode && !audioReady}
          aria-pressed={muted}
          aria-label={muted ? "마이크 켜기" : "음소거"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
          <span>음소거</span>
        </button>
        <button
          type="button"
          className={`incall-control-bar__btn${speaker ? " is-active" : ""}`}
          style={speaker ? { color: brandAccent, borderColor: brandAccent } : undefined}
          onClick={toggleSpeaker}
          disabled={!demoMode && !audioReady}
          aria-pressed={speaker}
          aria-label={speaker ? "스피커 끄기" : "스피커"}
        >
          <Volume2 size={20} />
          <span>스피커</span>
        </button>
        {showEndButton ? (
          <button
            type="button"
            className="incall-control-bar__btn incall-control-bar__btn--end"
            onClick={handleEnd}
            aria-label={endLabel}
          >
            <PhoneOff size={22} />
            <span>{endLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
