import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * 스플래시 미디어 URL — 항상 사이트 루트(`/eye2_vlue.mp4`).
 * `/app` 셸에서 상대경로로 붙으면 SPA HTML(200)이 내려와 video/img가 깨진다.
 */
function splashRootAsset(fileName) {
  const name = String(fileName || "").replace(/^\//, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/${name}`;
  }
  const base = String(import.meta.env.BASE_URL ?? "/");
  /* Electron `./` 도 루트 파일명만 쓰도록 정규화 */
  if (base === "./" || base.startsWith("./")) return `./${name}`;
  return `/${name}`;
}

/** `public/eye2_vlue.mp4` — 빌드 시 faststart(moov 앞) 처리됨 */
const SPLASH_VIDEO_FILE = "eye2_vlue.mp4";
/** 캐시 버스팅 — CDN/WebView가 깨진 응답을 붙잡을 때 */
const SPLASH_ASSET_VER = "20261006a";

/** 인트로 mp4 없을 때 정적 카드 유지 시간(ms) */
const STATIC_SPLASH_MS = 3600;
const STATIC_LETTERS_MS = 1100;

/** 스플래시 배경 — `styles.css`의 `.dark-mode`(본문 `#111827`)와 동일 톤 */
export const SPLASH_SHELL_BG = "#111827";

/** 원본 영상에서 앞·뒤로 버릴 구간(초) */
const TRIM_HEAD_S = 0.5;
const TRIM_TAIL_S = 0.5;
/** 트림 후 재생 구간 길이 상한(초) — 영상 타임라인 기준 */
const VISIBLE_PLAY_S = 4.0;

/** 메타데이터 전까지 쓰는 스플래시 유지 기본값(ms) — 이후 실제 재생 구간 길이로 덮어씀 */
const SPLASH_HOLD_MS_DEFAULT = 5200;

const SPLASH_FADE_OUT_MS = 520;

/** 영상 준비·재생 실패 안전망(ms) */
const VIDEO_READY_TIMEOUT_MS = 14000;

/**
 * 트림 시작 시점 기준, 눈이 뜬 뒤 `V L U E`·하단 카피 페이드가 같이 시작할 때까지(초).
 */
const VLUE_LETTERS_AFTER_TRIM_S = 1.12;

const SPLASH_VIDEO_VOLUME = 1;

function isIosLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidWebView() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && (/; wv\)/i.test(ua) || /VLUE-Android-App/i.test(ua));
}

/** 외부 img 의존 없이 항상 그리는 눈 마크 — 깨진 이미지 아이콘 방지 */
function SplashEyeFallback() {
  return (
    <svg
      className="vlue-splash-video vlue-splash-eye-fallback-pulse"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width="128"
      height="128"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="vlueSplashEyeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#vlueSplashEyeBg)" />
      <g transform="translate(0 -5.2)">
        <circle cx="64" cy="76.9333" r="21.3333" fill="#ffffff" />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth="7.7333"
          strokeLinecap="butt"
          strokeLinejoin="round"
          d="M 22.4 70.267 Q 64 29.733 105.6 70.267"
        />
      </g>
    </svg>
  );
}

/**
 * 인트로: `public/eye2_vlue.mp4` — 트림 구간 길이에 맞춘 `splashHoldMs` 후 페이드아웃.
 */
function Splash({ onDone, shellBg = SPLASH_SHELL_BG }) {
  const videoRef = useRef(null);
  const revealedRef = useRef(false);
  const wiredRef = useRef(false);
  const videoCleanupFnsRef = useRef([]);
  const [revealing, setRevealing] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [lettersIn, setLettersIn] = useState(false);
  const [splashSoundOn, setSplashSoundOn] = useState(false);
  const [splashHoldMs, setSplashHoldMs] = useState(SPLASH_HOLD_MS_DEFAULT);
  const [loadProgress, setLoadProgress] = useState(0);
  const segmentRef = useRef(null);

  const splashVideoSrc = useMemo(() => {
    const root = splashRootAsset(SPLASH_VIDEO_FILE);
    const join = root.includes("?") ? "&" : "?";
    return `${root}${join}v=${SPLASH_ASSET_VER}`;
  }, []);

  const enableSplashSound = useCallback(() => {
    if (revealedRef.current) return;
    setSplashSoundOn(true);
    const vid = videoRef.current;
    if (!vid) return;
    try {
      vid.muted = false;
      vid.volume = SPLASH_VIDEO_VOLUME;
      const seg = segmentRef.current;
      if (seg && Number.isFinite(vid.currentTime) && vid.currentTime < seg.lettersAt - 0.08) {
        setLettersIn(false);
        vid.currentTime = seg.segmentStart;
      }
      void vid.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setLoadProgress(1);
    const v = videoRef.current;
    if (v && !v.paused) {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
    setRevealing(true);
  }, []);

  const failVideo = useCallback(() => {
    setVideoBroken((prev) => {
      if (prev) return prev;
      return true;
    });
    setVideoReady(false);
    wiredRef.current = false;
    segmentRef.current = null;
    setSplashHoldMs(2600);
    videoCleanupFnsRef.current.forEach((fn) => fn());
    videoCleanupFnsRef.current = [];
    const v = videoRef.current;
    if (v) {
      try {
        v.removeAttribute("src");
        v.load();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const playSafe = useCallback(
    (v) =>
      v
        .play()
        .catch(() => {
          try {
            v.muted = true;
          } catch {
            /* ignore */
          }
          setSplashSoundOn(false);
          return v.play();
        }),
    []
  );

  const wireVideo = useCallback(
    (v) => {
      if (wiredRef.current || videoBroken) return;
      wiredRef.current = true;

      videoCleanupFnsRef.current.forEach((fn) => fn());
      videoCleanupFnsRef.current = [];

      const dur = v.duration;
      if (!Number.isFinite(dur) || dur <= 0.2) {
        failVideo();
        return;
      }

      const canTrim = dur > TRIM_HEAD_S + TRIM_TAIL_S + 0.05;
      const segmentStart = canTrim ? TRIM_HEAD_S : 0;
      const segmentEnd = canTrim
        ? Math.min(dur - TRIM_TAIL_S, segmentStart + VISIBLE_PLAY_S)
        : Math.min(dur, VISIBLE_PLAY_S);
      const lettersAt = segmentStart + Math.min(VLUE_LETTERS_AFTER_TRIM_S, Math.max(0.4, (segmentEnd - segmentStart) * 0.35));
      const playSpanS = Math.max(0.05, segmentEnd - segmentStart);
      segmentRef.current = { segmentStart, segmentEnd, playSpanS, lettersAt };
      setVideoReady(true);
      setLoadProgress(0);
      setSplashHoldMs(Math.min(9200, Math.max(2800, Math.round(playSpanS * 1000) + 200)));

      const onTimeUpdate = () => {
        const t = v.currentTime;
        if (t >= lettersAt) setLettersIn(true);
        setLoadProgress(Math.min(1, Math.max(0, (t - segmentStart) / playSpanS)));
        if (t >= segmentEnd - 0.04) {
          v.pause();
          v.removeEventListener("timeupdate", onTimeUpdate);
          if (!revealedRef.current) reveal();
        }
      };

      v.addEventListener("timeupdate", onTimeUpdate);
      videoCleanupFnsRef.current.push(() => v.removeEventListener("timeupdate", onTimeUpdate));

      const beginFrom = (startAt) => {
        let seekFallback = 0;
        const afterSeek = () => {
          window.clearTimeout(seekFallback);
          playSafe(v).catch(() => {
            /* Android WebView: seek 실패 시 0초부터라도 재생 */
            try {
              v.currentTime = 0;
            } catch {
              /* ignore */
            }
            playSafe(v).catch(failVideo);
          });
        };
        try {
          v.currentTime = startAt;
        } catch {
          afterSeek();
          return;
        }
        seekFallback = window.setTimeout(() => {
          v.removeEventListener("seeked", afterSeek);
          afterSeek();
        }, isAndroidWebView() ? 600 : 350);
        v.addEventListener("seeked", afterSeek, { once: true });
        videoCleanupFnsRef.current.push(() => window.clearTimeout(seekFallback));
      };

      try {
        v.playsInline = true;
        v.muted = true;
        v.setAttribute("playsinline", "");
        v.setAttribute("webkit-playsinline", "");
        v.setAttribute("x5-playsinline", "");
      } catch {
        /* ignore */
      }

      /* iOS / 일부 WebView: seek 전에 한 번 play() */
      if (isIosLike() || isAndroidWebView()) {
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
        playSafe(v)
          .then(() => beginFrom(segmentStart))
          .catch(() => beginFrom(0));
      } else {
        beginFrom(segmentStart);
      }
    },
    [failVideo, playSafe, reveal, videoBroken]
  );

  const onVideoReady = useCallback(
    (e) => {
      setLettersIn(false);
      wireVideo(e.currentTarget);
    },
    [wireVideo]
  );

  useEffect(() => {
    if (videoBroken) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return undefined;

    const readyTimeout = window.setTimeout(() => {
      if (!wiredRef.current) {
        console.warn("[splash] video ready timeout");
        failVideo();
      }
    }, VIDEO_READY_TIMEOUT_MS);

    return () => window.clearTimeout(readyTimeout);
  }, [failVideo, videoBroken]);

  useEffect(() => {
    if (!videoBroken) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setLettersIn(true);
      setLoadProgress(1);
      reveal();
      return undefined;
    }
    setLettersIn(false);
    setLoadProgress(0);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      if (revealedRef.current) return;
      const elapsed = now - t0;
      setLoadProgress(Math.min(1, elapsed / STATIC_SPLASH_MS));
      if (elapsed >= STATIC_LETTERS_MS) setLettersIn(true);
      if (elapsed >= STATIC_SPLASH_MS) {
        reveal();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [videoBroken, reveal]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      const show = window.setTimeout(() => setLettersIn(true), 450);
      setLoadProgress(1);
      reveal();
      return () => {
        window.clearTimeout(show);
        videoCleanupFnsRef.current.forEach((fn) => fn());
        videoCleanupFnsRef.current = [];
      };
    }

    if (videoBroken) return undefined;

    const revealId = window.setTimeout(() => {
      if (!revealedRef.current) reveal();
    }, splashHoldMs + 900);

    return () => window.clearTimeout(revealId);
  }, [reveal, splashHoldMs, videoBroken]);

  useEffect(
    () => () => {
      videoCleanupFnsRef.current.forEach((fn) => fn());
      videoCleanupFnsRef.current = [];
    },
    []
  );

  useEffect(() => {
    if (!revealing) return undefined;
    const t = window.setTimeout(() => onDone?.(), SPLASH_FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [revealing, onDone]);

  const onSplashTap = useCallback(
    (e) => {
      const vid = videoRef.current;
      if (vid && vid.paused && !revealedRef.current) {
        void vid.play().catch(() => {});
      }
      enableSplashSound();
      e?.stopPropagation?.();
    },
    [enableSplashSound]
  );

  return (
    <div
      className={`vlue-splash-root vlue-splash-root--charcoal transition-opacity ease-out ${
        revealing ? "vlue-splash-root--reveal pointer-events-none" : "opacity-100"
      }`}
      style={{
        "--vlue-splash-bg": shellBg,
        transitionDuration: revealing ? `${SPLASH_FADE_OUT_MS}ms` : "0ms",
      }}
      onPointerDownCapture={revealing ? undefined : onSplashTap}
    >
      <div className="vlue-splash-ambient" aria-hidden />
      <div className="vlue-splash-shell-chrome" aria-hidden>
        <span className="vlue-splash-shell-chrome-dot" />
        <span className="vlue-splash-shell-chrome-dot" />
        <span className="vlue-splash-shell-chrome-dot" />
      </div>
      <div className="vlue-splash-shell-home" aria-hidden />
      <div className="vlue-splash-stage relative flex h-full w-full flex-col items-center justify-center px-6 py-10">
        <div className="flex max-w-full flex-col items-center gap-3">
          <div className={`vlue-splash-card vlue-splash-card-cf${revealing ? " vlue-splash-card-cf--reveal" : ""}`}>
            <div className="vlue-splash-cf-screen">
              <div className="vlue-splash-cf-visual">
                <div className="vlue-splash-eye-mount">
                  <span className="vlue-splash-eye-ring-home vlue-splash-eye-ring-bg" aria-hidden />
                  <div className="vlue-splash-eye-content">
                    {!videoBroken ? (
                      <>
                        {!videoReady ? <SplashEyeFallback /> : null}
                        <video
                          ref={videoRef}
                          className="vlue-splash-video"
                          src={splashVideoSrc}
                          muted
                          defaultMuted
                          autoPlay
                          playsInline
                          preload="auto"
                          onLoadedMetadata={onVideoReady}
                          onLoadedData={onVideoReady}
                          onCanPlay={onVideoReady}
                          onError={() => {
                            console.warn("[splash] video error", splashVideoSrc);
                            failVideo();
                          }}
                          style={videoReady ? undefined : { opacity: 0, pointerEvents: "none" }}
                          aria-hidden
                        />
                      </>
                    ) : (
                      <SplashEyeFallback />
                    )}
                    <div className="vlue-splash-vignette" aria-hidden />
                  </div>
                  <div className={`vlue-splash-cf-logo-type${lettersIn ? " vlue-splash-cf-logo-type--in" : ""}`} aria-hidden>
                    V&nbsp;L&nbsp;U&nbsp;E
                  </div>
                </div>
              </div>
            </div>
            <div className="vlue-splash-load-track" aria-hidden>
              <div
                className={`vlue-splash-load-bar${revealing ? " vlue-splash-load-bar--paused" : ""}`}
                style={{ width: `${Math.round(loadProgress * 10000) / 100}%` }}
              />
            </div>
          </div>
          <p className={`vlue-splash-tagline${lettersIn ? " vlue-splash-tagline--in" : ""}`}>VLUÉ로 눈을 뜨다.</p>
        </div>
      </div>
    </div>
  );
}

export default Splash;
