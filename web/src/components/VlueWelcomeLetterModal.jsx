import { useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX, X } from "lucide-react";
import {
  acknowledgeDigitalLetter,
  clampLetterBgmVolume,
  pauseLetterBgm,
  preloadLetterBgm,
  readLetterBgmMuted,
  readLetterBgmVolume,
  resolveLetterSeasonFx,
  startLetterBgm,
  writeLetterBgmMuted,
  writeLetterBgmVolume
} from "../lib/digitalLetter.js";
import LEE_JONGGEUN_SIGNATURE from "../assets/lee-jonggeun-signature.png";
import "./vlue-welcome-letter.css";

/** 가을 낙엽 SVG — 줄기·잎맥이 있는 단풍잎 실루엣 */
export function AutumnLeafSvg({ variant = 0 }) {
  const fills = ["#c9a882", "#b8956c", "#d4b08a", "#a88968", "#cbb08e", "#b89a74"];
  const fill = fills[variant % fills.length];
  return (
    <svg className="vlue-letter-leaf-svg" viewBox="0 0 32 36" aria-hidden focusable="false">
      <path
        fill={fill}
        d="M16 2.2c-.4 2.4-2.2 4.2-4.6 5.6C7.2 10.2 4 13.4 3.4 18.2c-.5 4.2 1.8 8.2 5.6 10.2 1.4.7 2.7 1.6 3.4 3l.6 1.1c.3.5.9.8 1.5.7.6.1 1.2-.2 1.5-.7l.6-1.1c.7-1.4 2-2.3 3.4-3 3.8-2 6.1-6 5.6-10.2-.6-4.8-3.8-8-7.999-10.4C18.2 6.4 16.4 4.6 16 2.2z"
      />
      <path
        fill="none"
        stroke="rgba(92, 64, 40, 0.35)"
        strokeWidth="1.1"
        strokeLinecap="round"
        d="M16 8.5v18.5"
      />
      <path
        fill="none"
        stroke="rgba(92, 64, 40, 0.28)"
        strokeWidth="0.9"
        strokeLinecap="round"
        d="M16 14.5c-2.2 1.2-3.8 2.8-4.6 4.8M16 14.5c2.2 1.2 3.8 2.8 4.6 4.8M16 19.2c-1.8.9-3.1 2.1-3.8 3.6M16 19.2c1.8.9 3.1 2.1 3.8 3.6"
      />
      <path
        fill="none"
        stroke="rgba(92, 64, 40, 0.4)"
        strokeWidth="1.2"
        strokeLinecap="round"
        d="M16 33.2v-2.6"
      />
    </svg>
  );
}

/**
 * VLUÉ가 전하는 편지 — 따뜻한 디지털 레터
 * forceRead: 첫 자동 표시 시 스크롤 유도 (닫기는 항상 가능, 닫으면 다시 안 뜸)
 */
export default function VlueWelcomeLetterModal({
  letter,
  open,
  forceRead = false,
  previewMode = false,
  onClose,
  onAcknowledged
}) {
  const scrollRef = useRef(null);
  const titleRef = useRef(null);
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

  /* 제목 한 줄 유지 — 넘치면 글자만 축소 (닫기 버튼 여백 반영) */
  useEffect(() => {
    if (!open) return undefined;
    const el = titleRef.current;
    if (!el) return undefined;

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const styles = getComputedStyle(parent);
      const padL = parseFloat(styles.paddingLeft) || 0;
      const padR = parseFloat(styles.paddingRight) || 0;
      /* 좌우 닫기 버튼·여백을 빼고, 끝 글자 잘림 방지용 여유 4px */
      const maxW = Math.max(48, parent.clientWidth - padL - padR - 4);
      el.style.transform = "none";
      el.style.fontSize = "26px";
      el.style.width = "max-content";
      el.style.maxWidth = "none";

      let lo = 10;
      let hi = 26;
      for (let i = 0; i < 18; i += 1) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= maxW) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = `${lo}px`;

      /* 최소 크기에서도 넘치면 scale로 한 줄 맞춤 */
      const sw = el.scrollWidth;
      if (sw > maxW) {
        const scale = Math.max(0.55, maxW / sw);
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = "center top";
      }
    };

    fit();
    const t1 = window.setTimeout(fit, 50);
    const t2 = window.setTimeout(fit, 220);
    if (document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    const observeTarget = el.parentElement || el;
    ro?.observe(observeTarget);
    window.addEventListener("resize", fit);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [open, letter?.title, letter?.id, letter?.version]);

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

  const handleDismiss = () => {
    if (previewMode) {
      onClose?.();
      return;
    }
    acknowledgeDigitalLetter(letter);
    onAcknowledged?.(letter);
    onClose?.();
  };

  const handleConfirm = () => {
    if (previewMode) {
      onClose?.();
      return;
    }
    if (forceRead && !reachedEnd) return;
    handleDismiss();
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
  const decor = letter?.decor && typeof letter.decor === "object" ? letter.decor : {};
  const paperTheme = String(decor.paperTheme || "cream-lined");
  const seasonFx = resolveLetterSeasonFx(decor.seasonFx);
  const showLines = decor.showLines !== false;
  const fxOpacity = Math.min(
    0.55,
    Math.max(0.05, typeof decor.fxOpacity === "number" ? decor.fxOpacity : 0.2)
  );
  const showSignature = decor.showSignature !== false;
  const bodyFont = String(decor.bodyFont || "myeongjo");
  const paperClass = [
    "vlue-letter-paper",
    `vlue-letter-paper--${paperTheme}`,
    `vlue-letter-paper--font-${bodyFont}`,
    showLines ? "vlue-letter-paper--lined" : "vlue-letter-paper--nolines"
  ].join(" ");
  const seasonParticleCount = seasonFx === "none" ? 0 : seasonFx === "autumn" ? 12 : 10;
  const effectiveForceRead = previewMode ? false : forceRead;

  return (
    <div className="vlue-letter-root" role="dialog" aria-modal="true" aria-labelledby="vlue-letter-title">
      <div className="vlue-letter-backdrop" aria-hidden />
      <div className={`vlue-letter-sheet vlue-letter-sheet--${paperTheme}`}>
        {seasonFx !== "none" ? (
          <div
            className={`vlue-letter-season vlue-letter-season--${seasonFx}`}
            style={{ ["--vlue-letter-fx-opacity"]: String(fxOpacity) }}
            aria-hidden
          >
            {Array.from({ length: seasonParticleCount }, (_, i) => (
              <span key={i} className={`vlue-letter-season__particle vlue-letter-season__particle--${i + 1}`}>
                {seasonFx === "autumn" ? <AutumnLeafSvg variant={i} /> : null}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="vlue-letter-close-x"
          onClick={handleDismiss}
          aria-label="편지 닫기"
        >
          <X size={18} strokeWidth={2.4} aria-hidden />
        </button>
        <header className="vlue-letter-head">
          <p className="vlue-letter-eyebrow">Digital Letter</p>
          <h2 id="vlue-letter-title" ref={titleRef} className="vlue-letter-title">
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
          <div className={paperClass}>
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
            {showSignature ? (
              <div className="vlue-letter-signoff">
                <img
                  src={LEE_JONGGEUN_SIGNATURE}
                  alt="이종근"
                  className="vlue-letter-signature"
                  draggable={false}
                />
              </div>
            ) : null}
          </div>

          <footer className="vlue-letter-foot">
            <p className="vlue-letter-thanks">
              {previewMode ? "관리자 미리보기" : "끝까지 읽어 주셔서 감사합니다"}
            </p>
            <button
              type="button"
              className="vlue-letter-confirm"
              disabled={effectiveForceRead && !reachedEnd}
              onClick={handleConfirm}
            >
              {previewMode
                ? "미리보기 닫기"
                : effectiveForceRead && !reachedEnd
                  ? "아래로 스크롤해 주세요"
                  : "확인"}
            </button>
            {!previewMode ? (
              <button type="button" className="vlue-letter-close-link" onClick={handleDismiss}>
                닫기
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}
