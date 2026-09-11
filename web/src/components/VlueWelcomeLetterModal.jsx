import { useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import {
  acknowledgeDigitalLetter,
  clampLetterBgmVolume,
  pauseLetterBgm,
  preloadLetterBgm,
  readLetterBgmMuted,
  readLetterBgmVolume,
  startLetterBgm,
  writeLetterBgmMuted,
  writeLetterBgmVolume
} from "../lib/digitalLetter.js";
import LEE_JONGGEUN_SIGNATURE from "../assets/lee-jonggeun-signature.png";
import "./vlue-welcome-letter.css";

/**
 * VLUÉ가 전하는 편지 — 따뜻한 디지털 레터
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
  const [bgmOn, setBgmOn] = useState(() => !readLetterBgmMuted());
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [volume, setVolume] = useState(0.45);

  const title = String(letter?.title || "").trim();
  const body = String(letter?.body || "").trim();
  const bgmUrl = String(letter?.bgmUrl || "").trim();

  /* 편지 데이터만 있어도 BGM 미리 받아 두기 (모달 열리기 전) */
  useEffect(() => {
    if (!bgmUrl) return;
    preloadLetterBgm(bgmUrl);
  }, [bgmUrl]);

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
    setBgmOn(!readLetterBgmMuted());
    setVolume(readLetterBgmVolume(letter?.bgmVolume));
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    const t = window.setTimeout(() => {
      const sc = scrollRef.current;
      if (!sc) return;
      if (sc.scrollHeight <= sc.clientHeight + 8) setReachedEnd(true);
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, letter?.id, letter?.version, letter?.bgmVolume, forceRead]);

  useEffect(() => {
    if (!open || !bgmUrl) {
      try {
        audioRef.current?.pause();
      } catch {
        /* ignore */
      }
      setBgmPlaying(false);
      return undefined;
    }

    const muted = readLetterBgmMuted();
    const vol = readLetterBgmVolume(letter?.bgmVolume);
    const wantPlay = !muted;

    const audio = wantPlay
      ? startLetterBgm(bgmUrl, vol)
      : preloadLetterBgm(bgmUrl);
    if (!audio) return undefined;

    audio.loop = true;
    audioRef.current = audio;

    const onEnded = () => {
      try {
        audio.currentTime = 0;
        void audio.play().then(() => setBgmPlaying(true)).catch(() => setBgmPlaying(false));
      } catch {
        setBgmPlaying(false);
      }
    };
    const onPlay = () => setBgmPlaying(true);
    const onPause = () => setBgmPlaying(false);
    const onCanPlay = () => {
      if (!wantPlay || !audio.paused) return;
      void audio.play().then(() => setBgmPlaying(true)).catch(() => setBgmPlaying(false));
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadeddata", onCanPlay);

    if (wantPlay && audio.paused) {
      void audio.play().then(() => setBgmPlaying(true)).catch(() => setBgmPlaying(false));
    }

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadeddata", onCanPlay);
      try {
        /* 캐시는 유지 — src 제거하지 않음 (재오픈 시 즉시 재생) */
        audio.pause();
      } catch {
        /* ignore */
      }
      if (audioRef.current === audio) audioRef.current = null;
      setBgmPlaying(false);
    };
  }, [open, bgmUrl, letter?.id, letter?.bgmVolume]);

  useEffect(() => {
    const audio = audioRef.current || (bgmUrl ? preloadLetterBgm(bgmUrl) : null);
    if (!audio || !open) return;
    const vol = clampLetterBgmVolume(volume);
    try {
      audio.volume = bgmOn ? vol : 0;
      audio.muted = !bgmOn || vol <= 0;
      if (bgmOn && audio.paused) {
        void audio.play().then(() => setBgmPlaying(true)).catch(() => setBgmPlaying(false));
      } else if (!bgmOn && !audio.paused) {
        audio.pause();
      }
    } catch {
      /* ignore */
    }
  }, [volume, bgmOn, open, bgmUrl]);

  /* 앱 백그라운드·홈 이탈 시 BGM 중지 (WebView에서 백그라운드 재생 방지) */
  useEffect(() => {
    if (!open) return undefined;

    const pauseNow = () => {
      try {
        if (bgmUrl) pauseLetterBgm(bgmUrl);
        else audioRef.current?.pause();
      } catch {
        /* ignore */
      }
      setBgmPlaying(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") pauseNow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("vlue-app-background", pauseNow);
    window.addEventListener("pagehide", pauseNow);
    window.addEventListener("vlue-letter-bgm-pause", pauseNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("vlue-app-background", pauseNow);
      window.removeEventListener("pagehide", pauseNow);
      window.removeEventListener("vlue-letter-bgm-pause", pauseNow);
    };
  }, [open, bgmUrl]);

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

  const toggleBgm = () => {
    setBgmOn((prev) => {
      const next = !prev;
      writeLetterBgmMuted(!next);
      return next;
    });
  };

  const onVolumeChange = (e) => {
    const next = clampLetterBgmVolume(Number(e.target.value) / 100);
    setVolume(next);
    writeLetterBgmVolume(next);
    if (next > 0 && !bgmOn) {
      setBgmOn(true);
      writeLetterBgmMuted(false);
    }
  };

  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const volumePct = Math.round(clampLetterBgmVolume(volume) * 100);

  return (
    <div className="vlue-letter-root" role="dialog" aria-modal="true" aria-labelledby="vlue-letter-title">
      <div className="vlue-letter-backdrop" aria-hidden />
      <div className="vlue-letter-sheet">
        <header className="vlue-letter-head">
          <p className="vlue-letter-eyebrow">Digital Letter</p>
          <h2 id="vlue-letter-title" className="vlue-letter-title">
            {title || "VLUÉ가 전하는 편지"}
          </h2>
          {bgmUrl ? (
            <div className="vlue-letter-bgm-row">
              <button
                type="button"
                className="vlue-letter-bgm"
                onClick={toggleBgm}
                aria-label={bgmOn ? "배경음악 끄기" : "배경음악 켜기"}
              >
                {bgmOn ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
                <span>{bgmOn ? (bgmPlaying ? "연속 재생 중" : "BGM") : "BGM 꺼짐"}</span>
              </button>
              <label className="vlue-letter-vol">
                <Music2 size={13} aria-hidden />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volumePct}
                  onChange={onVolumeChange}
                  aria-label="편지 BGM 음량"
                />
                <span className="vlue-letter-vol-pct">{volumePct}%</span>
              </label>
            </div>
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
            <div className="vlue-letter-signoff">
              <img
                src={LEE_JONGGEUN_SIGNATURE}
                alt="이종근"
                className="vlue-letter-signature"
                draggable={false}
              />
            </div>
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
