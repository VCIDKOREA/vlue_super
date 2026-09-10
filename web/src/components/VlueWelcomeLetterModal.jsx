import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Volume2 } from "lucide-react";
import { acknowledgeDigitalLetter } from "../lib/digitalLetter.js";
import "./vlue-welcome-letter.css";

/**
 * VLUE가 전하는 편지 — 따뜻한 디지털 레터
 * forceRead: 확인 전까지 닫기 불가 (첫 방문)
 */
export default function VlueWelcomeLetterModal({
  letter,
  open,
  forceRead = false,
  onClose,
  onAcknowledged
}) {
  const scrollRef = useRef(null);
  const audioRef = useRef(null);
  const [reachedEnd, setReachedEnd] = useState(!forceRead);
  const [bgmOn, setBgmOn] = useState(true);
  const [bgmPlaying, setBgmPlaying] = useState(false);

  const title = String(letter?.title || "").trim();
  const body = String(letter?.body || "").trim();
  const bgmUrl = String(letter?.bgmUrl || "").trim();

  useEffect(() => {
    if (!open) {
      setReachedEnd(!forceRead);
      try {
        audioRef.current?.pause();
      } catch {
        /* ignore */
      }
      setBgmPlaying(false);
      return undefined;
    }
    setReachedEnd(!forceRead);
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    const t = window.setTimeout(() => {
      const sc = scrollRef.current;
      if (!sc) return;
      if (sc.scrollHeight <= sc.clientHeight + 8) setReachedEnd(true);
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, letter?.id, letter?.version, forceRead]);

  useEffect(() => {
    if (!open || !bgmUrl || !bgmOn) {
      try {
        audioRef.current?.pause();
      } catch {
        /* ignore */
      }
      setBgmPlaying(false);
      return undefined;
    }
    const audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    const play = () => {
      void audio
        .play()
        .then(() => setBgmPlaying(true))
        .catch(() => setBgmPlaying(false));
    };
    play();
    return () => {
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* ignore */
      }
      if (audioRef.current === audio) audioRef.current = null;
      setBgmPlaying(false);
    };
  }, [open, bgmUrl, bgmOn, letter?.id]);

  if (!open || !letter) return null;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
    if (nearBottom) setReachedEnd(true);
  };

  const handleConfirm = () => {
    if (forceRead && !reachedEnd) return;
    acknowledgeDigitalLetter(letter);
    onAcknowledged?.(letter);
    onClose?.();
  };

  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="vlue-letter-root" role="dialog" aria-modal="true" aria-labelledby="vlue-letter-title">
      <div className="vlue-letter-backdrop" aria-hidden />
      <div className="vlue-letter-sheet">
        <header className="vlue-letter-head">
          <p className="vlue-letter-eyebrow">Digital Letter</p>
          <h2 id="vlue-letter-title" className="vlue-letter-title">
            {title || "VLUE가 전하는 편지"}
          </h2>
          {bgmUrl ? (
            <button
              type="button"
              className="vlue-letter-bgm"
              onClick={() => setBgmOn((v) => !v)}
              aria-label={bgmOn ? "배경음악 끄기" : "배경음악 켜기"}
            >
              {bgmOn && bgmPlaying ? <Volume2 size={14} aria-hidden /> : bgmOn ? <Music2 size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              <span>{bgmOn ? (bgmPlaying ? "BGM 재생 중" : "BGM") : "BGM 꺼짐"}</span>
            </button>
          ) : null}
        </header>

        <div
          ref={scrollRef}
          className="vlue-letter-scroll"
          onScroll={onScroll}
        >
          <div className="vlue-letter-paper">
            {paragraphs.map((block, i) => (
              <p key={`${i}-${block.slice(0, 12)}`} className="vlue-letter-p">
                {block.split("\n").map((line, j) => (
                  <span key={j}>
                    {j > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>

          <footer className="vlue-letter-foot">
            <p className="vlue-letter-thanks">끝까지 읽어 주셔서 감사합니다</p>
            <button
              type="button"
              className="vlue-letter-confirm"
              disabled={forceRead && !reachedEnd}
              onClick={handleConfirm}
            >
              {forceRead && !reachedEnd ? "아래로 스크롤해 주세요" : "확인"}
            </button>
            {!forceRead ? (
              <button type="button" className="vlue-letter-close-link" onClick={() => onClose?.()}>
                닫기
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}
