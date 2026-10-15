import { useEffect, useMemo, useState } from "react";

const FADE_MS = 220;

/**
 * 회사명 ↔ 이름. 한 줄이면 타이머 없이 고정.
 * 언마운트 시 interval·fade 타이머를 모두 해제한다.
 */
export default function RollingIdentityLabel({
  labels,
  className = "",
  intervalMs = 2000
}) {
  const lines = useMemo(() => {
    const out = [];
    for (const raw of labels || []) {
      const text = String(raw || "").trim();
      if (text && !out.includes(text)) out.push(text);
    }
    return out;
  }, [labels]);
  const lineKey = lines.join("\n");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setIndex(0);
    setShown(true);
    if (lines.length < 2) return undefined;
    let fadeTimer = 0;
    const tick = window.setInterval(() => {
      setShown(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((current) => (current + 1) % lines.length);
        setShown(true);
      }, FADE_MS);
    }, intervalMs);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fadeTimer);
    };
  }, [lineKey, intervalMs, lines.length]);

  const text = lines[index] || lines[0] || "";
  return (
    <span
      className={`vlue-roll-label${shown ? " is-in" : " is-out"}${className ? ` ${className}` : ""}`}
    >
      {text}
    </span>
  );
}
