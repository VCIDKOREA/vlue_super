import { useCallback, useEffect, useRef, useState } from "react";

/** Vite `public/` 자산 — 서브경로 배포 시 `import.meta.env.BASE_URL` 반영 */
function publicAsset(fileName) {
  const base = String(import.meta.env.BASE_URL ?? "/");
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${String(fileName).replace(/^\//, "")}`;
}

/** `public/eye2_vlue.mp4` — 없으면 404 → 정적 대체(아래 SVG)만 표시되며 소리는 없음 */
const SPLASH_VIDEO_SRC = publicAsset("eye2_vlue.mp4");
const SPLASH_FALLBACK_IMG = publicAsset("vlue-shield-eye-logo-preview.svg");

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

/**
 * 트림 시작 시점 기준, 눈이 뜬 뒤 `V L U E`·하단 카피 페이드가 같이 시작할 때까지(초).
 * eye2_vlue.mp4 안 **띵** 효과음 타이밍에 맞추려면 이 값만 미세 조정하면 됩니다.
 */
const VLUE_LETTERS_AFTER_TRIM_S = 1.12;

/** 인트로 영상 음량(음소거 해제 후, 0~1) — 자동 재생은 항상 muted 유지; 소리는 클릭/터치 제스처로만 켬(Chrome 자동 pause 방지) */
const SPLASH_VIDEO_VOLUME = 1;

/**
 * 인트로: `public/eye2_vlue.mp4` — 트림 구간 길이에 맞춘 `splashHoldMs` 후 페이드아웃.
 */
function Splash({ onDone, shellBg = SPLASH_SHELL_BG }) {
  const videoRef = useRef(null);
  const revealedRef = useRef(false);
  /** 영상 seek·timeupdate 정리 — `splashHoldMs` effect와 분리(그 effect가 리스너를 지우면 문구가 영원히 안 뜸) */
  const videoCleanupFnsRef = useRef([]);
  const [revealing, setRevealing] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  const [lettersIn, setLettersIn] = useState(false);
  /** 자동재생은 muted로 시작; 첫 터치 시 해제 — 실제 출력은 기기 매너/볼륨에 따름 */
  const [splashSoundOn, setSplashSoundOn] = useState(false);
  /** timeupdate 누락·정지 실패 시 페이드아웃까지의 상한(ms) — 영상 길이와 맞춤 */
  const [splashHoldMs, setSplashHoldMs] = useState(SPLASH_HOLD_MS_DEFAULT);
  /** 0~1 — CSS 애니메이션 대신 영상 타임라인과 동기 */
  const [loadProgress, setLoadProgress] = useState(0);
  /** 트림 구간( wireVideo 후 채워짐 ) — 터치 시 소리·띵 타이밍 보정용 */
  const segmentRef = useRef(null);

  const enableSplashSound = useCallback(() => {
    if (revealedRef.current) return;
    setSplashSoundOn(true);
    const vid = videoRef.current;
    if (!vid) return;
    try {
      vid.volume = SPLASH_VIDEO_VOLUME;
      const seg = segmentRef.current;
      /* 띵/레터 이전이면 트림 시작으로 되감아 터치 직후부터 효과음이 들리도록 */
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
    setVideoBroken(true);
    segmentRef.current = null;
    setSplashHoldMs(2600);
    videoCleanupFnsRef.current.forEach((fn) => fn());
    videoCleanupFnsRef.current = [];
  }, []);

  const wireVideo = useCallback(
    (v) => {
      videoCleanupFnsRef.current.forEach((fn) => fn());
      videoCleanupFnsRef.current = [];

      const dur = v.duration;
      if (!Number.isFinite(dur) || dur <= TRIM_HEAD_S + TRIM_TAIL_S + 0.05) {
        failVideo();
        return;
      }

      const segmentStart = TRIM_HEAD_S;
      const segmentEnd = Math.min(dur - TRIM_TAIL_S, segmentStart + VISIBLE_PLAY_S);
      const lettersAt = segmentStart + VLUE_LETTERS_AFTER_TRIM_S;
      const playSpanS = Math.max(0.05, segmentEnd - segmentStart);
      segmentRef.current = { segmentStart, segmentEnd, playSpanS, lettersAt };
      setLoadProgress(0);
      /* 영상 끝 + 짧은 여유 — 진행 바는 timeupdate로 맞추므로 과도한 +ms 제거 */
      const holdMs = Math.min(9200, Math.max(2800, Math.round(playSpanS * 1000) + 200));
      setSplashHoldMs(holdMs);

      const onTimeUpdate = () => {
        const t = v.currentTime;
        if (t >= lettersAt) {
          setLettersIn(true);
        }
        const p = Math.min(1, Math.max(0, (t - segmentStart) / playSpanS));
        setLoadProgress(p);
        /* 한 프레임 여유로 정지해 timeupdate 경계에서 떨림 완화 */
        if (t >= segmentEnd - 0.04) {
          v.pause();
          v.removeEventListener("timeupdate", onTimeUpdate);
          if (!revealedRef.current) {
            reveal();
          }
        }
      };

      v.addEventListener("timeupdate", onTimeUpdate);
      videoCleanupFnsRef.current.push(() => v.removeEventListener("timeupdate", onTimeUpdate));

      const startPlayback = () => {
        v.play()
          .then(() => {
            /* 제스처 없이 unmute 하면 Chrome 등에서 재생이 즉시 멈출 수 있음 → 끝까지 muted 유지, 소리는 클릭/터치 시에만 */
          })
          .catch(() => {
            /* 일부 환경에서 첫 play만 거절되는 경우 — 명시적 mute 후 재시도 */
            try {
              v.muted = true;
            } catch {
              /* ignore */
            }
            setSplashSoundOn(false);
            return v.play();
          })
          .then(() => {
            /* 동일: 자동 unmute 없음 */
          })
          .catch(failVideo);
      };

      v.currentTime = segmentStart;
      let seekFallback = 0;
      const afterSeek = () => {
        window.clearTimeout(seekFallback);
        startPlayback();
      };
      seekFallback = window.setTimeout(() => {
        v.removeEventListener("seeked", afterSeek);
        startPlayback();
      }, 200);
      v.addEventListener("seeked", afterSeek, { once: true });
      videoCleanupFnsRef.current.push(() => window.clearTimeout(seekFallback));
    },
    [failVideo, reveal]
  );

  const onLoadedMetadata = useCallback(
    (e) => {
      setLettersIn(false);
      wireVideo(e.currentTarget);
    },
    [wireVideo]
  );

  /** mp4 로드 실패 시: 정적 이미지 + 진행 바를 영상과 비슷한 리듬으로 */
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

    /* 영상 끝에서 주로 reveal — timeupdate 누락·백그라운드 탭 등 안전망 */
    const revealId = window.setTimeout(() => {
      if (!revealedRef.current) reveal();
    }, splashHoldMs + 900);

    return () => {
      window.clearTimeout(revealId);
    };
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

  return (
    <div
      className={`vlue-splash-root vlue-splash-root--charcoal transition-opacity ease-out ${
        revealing ? "vlue-splash-root--reveal pointer-events-none" : "opacity-100"
      }`}
      style={{
        "--vlue-splash-bg": shellBg,
        transitionDuration: revealing ? `${SPLASH_FADE_OUT_MS}ms` : "0ms",
      }}
      onPointerDownCapture={revealing ? undefined : enableSplashSound}
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
                      <video
                        ref={videoRef}
                        className="vlue-splash-video"
                        src={SPLASH_VIDEO_SRC}
                        muted={!splashSoundOn}
                        playsInline
                        preload="auto"
                        onLoadedMetadata={onLoadedMetadata}
                        onError={failVideo}
                        aria-hidden
                      />
                    ) : (
                      <img
                        src={SPLASH_FALLBACK_IMG}
                        alt=""
                        className="vlue-splash-video"
                        draggable={false}
                        aria-hidden
                      />
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
          <p className={`vlue-splash-tagline${lettersIn ? " vlue-splash-tagline--in" : ""}`}>VLUE로 눈을 뜨다.</p>
        </div>
      </div>
    </div>
  );
}

export default Splash;
