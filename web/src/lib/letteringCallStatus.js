/** MM:SS (통화·녹음 타이머 표시) */
export function formatLetteringMmSs(totalSeconds = 0) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 상단 스트립 우측 문구 (폭 고정 — 레이아웃 밀림 방지)
 * @param {{ callActive?: boolean, isRecording?: boolean, callDurationSec?: number, recordingDurationSec?: number, platform?: "android"|"ios" }} opts
 */
export function getLetteringCallStatusLabel({
  callActive = false,
  isRecording = false,
  callDurationSec = 0,
  recordingDurationSec = 0,
  platform = "android"
} = {}) {
  if (!callActive) return "";
  if (isRecording && platform === "android") {
    return `녹음중 ${formatLetteringMmSs(recordingDurationSec)}`;
  }
  return `통화중 ${formatLetteringMmSs(callDurationSec)}`;
}
