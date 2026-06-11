import { useCallback, useEffect, useRef, useState } from "react";

/** Vite `public/` 자산 — 서브경로 배포 시 `import.meta.env.BASE_URL` 반영 */
function publicAsset(fileName) {
  const base = String(import.meta.env.BASE_URL ?? "/");
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${String(fileName).replace(/^\//, "")}`;
}

/** `public/eye2_vlue.mp4` — moov가 파일 끝에 있어 모바일 스트리밍 시 ? 아이콘 → blob 전체 로드 후 재생 */
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

/** 모바일·느린망: mp4 전체 fetch 상한(ms) */
const VIDEO_FETCH_TIMEOUT_MS = 18000;

/** blob 로드 후 메타데이터 대기 상한(ms) */
const VIDEO_METADATA_TIMEOUT_MS = 8000;

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
  const blobUrlRef = useRef("");
  /** 영상 seek·timeupdate 정리 — `splashHoldMs` effect와 분리(그 effect가 리스너를 지우면 문구가 영원히 안 뜸) */
  const videoCleanupFnsRef = useRef([]);
  const [revealing, setRevealing] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  /** blob URL 준비 전에는 포스터만 표시(? 아이콘 방지) */
  const [videoBlobSrc, setVideoBlobSrc] = useState("");
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
    setVideoBlobSrc("");
    segmentRef.current = null;
    setSplashHoldMs(2600);
    videoCleanupFnsRef.current.forEach((fn) => fn());
    videoCleanupFnsRef.current = [];
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
  }, []);

  /** 모바일 Safari: moov-at-end mp4는 스트리밍 재생 불가 → 전체 blob 로드 후 object URL 재생 */
  useEffect(() => {
    if (videoBroken) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return undefined;

    let cancelled = false;
    const ac = new AbortController();
    const fetchTimeout = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("[splash] video fetch timeout");
        failVideo();
      }
    }, VIDEO_FETCH_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(SPLASH_VIDEO_SRC, { signal: ac.signal, cache: "force-cache" });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        if (!blob || blob.size < 4096) throw new Error("empty blob");
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setVideoBlobSrc(url);
      } catch (e) {
        if (!cancelled && !ac.signal.aborted) {
          console.warn("[splash] video prefetch failed", e);
          failVideo();
        }
      } finally {
        window.clearTimeout(fetchTimeout);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(fetchTimeout);
    };
  }, [failVideo, videoBroken]);

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
      const holdMs = Math.min(9200, Math.max(2800, Math.round(playSpanS * 1000) + 200));
      setSplashHoldMs(holdMs);

      const onTimeUpdate = () => {
        const t = v.currentTime;
        if (t >= lettersAt) {
          setLettersIn(true);
        }
        const p = Math.min(1, Math.max(0, (t - segmentStart) / playSpanS));
        setLoadProgress(p);
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
        try {
          v.muted = !splashSoundOn;
          v.playsInline = true;
        } catch {
          /* ignore */
        }
        v.play()
          .catch(() => {
            try {
              v.muted = true;
            } catch {
              /* ignore */
            }
            setSplashSoundOn(false);
            return v.play();
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
    [failVideo, reveal, splashSoundOn]
  );

  const onLoadedMetadata = useCallback(
    (e) => {
      setLettersIn(false);
      wireVideo(e.currentTarget);
    },
    [wireVideo]
  );

  /** blob 준비 후에도 메타데이터가 안 오면 정적 대체 */
  useEffect(() => {
    if (!videoBlobSrc || videoBroken) return undefined;
    const metaTimeout = window.setTimeout(() => {
      if (!segmentRef.current) {
        console.warn("[splash] video metadata timeout");
        failVideo();
      }
    }, VIDEO_METADATA_TIMEOUT_MS);
    return () => window.clearTimeout(metaTimeout);
  }, [videoBlobSrc, videoBroken, failVideo]);

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
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    },
    []
  );

  useEffect(() => {
    if (!revealing) return undefined;
    const t = window.setTimeout(() => onDone?.(), SPLASH_FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [revealing, onDone]);

  const showVideo = !videoBroken && Boolean(videoBlobSrc);

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
                    {showVideo ? (
                      <video
                        ref={videoRef}
                        className="vlue-splash-video"
                        src={videoBlobSrc}
                        poster={SPLASH_FALLBACK_IMG}
                        muted={!splashSoundOn}
                        autoPlay
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
                        className={`vlue-splash-video${videoBroken ? " vlue-splash-eye-fallback-pulse" : ""}`}
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
          {typeof window !== "undefined" && !splashSoundOn && !revealing && showVideo ? (
            <p className="vlue-splash-sound-hint" role="note">
              효과음을 들으려면 화면을 한 번 클릭(또는 탭)해 주세요.
            </p>
          ) : null}
          <p className={`vlue-splash-tagline${lettersIn ? " vlue-splash-tagline--in" : ""}`}>VLUE로 눈을 뜨다.</p>
        </div>
      </div>
    </div>
  );
}

export default Splash;
