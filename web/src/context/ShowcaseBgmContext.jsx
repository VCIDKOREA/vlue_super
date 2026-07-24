import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  buildShuffledTrackOrder,
  isPlaylistAdvanceMode,
  resolveBgmVolumeGain,
  resolvePlaylistTracks,
  resolveShowcaseBgmUrl
} from "../lib/showcase/showcaseBgmPresets.js";
import { fetchShowcaseSoundById } from "../lib/showcase/showcaseSoundApi.js";
import {
  getProximityState,
  installShowcaseProximityBridge,
  subscribeShowcaseProximity
} from "../lib/showcase/showcaseProximityBridge.js";

/** @typedef {'call_active' | 'replay' | 'preview' | 'settings_preview' | 'idle'} ShowcasePlaybackPhase */

const ShowcaseBgmContext = createContext(null);
const FADE_MS = 500;

function newVisitKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ShowcaseBgmProvider({ children }) {
  const audioRef = useRef(null);
  const visitKeyRef = useRef("");
  const playEpochRef = useRef(0);
  const ownerRef = useRef("");
  const fadeGenRef = useRef(0);
  const styleConfigRef = useRef(null);
  const phaseRef = useRef("idle");
  const userMutedRef = useRef(false);
  /** 셔플/순서 재생용 — tracks 인덱스 배열 */
  const playOrderRef = useRef([0]);
  const playOrderPosRef = useRef(0);
  const advanceTrackRef = useRef(() => {});
  const [phase, setPhase] = useState("idle");
  const [styleConfig, setStyleConfig] = useState(null);
  const [userMuted, setUserMuted] = useState(false);
  const [touchUnlocked, setTouchUnlocked] = useState(false);
  const [proximityNear, setProximityNear] = useState(() => getProximityState() === "near");
  const [visitSessionKey, setVisitSessionKey] = useState("");
  const [trackIndex, setTrackIndex] = useState(0);
  const [playEpoch, setPlayEpoch] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const tracks = useMemo(() => resolvePlaylistTracks(styleConfig?.bgm), [styleConfig]);
  const canSkipTracks = tracks.length > 1;
  const safeIndex = tracks.length ? Math.min(Math.max(0, trackIndex), tracks.length - 1) : 0;
  const safeIndexRef = useRef(0);
  safeIndexRef.current = safeIndex;

  /* styleConfigRef 는 setter 에서만 갱신 — 렌더마다 state 로 덮어쓰면 미리듣기 레이스 발생 */
  phaseRef.current = phase;
  userMutedRef.current = userMuted;

  const bgmUrl = useMemo(
    () => resolveShowcaseBgmUrl(styleConfig, visitSessionKey, safeIndex),
    [styleConfig, visitSessionKey, safeIndex]
  );
  const volumeGain = useMemo(() => resolveBgmVolumeGain(styleConfig), [styleConfig]);
  const shouldPlayAudio =
    phase === "replay" || phase === "preview" || phase === "settings_preview";
  /* 미리보기·설정미리듣기는 근접센서로 막지 않음 (실통화 replay/call_active 만) */
  const forceMuted =
    phase === "call_active" || (proximityNear && (phase === "replay" || phase === "call_active"));
  const effectiveMuted = forceMuted || userMuted || !shouldPlayAudio || !bgmUrl;
  const isAudible = audioPlaying && shouldPlayAudio && !forceMuted && !userMuted && Boolean(bgmUrl);

  useEffect(() => {
    installShowcaseProximityBridge();
    setProximityNear(getProximityState() === "near");
    return subscribeShowcaseProximity((state) => setProximityNear(state === "near"));
  }, []);

  const cancelFade = useCallback(() => {
    fadeGenRef.current += 1;
    const el = audioRef.current;
    if (el) {
      el.volume = Math.max(0, Math.min(1, resolveBgmVolumeGain(styleConfigRef.current)));
    }
  }, []);

  const syncPlayOrder = useCallback((bgm, sessionKey) => {
    const list = resolvePlaylistTracks(bgm);
    const n = list.length;
    const mode = String(bgm?.playMode || "single");
    if (n <= 1) {
      playOrderRef.current = [0];
      playOrderPosRef.current = 0;
      return 0;
    }
    if (mode === "shuffle_selected") {
      playOrderRef.current = buildShuffledTrackOrder(n, sessionKey);
    } else {
      playOrderRef.current = Array.from({ length: n }, (_, i) => i);
    }
    playOrderPosRef.current = 0;
    return playOrderRef.current[0] ?? 0;
  }, []);

  const ensureAudioEl = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.loop = true;
      el.preload = "auto";
      el.addEventListener("play", () => setAudioPlaying(true));
      el.addEventListener("playing", () => setAudioPlaying(true));
      el.addEventListener("pause", () => setAudioPlaying(false));
      el.addEventListener("ended", () => {
        setAudioPlaying(false);
        advanceTrackRef.current?.();
      });
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const applyIdleHard = useCallback(() => {
    visitKeyRef.current = "";
    setVisitSessionKey("");
    ownerRef.current = "";
    const el = audioRef.current;
    if (el) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      el.volume = Math.max(0, Math.min(1, resolveBgmVolumeGain(styleConfigRef.current)));
    }
    setAudioPlaying(false);
    setPhase("idle");
    setUserMuted(false);
  }, []);

  const stopWithFade = useCallback(
    async (durationMs = FADE_MS, ownerAtStart = "") => {
      const gen = ++fadeGenRef.current;
      const el = audioRef.current;
      if (!el || el.paused) {
        if (ownerRef.current && ownerAtStart && ownerRef.current !== ownerAtStart) return;
        applyIdleHard();
        return;
      }
      const startVol =
        el.volume > 0 ? el.volume : Math.max(0.05, resolveBgmVolumeGain(styleConfigRef.current));
      const steps = 10;
      const stepMs = Math.max(16, durationMs / steps);
      for (let i = 1; i <= steps; i += 1) {
        if (fadeGenRef.current !== gen) return;
        if (ownerRef.current && ownerAtStart && ownerRef.current !== ownerAtStart) return;
        el.volume = Math.max(0, startVol * (1 - i / steps));
        await sleep(stepMs);
      }
      if (fadeGenRef.current !== gen) return;
      if (ownerRef.current && ownerAtStart && ownerRef.current !== ownerAtStart) return;
      applyIdleHard();
    },
    [applyIdleHard]
  );

  const resolveUrlFromConfig = useCallback((config, key, index) => {
    return resolveShowcaseBgmUrl(
      config,
      key || visitKeyRef.current || "play",
      index ?? safeIndexRef.current
    );
  }, []);

  const tryPlayNow = useCallback(
    (url, gain) => {
      const el = ensureAudioEl();
      if (!url) return Promise.resolve(false);
      const targetGain = Math.max(0, Math.min(1, gain ?? resolveBgmVolumeGain(styleConfigRef.current)));
      el.volume = targetGain;
      const currentSrc = el.getAttribute("src") || "";
      const needLoad = currentSrc !== url;
      if (needLoad) {
        el.src = url;
        try {
          el.load();
        } catch {
          /* ignore */
        }
      }
      const run = () => {
        el.volume = targetGain;
        return el
          .play()
          .then(() => true)
          .catch((err) => {
            if (err?.name === "AbortError") {
              return el.play().then(() => true).catch(() => false);
            }
            return false;
          });
      };
      if (!needLoad && el.readyState >= 2) return run();
      if (el.readyState >= 3) return run();
      return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        const onReady = () => {
          el.removeEventListener("canplay", onReady);
          window.clearTimeout(timer);
          void run().then(finish);
        };
        el.addEventListener("canplay", onReady, { once: true });
        const timer = window.setTimeout(() => {
          el.removeEventListener("canplay", onReady);
          void run().then(finish);
        }, 8000);
      });
    },
    [ensureAudioEl]
  );

  const refreshUrlIfNeeded = useCallback(async (config) => {
    const idx = safeIndexRef.current;
    let url = resolveUrlFromConfig(config, visitKeyRef.current, idx);
    if (url) return { config, url };
    const bgm = config?.bgm;
    const soundId = String(bgm?.soundId || bgm?.playlist?.[idx]?.soundId || "").trim();
    if (!soundId) return { config, url: "" };
    try {
      const data = await fetchShowcaseSoundById(soundId);
      const fresh = String(data?.sound?.audioUrl || "").trim();
      if (!fresh || data?.linkBroken) return { config, url: "" };
      const nextBgm = { ...bgm, audioUrl: fresh, linkBroken: false };
      if (Array.isArray(nextBgm.playlist) && nextBgm.playlist[idx]) {
        nextBgm.playlist = nextBgm.playlist.map((t, i) =>
          i === idx ? { ...t, audioUrl: fresh, linkBroken: false } : t
        );
      }
      const nextConfig = { ...config, bgm: nextBgm };
      styleConfigRef.current = nextConfig;
      setStyleConfig(nextConfig);
      return { config: nextConfig, url: fresh };
    } catch {
      return { config, url: "" };
    }
  }, [resolveUrlFromConfig]);

  useEffect(() => {
    ensureAudioEl();
    const el = audioRef.current;
    if (!el) return undefined;
    if (phase === "idle") return undefined;

    el.volume = Math.max(0, Math.min(1, volumeGain));

    if (!bgmUrl) {
      el.pause();
      return undefined;
    }

    const token = `${playEpoch}|${visitSessionKey}|${safeIndex}|${bgmUrl}`;
    const prevToken = el.dataset.vluePlayToken || "";
    const currentSrc = el.getAttribute("src") || "";
    const sameSrc = currentSrc === bgmUrl;
    const alreadyPlaying = sameSrc && !el.paused && !el.ended;

    if (prevToken !== token) {
      el.dataset.vluePlayToken = token;
      /* 이미 같은 곡이 재생 중이면 load()/seek 하지 않음 — 미리듣기가 1초 만에 끊기던 주원인 */
      if (!alreadyPlaying) {
        if (!sameSrc) {
          el.src = bgmUrl;
          try {
            el.load();
          } catch {
            /* ignore */
          }
        } else if (playEpoch && phase !== "settings_preview") {
          try {
            el.currentTime = 0;
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (effectiveMuted) {
      el.pause();
      return undefined;
    }

    if (alreadyPlaying) return undefined;

    const tryPlay = () => {
      el.volume = Math.max(0, Math.min(1, volumeGain));
      el.play().catch(() => undefined);
    };
    tryPlay();
    el.addEventListener("canplay", tryPlay, { once: true });
    return () => {
      el.removeEventListener("canplay", tryPlay);
    };
  }, [bgmUrl, effectiveMuted, volumeGain, playEpoch, visitSessionKey, safeIndex, phase, ensureAudioEl]);

  const bumpPlayEpoch = useCallback(() => {
    playEpochRef.current += 1;
    setPlayEpoch(playEpochRef.current);
  }, []);

  const beginVisit = useCallback(
    (config) => {
      cancelFade();
      if (config) {
        styleConfigRef.current = config;
        setStyleConfig(config);
      }
      const key = newVisitKey();
      visitKeyRef.current = key;
      setVisitSessionKey(key);
      const bgm = config?.bgm || styleConfigRef.current?.bgm;
      const startIdx = syncPlayOrder(bgm, key);
      setTrackIndex(startIdx);
      setUserMuted(false);
      bumpPlayEpoch();
    },
    [bumpPlayEpoch, cancelFade, syncPlayOrder]
  );

  const setPlaybackPhase = useCallback(
    (next, opts = {}) => {
      const forceRestart = Boolean(opts.forceRestart);
      const owner = opts.owner != null ? String(opts.owner) : "";
      const steal = Boolean(opts.steal);
      const fade = Boolean(opts.fade);
      const fadeMs = Number(opts.fadeMs) > 0 ? Number(opts.fadeMs) : FADE_MS;

      /* 설정 미리듣기 중에는 캐러셀/케이스함 등이 phase·style 을 덮어쓰지 못함 */
      if (ownerRef.current === "settings" && owner !== "settings" && !steal) {
        return;
      }

      if (opts.styleConfig !== undefined) {
        styleConfigRef.current = opts.styleConfig;
        setStyleConfig(opts.styleConfig);
      }

      if (next === "idle") {
        if (owner && ownerRef.current && ownerRef.current !== owner && !steal) {
          return;
        }
        if (!owner && ownerRef.current && ownerRef.current !== "settings" && !steal) {
          /* owner 없는 idle 은 settings 등 비소유자 호출로 다른 면 BGM 을 끊지 않음 */
          return;
        }
        /* 설정 화면이 다른 면 BGM 을 뺏을 때 — fade/정지 중에도 바인딩 잠금 유지 */
        if (steal && owner) ownerRef.current = owner;
        if (fade) {
          void (async () => {
            await stopWithFade(fadeMs, steal ? "" : ownerRef.current || owner);
            if (steal && owner) ownerRef.current = owner;
          })();
          return;
        }
        cancelFade();
        applyIdleHard();
        if (steal && owner) ownerRef.current = owner;
        return;
      }

      cancelFade();
      if (owner) ownerRef.current = owner;

      let playKey = visitKeyRef.current;
      let playIndex = safeIndexRef.current;
      const needsRestart =
        forceRestart ||
        phaseRef.current === "idle" ||
        phaseRef.current === "call_active" ||
        !visitKeyRef.current;

      if ((next === "preview" || next === "replay" || next === "settings_preview") && needsRestart) {
        playKey = newVisitKey();
        visitKeyRef.current = playKey;
        playIndex = syncPlayOrder(styleConfigRef.current?.bgm, playKey);
        setVisitSessionKey(playKey);
        setTrackIndex(playIndex);
        bumpPlayEpoch();
      }

      setPhase(next);
      if (next === "call_active") setUserMuted(true);
      if (next === "replay" || next === "preview" || next === "settings_preview") {
        setTouchUnlocked(true);
        setUserMuted(false);
        const url = resolveUrlFromConfig(styleConfigRef.current, playKey || "live", playIndex);
        if (url) {
          const el = ensureAudioEl();
          const advance = isPlaylistAdvanceMode(styleConfigRef.current?.bgm);
          el.loop = !advance;
          el.dataset.vluePlayToken = `${playEpochRef.current}|${playKey}|${playIndex}|${url}`;
          void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current));
        }
      }
    },
    [
      bumpPlayEpoch,
      cancelFade,
      applyIdleHard,
      stopWithFade,
      tryPlayNow,
      ensureAudioEl,
      resolveUrlFromConfig,
      syncPlayOrder
    ]
  );

  const bindStyleConfig = useCallback((config, opts = {}) => {
    const owner = opts.owner != null ? String(opts.owner) : "";
    /* 설정 화면이 BGM 소유 중이면 캐러셀/케이스함 바인딩이 선택 곡을 덮어쓰지 않음 */
    if (ownerRef.current === "settings" && owner !== "settings") {
      return;
    }
    if (owner === "settings") ownerRef.current = "settings";
    styleConfigRef.current = config;
    setStyleConfig(config);
  }, []);

  const unlockFromUserGesture = useCallback(() => {
    setTouchUnlocked(true);
    const p = phaseRef.current;
    if (p !== "preview" && p !== "replay" && p !== "settings_preview") return;
    if (userMutedRef.current) return;
    const idx = safeIndexRef.current;
    const url = resolveUrlFromConfig(styleConfigRef.current, visitKeyRef.current || "gesture", idx);
    if (url) void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current));
  }, [tryPlayNow, resolveUrlFromConfig]);

  const previewInSettings = useCallback(
    (configOverride = null) => {
      const nextConfig =
        configOverride != null ? configOverride : styleConfigRef.current || { bgm: { mode: "none" } };
      /* 페이드 중이면 즉시 끊고 재생 — 설정 미리듣기는 fade 없이 바로 재생 */
      cancelFade();
      setPlaybackPhase("settings_preview", {
        forceRestart: true,
        owner: "settings",
        steal: true,
        styleConfig: nextConfig
      });
    },
    [setPlaybackPhase, cancelFade]
  );

  const stopSettingsPreview = useCallback(() => {
    /* fade 쓰면 다음 미리듣기와 레이스 — 설정에서는 즉시 정지 */
    setPlaybackPhase("idle", { owner: "settings", steal: true });
  }, [setPlaybackPhase]);

  /**
   * 가운데 버튼 — 실제로 안 나오면 재생, 나오면 일시정지.
   * (mute 토글이 아니라 play/pause. 제스처 안에서 play 호출)
   */
  const toggleUserMute = useCallback(
    (styleOverride = null) => {
      cancelFade();
      setTouchUnlocked(true);
      const el = ensureAudioEl();

      if (styleOverride) {
        styleConfigRef.current = styleOverride;
        setStyleConfig(styleOverride);
      }

      const cfg = styleConfigRef.current;
      let p = phaseRef.current;
      if (p === "idle" || p === "call_active") {
        ownerRef.current = ownerRef.current || "carousel";
        p = "preview";
        setPhase("preview");
      }

      const actuallyPlaying = Boolean(el && !el.paused && !el.ended);

      if (actuallyPlaying) {
        setUserMuted(true);
        el.pause();
        setAudioPlaying(false);
        return;
      }

      setUserMuted(false);
      const key = visitKeyRef.current || newVisitKey();
      visitKeyRef.current = key;
      setVisitSessionKey(key);
      const idx = safeIndexRef.current;

      const syncUrl = resolveUrlFromConfig(cfg, key, idx);
      if (syncUrl) {
        el.dataset.vluePlayToken = `${playEpochRef.current}|${key}|${idx}|${syncUrl}`;
        void tryPlayNow(syncUrl, resolveBgmVolumeGain(styleConfigRef.current)).then((ok) => {
          setAudioPlaying(Boolean(ok));
        });
        return;
      }

      /* URL 없으면 서버 재조회 후 재생 (제스처 이후라 일부 WebView 는 한 번 더 탭 필요할 수 있음) */
      void refreshUrlIfNeeded(cfg).then(({ url }) => {
        if (!url) return;
        el.dataset.vluePlayToken = `${playEpochRef.current}|${key}|${idx}|${url}`;
        void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current)).then((ok) => {
          setAudioPlaying(Boolean(ok));
        });
      });
    },
    [cancelFade, ensureAudioEl, refreshUrlIfNeeded, resolveUrlFromConfig, tryPlayNow]
  );

  const skipTrack = useCallback(
    (delta) => {
      const bgm = styleConfigRef.current?.bgm;
      const list = resolvePlaylistTracks(bgm);
      if (list.length <= 1) return;
      cancelFade();
      const mode = String(bgm?.playMode || "single");
      let nextTrackIdx = safeIndexRef.current;
      if (mode === "shuffle_selected" && playOrderRef.current.length > 1) {
        const len = playOrderRef.current.length;
        let pos = playOrderPosRef.current + delta;
        if (pos >= len || pos < 0) {
          playOrderRef.current = buildShuffledTrackOrder(
            len,
            `${visitKeyRef.current || "shuffle"}-${Date.now()}`
          );
          pos = ((pos % len) + len) % len;
        }
        playOrderPosRef.current = pos;
        nextTrackIdx = playOrderRef.current[pos] ?? 0;
      } else {
        nextTrackIdx = (safeIndexRef.current + delta + list.length) % list.length;
        playOrderPosRef.current = nextTrackIdx;
      }
      setTrackIndex(nextTrackIdx);
      setUserMuted(false);
      setTouchUnlocked(true);
      bumpPlayEpoch();
      const key = visitKeyRef.current || "live";
      const url = resolveUrlFromConfig(styleConfigRef.current, key, nextTrackIdx);
      if (url) {
        const el = ensureAudioEl();
        el.loop = !isPlaylistAdvanceMode(bgm);
        el.dataset.vluePlayToken = `${playEpochRef.current}|${key}|${nextTrackIdx}|${url}`;
        void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current));
      }
    },
    [bumpPlayEpoch, cancelFade, ensureAudioEl, resolveUrlFromConfig, tryPlayNow]
  );

  const skipPrev = useCallback(() => skipTrack(-1), [skipTrack]);
  const skipNext = useCallback(() => skipTrack(1), [skipTrack]);

  advanceTrackRef.current = () => {
    const bgm = styleConfigRef.current?.bgm;
    if (!isPlaylistAdvanceMode(bgm)) return;
    const p = phaseRef.current;
    if (p !== "preview" && p !== "replay" && p !== "settings_preview") return;
    skipTrack(1);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = !isPlaylistAdvanceMode(styleConfig?.bgm);
  }, [styleConfig?.bgm?.playMode, styleConfig?.bgm?.playlist, tracks.length]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.__vlueUnlockShowcaseBgm = () => {
      unlockFromUserGesture();
    };
    return () => {
      try {
        delete window.__vlueUnlockShowcaseBgm;
      } catch {
        /* ignore */
      }
    };
  }, [unlockFromUserGesture]);

  const value = useMemo(
    () => ({
      phase,
      styleConfig,
      bgmUrl,
      userMuted,
      touchUnlocked,
      proximityNear,
      effectiveMuted,
      isAudible,
      audioPlaying,
      volumeGain,
      visitSessionKey,
      trackIndex: safeIndex,
      tracks,
      canSkipTracks,
      setPlaybackPhase,
      bindStyleConfig,
      unlockFromUserGesture,
      previewInSettings,
      stopSettingsPreview,
      toggleUserMute,
      setUserMuted,
      skipPrev,
      skipNext,
      beginVisit
    }),
    [
      phase,
      styleConfig,
      bgmUrl,
      userMuted,
      touchUnlocked,
      proximityNear,
      effectiveMuted,
      isAudible,
      audioPlaying,
      volumeGain,
      visitSessionKey,
      safeIndex,
      tracks,
      canSkipTracks,
      setPlaybackPhase,
      bindStyleConfig,
      unlockFromUserGesture,
      previewInSettings,
      stopSettingsPreview,
      toggleUserMute,
      skipPrev,
      skipNext,
      beginVisit
    ]
  );

  return <ShowcaseBgmContext.Provider value={value}>{children}</ShowcaseBgmContext.Provider>;
}

export function useShowcaseBgm() {
  const ctx = useContext(ShowcaseBgmContext);
  if (!ctx) {
    throw new Error("useShowcaseBgm must be used within ShowcaseBgmProvider");
  }
  return ctx;
}
