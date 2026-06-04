import { useEffect, useMemo, useState } from "react";
import { formatBizcardValidUntilLabel } from "../lib/letteringBizcardValidity.js";

function formatLiveTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function useDeviceTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onOrient = (e) => {
      const beta = Number(e.beta) || 0;
      const gamma = Number(e.gamma) || 0;
      setTilt({
        x: Math.max(-12, Math.min(12, gamma * 0.35)),
        y: Math.max(-10, Math.min(10, (beta - 45) * 0.2))
      });
    };
    window.addEventListener("deviceorientation", onOrient, true);
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, []);

  return tilt;
}

/** 앞면 — VLUE 홀로그램만 우상단 (QR·본문은 명함 레이아웃에 포함) */
export function LetteringBizcardSecurityOverlayFront() {
  const tilt = useDeviceTilt();

  return (
    <div
      className="lettering-bizcard-security-overlay lettering-bizcard-security-overlay--front"
      aria-hidden
      role="presentation"
    >
      <div
        className="lettering-bizcard-security-overlay__holo"
        style={{ transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}
      >
        <span className="lettering-bizcard-security-overlay__holo-mark">VLUE</span>
        <span className="lettering-bizcard-security-overlay__holo-shine" />
      </div>
    </div>
  );
}

/** 뒷면 — 사용유효기간 · 실시간 검증 시각(LIVE) */
export function LetteringBizcardSecurityOverlayBack({ card, cardId = "", issuedAt = null }) {
  const [ts, setTs] = useState(formatLiveTimestamp);
  const validUntilLabel = useMemo(() => {
    const fromIssued = formatBizcardValidUntilLabel(issuedAt);
    if (fromIssued) return fromIssued;
    return formatBizcardValidUntilLabel(new Date().toISOString());
  }, [issuedAt]);

  useEffect(() => {
    const id = window.setInterval(() => setTs(formatLiveTimestamp()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="lettering-bizcard-security-overlay lettering-bizcard-security-overlay--back"
      aria-hidden={false}
      role="group"
      aria-label="VLUE 보안 인증 (뒷면)"
    >
      <div className="lettering-bizcard-security-overlay__validity">
        <p className="lettering-bizcard-security-overlay__validity-label">사용유효기간</p>
        {validUntilLabel ? (
          <p className="lettering-bizcard-security-overlay__validity-until" title="유료 멤버십 기준 만료 예정일">
            ~ {validUntilLabel}
          </p>
        ) : null}
        <p className="lettering-bizcard-security-overlay__ts" title="실시간 검증 시각">
          LIVE {ts}
        </p>
      </div>
    </div>
  );
}
