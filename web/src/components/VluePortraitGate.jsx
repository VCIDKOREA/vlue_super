import { useEffect, useState } from "react";
import { isPhoneLandscapeBlocked, tryLockPortraitOrientation } from "../lib/portraitOrientation.js";
import "./vlue-portrait-gate.css";

/**
 * 폰 가로모드 전면 차단 오버레이 (앱·웹 공통).
 * 관리자/HQ 콘솔은 마운트하지 않음.
 */
export default function VluePortraitGate() {
  const [blocked, setBlocked] = useState(() => isPhoneLandscapeBlocked());

  useEffect(() => {
    tryLockPortraitOrientation();
    const sync = () => {
      setBlocked(isPhoneLandscapeBlocked());
      tryLockPortraitOrientation();
    };
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const mq = window.matchMedia("(orientation: landscape)");
    mq.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      mq.removeEventListener?.("change", sync);
    };
  }, []);

  if (!blocked) return null;

  return (
    <div className="vlue-portrait-gate" role="alertdialog" aria-modal="true" aria-labelledby="vlue-portrait-gate-title">
      <div className="vlue-portrait-gate__card">
        <div className="vlue-portrait-gate__icon" aria-hidden>
          ↻
        </div>
        <p id="vlue-portrait-gate-title" className="vlue-portrait-gate__title">
          세로 모드로 돌려 주세요
        </p>
        <p className="vlue-portrait-gate__desc">
          VLUÉ는 세로 화면만 지원합니다. 폴드폰은 펼친 세로 상태에서 넓게 볼 수 있습니다.
        </p>
      </div>
    </div>
  );
}
