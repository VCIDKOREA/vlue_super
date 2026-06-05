import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";

/**
 * CSS 기반 통화 중 UI (Galaxy / iPhone) — 스크린샷 없이 빅푸시 오버레이용
 */
export default function LetteringNativeCallScreen({
  platform = "android",
  callNumber = "",
  expanded = false,
  className = ""
}) {
  const isIos = platform === "ios";
  const display = callNumber ? formatLetteringPhoneDisplay(callNumber) : "—";
  const isShort = String(callNumber).replace(/\D/g, "").length <= 4;

  return (
    <div
      className={`vlue-native-call vlue-native-call--${isIos ? "ios" : "android"} ${expanded ? "vlue-native-call--dimmed" : ""} ${className}`.trim()}
      aria-hidden
    >
      <div className="vlue-native-call__bg" />

      {isIos ? (
        <div className="vlue-native-call__status vlue-native-call__status--ios">
          <span className="vlue-native-call__status-time">2:29</span>
          <div className="vlue-native-call__status-right">
            <span className="vlue-native-call__signal" aria-hidden />
            <span className="vlue-native-call__lte">LTE</span>
            <span className="vlue-native-call__battery">76</span>
          </div>
        </div>
      ) : (
        <div className="vlue-native-call__status vlue-native-call__status--android">
          <span className="vlue-native-call__status-clock">2:29</span>
          <div className="vlue-native-call__status-icons" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      <div className="vlue-native-call__main">
        <p className={`vlue-native-call__number ${isShort ? "" : "vlue-native-call__number--long"}`}>
          {display}
        </p>
        {isIos ? <span className="vlue-native-call__info-dot" aria-hidden>i</span> : null}
      </div>

      <div className="vlue-native-call__footer">
        <span className="vlue-native-call__assist">
          <span className="vlue-native-call__assist-icon" aria-hidden>
            ✦
          </span>
          통화 어시스트
        </span>
        <div className="vlue-native-call__controls-reserve" aria-hidden />
      </div>
    </div>
  );
}
