import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  buildShuffledTrackOrder,
  isPlaylistAdvanceMode,
  resolveBgmVolumeGain,
  resolvePlaylistTracks,
  resolveShowcaseBgmUrl
} from "../lib/showcase/showcaseBgmPresets.js";
import { fetchShowcaseSoundById } from "../lib/showcase/showcaseSoundApi.js";
import { readActiveShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import {
  getProximityState,
  installShowcaseProximityBridge,
  subscribeShowcaseProximity
} from "../lib/showcase/showcaseProximityBridge.js";
import {
  clearShowcaseBgmMediaSession,
  syncShowcaseBgmMediaSession
} from "../lib/showcase/showcaseBgmMediaSession.js";

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
  const peerDisplayRef = useRef(null);
  const phaseRef = useRef("idle");
  const userMutedRef = useRef(false);
  /** 셔플/순서 재생용 — tracks 인덱스 배열 */
  const playOrderRef = useRef([0]);
  const playOrderPosRef = useRef(0);
  const advanceTrackRef = useRef(() => {});
  const backgroundPausedRef = useRef(false);
  const [phase, setPhase] = useState("idle");
  const [styleConfig, setStyleConfig] = useState(null);
  const [userMuted, setUserMuted] = useState(false);
  const [touchUnlocked, setTouchUnlocked] = useState(false);
  const [proximityNear, setProximityNear] = useState(() => getProximityState() === "near");
  const [visitSessionKey, setVisitSessionKey] = useState("");
  const [trackIndex, setTrackIndex] = useState(0);
  const [playEpoch, setPlayEpoch] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [peerDisplay, setPeerDisplay] = useState(null);

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
    backgroundPausedRef.current = false;
    visitKeyRef.current = "";
    setVisitSessionKey("");
    ownerRef.current = "";
    clearShowcaseBgmMediaSession();
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
      /* 버퍼 완료(canplay)를 기다리지 않고 바로 play — 체감 지연·missed canplay(최대 8s) 방지 */
      if (!needLoad && el.readyState >= 2) return run();
      return run().then((ok) => {
        if (ok) return true;
        if (el.readyState >= 2) return run();
        return new Promise((resolve) => {
          let settled = false;
          const finish = (v) => {
            if (settled) return;
            settled = true;
            resolve(v);
          };
          const onReady = () => {
            el.removeEventListener("canplay", onReady);
            window.clearTimeout(timer);
            void run().then(finish);
          };
          el.addEventListener("canplay", onReady, { once: true });
          /* load() 직후 동기 canplay / 캐시 hit — 리스너 등록 전에 끝난 경우 보정 */
          if (el.readyState >= 2) {
            onReady();
            return;
          }
          const timer = window.setTimeout(() => {
            el.removeEventListener("canplay", onReady);
            void run().then(finish);
          }, 8000);
        });
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
      /* URL 이 잠깐 비어도 이미 재생 중이면 끊지 않음 (삭제·스타일 스왑 중 공백) */
      if (!el.paused && (el.getAttribute("src") || el.src)) {
        return undefined;
      }
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

    if (backgroundPausedRef.current) {
      el.pause();
      return undefined;
    }

    if (alreadyPlaying) return undefined;

    /* settings_preview 는 setPlaybackPhase→tryPlayNow 가 제스처 안에서 이미 play 함.
       여기서 load/play 를 한 번 더 하면 버퍼가 리셋되어 반응이 느려짐 */
    if (phase === "settings_preview" && sameSrc) {
      return undefined;
    }

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

  /** 앱·탭이 백그라운드로 가면 BGM 일시정지, 복귀 시 이어 재생 */
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const shouldResumePhase = (p) =>
      p === "preview" || p === "replay" || p === "settings_preview";

    const pauseForBackground = () => {
      const p = phaseRef.current;
      if (!shouldResumePhase(p)) return;
      backgroundPausedRef.current = true;
      cancelFade();
      const el = audioRef.current;
      if (el) {
        el.pause();
        setAudioPlaying(false);
      }
    };

    const resumeFromBackground = () => {
      if (!backgroundPausedRef.current) return;
      backgroundPausedRef.current = false;
      const p = phaseRef.current;
      if (!shouldResumePhase(p) || userMutedRef.current) return;
      ensureAudioEl();
      const url = resolveUrlFromConfig(
        styleConfigRef.current,
        visitKeyRef.current,
        safeIndexRef.current
      );
      if (!url) return;
      void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current)).then((ok) => {
        setAudioPlaying(Boolean(ok));
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") pauseForBackground();
      else if (document.visibilityState === "visible") resumeFromBackground();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("vlue-app-background", pauseForBackground);
    window.addEventListener("vlue-app-foreground", resumeFromBackground);
    window.addEventListener("pagehide", pauseForBackground);
    window.addEventListener("pageshow", resumeFromBackground);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("vlue-app-background", pauseForBackground);
      window.removeEventListener("vlue-app-foreground", resumeFromBackground);
      window.removeEventListener("pagehide", pauseForBackground);
      window.removeEventListener("pageshow", resumeFromBackground);
    };
  }, [cancelFade, ensureAudioEl, resolveUrlFromConfig, tryPlayNow]);

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
        /* release:true — 소유권을 완전히 내려놓고 다른 면(캐러셀)이 이어받을 수 있게 */
        if (opts.release) {
          cancelFade();
          applyIdleHard();
          return;
        }
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
      const cfgEarly = styleConfigRef.current;
      const urlEarly = resolveUrlFromConfig(
        cfgEarly,
        playKey || "live",
        playIndex
      );
      const elEarly = audioRef.current;
      const alreadyPlayingSame =
        Boolean(elEarly) &&
        !elEarly.paused &&
        !elEarly.ended &&
        Boolean(urlEarly) &&
        (elEarly.getAttribute("src") === urlEarly || elEarly.src === urlEarly);

      let needsRestart =
        forceRestart ||
        phaseRef.current === "idle" ||
        phaseRef.current === "call_active" ||
        !visitKeyRef.current;

      /* 같은 곡이 이미 재생 중이면 idle 잔상·콜백 재진입으로 재시작하지 않음 (autoplay 차단 방지) */
      if (needsRestart && !forceRestart && alreadyPlayingSame) {
        needsRestart = false;
        if (phaseRef.current === "idle") {
          setPhase(next);
          setTouchUnlocked(true);
          setUserMuted(false);
          setAudioPlaying(true);
          return;
        }
      }

      if ((next === "preview" || next === "replay" || next === "settings_preview") && needsRestart) {
        playKey = newVisitKey();
        visitKeyRef.current = playKey;
        playIndex = syncPlayOrder(styleConfigRef.current?.bgm, playKey);
        setVisitSessionKey(playKey);
        setTrackIndex(playIndex);
        bumpPlayEpoch();
      }

    setPhase(next);
    if (next === "call_active") {
      setUserMuted(true);
      const el = audioRef.current;
      if (el) {
        el.pause();
        setAudioPlaying(false);
      }
    }
      if (next === "replay" || next === "preview" || next === "settings_preview") {
      setTouchUnlocked(true);
      setUserMuted(false);
        const cfg = styleConfigRef.current;
        const url = resolveUrlFromConfig(cfg, playKey || "live", playIndex);
        if (url) {
          const el = ensureAudioEl();
          const advance = isPlaylistAdvanceMode(cfg?.bgm);
          el.loop = !advance;
          el.dataset.vluePlayToken = `${playEpochRef.current}|${playKey}|${playIndex}|${url}`;
          void tryPlayNow(url, resolveBgmVolumeGain(cfg));
        } else {
          /* 케이스함·피어: soundId만 있고 서명 URL이 비어 있으면 서버에서 재조회 */
          void refreshUrlIfNeeded(cfg).then(({ url: fresh, config: nextCfg }) => {
            if (!fresh) return;
            if (phaseRef.current !== next && phaseRef.current !== "preview" && phaseRef.current !== "replay") {
              return;
            }
            const el = ensureAudioEl();
            const advance = isPlaylistAdvanceMode(nextCfg?.bgm || cfg?.bgm);
            el.loop = !advance;
            el.dataset.vluePlayToken = `${playEpochRef.current}|${playKey}|${playIndex}|${fresh}`;
            void tryPlayNow(fresh, resolveBgmVolumeGain(nextCfg || cfg));
          });
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
      syncPlayOrder,
      refreshUrlIfNeeded
    ]
  );

  const bindBgmPeerDisplay = useCallback((peer) => {
    if (!peer || typeof peer !== "object") {
      peerDisplayRef.current = null;
      setPeerDisplay(null);
      return;
    }
    const next = {
      name: String(peer.name || peer.displayName || "").trim(),
      phone: String(peer.phone || "").trim(),
      photoUrl: String(peer.photoUrl || peer.avatarUrl || "").trim(),
      avatarUrl: String(peer.avatarUrl || peer.photoUrl || "").trim(),
      handle: String(peer.handle || peer.publicHandle || "").trim()
    };
    peerDisplayRef.current = next;
    setPeerDisplay(next);
  }, []);

  useEffect(() => {
    if (!isAudible) {
      clearShowcaseBgmMediaSession();
      return undefined;
    }
    syncShowcaseBgmMediaSession({
      peer: peerDisplay,
      styleConfig,
      trackIndex: safeIndex,
      visitSessionKey,
      playing: true
    });
    return () => clearShowcaseBgmMediaSession();
  }, [isAudible, styleConfig, safeIndex, visitSessionKey, playEpoch, audioPlaying, peerDisplay]);

  const bindStyleConfig = useCallback((config, opts = {}) => {
    const owner = opts.owner != null ? String(opts.owner) : "";
    /* 설정 화면이 BGM 소유 중이면 캐러셀/케이스함 바인딩이 선택 곡을 덮어쓰지 않음 */
    if (ownerRef.current === "settings" && owner !== "settings") {
      return;
    }
    if (owner === "settings") ownerRef.current = "settings";
    /* 같은 곡인데 저장본 audioUrl 이 비어 있으면 이미 갱신된 재생 URL 을 유지 */
    let next = config;
    const prevBgm = styleConfigRef.current?.bgm;
    const nextBgm = config?.bgm;
    if (prevBgm && nextBgm && String(prevBgm.mode) === String(nextBgm.mode)) {
      const sameSound =
        String(prevBgm.soundId || "").trim() === String(nextBgm.soundId || "").trim();
      const prevUrl = String(prevBgm.audioUrl || "").trim();
      const nextUrl = String(nextBgm.audioUrl || "").trim();
      if (sameSound && prevUrl && !nextUrl) {
        next = { ...config, bgm: { ...nextBgm, audioUrl: prevUrl } };
      }
    }
    styleConfigRef.current = next;
    setStyleConfig(next);
  }, []);

  const unlockFromUserGesture = useCallback(() => {
    setTouchUnlocked(true);
    if (userMutedRef.current) return;
    const p = phaseRef.current;
    const idx = safeIndexRef.current;
    let url = resolveUrlFromConfig(styleConfigRef.current, visitKeyRef.current || "gesture", idx);
    if (!url) {
      try {
        const live = readActiveShowcaseStyle();
        if (live) {
          styleConfigRef.current = live;
          setStyleConfig(live);
          url = resolveUrlFromConfig(live, visitKeyRef.current || "gesture", idx);
        }
      } catch {
        /* ignore */
      }
    }
    if (!url) return;
    /* 실통화 무음 유지 — 미니→풀 복원 제스처로 preview 를 열지 않음 */
    if (p === "call_active") return;
    /* 이미 preview/replay 중이면 제스처로 autoplay 재시도 */
    if (p === "preview" || p === "replay" || p === "settings_preview") {
      void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current));
      return;
    }
    /* idle 등 — www 데스크 첫 클릭에서 미리보기 재생 시작 */
    if (p === "idle" || !p) {
      setPlaybackPhase("preview", {
        forceRestart: true,
        steal: true,
        owner: "carousel",
        styleConfig: styleConfigRef.current
      });
    }
  }, [tryPlayNow, resolveUrlFromConfig, setPlaybackPhase]);

  /** 탭 제스처만 기록 — 재생은 시작하지 않음 (로딩 중 선재생 방지) */
  const unlockAudioGesture = useCallback(() => {
    setTouchUnlocked(true);
  }, []);

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

  /** 설정 목록 미리듣기용 — 상태 폭주 없이 메인 Audio 만 즉시 멈춤 */
  const hushMainAudio = useCallback((opts = {}) => {
    cancelFade();
    const el = audioRef.current;
    if (el) {
      el.pause();
      setAudioPlaying(false);
    }
    if (phaseRef.current !== "idle" && phaseRef.current !== "call_active") {
      phaseRef.current = "idle";
      setPhase("idle");
    }
    /* www 데스크: 미리듣기 중에도 settings 소유권 잠금 금지 — 미리보기가 이어받을 수 있어야 함 */
    if (opts.lockSettings !== false) {
      ownerRef.current = "settings";
    }
  }, [cancelFade]);

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
      /* 셔플 큐가 트랙 수와 어긋나면 재생성 (입장 후 목록만 바뀐 경우) */
      if (mode === "shuffle_selected" && playOrderRef.current.length !== list.length) {
        syncPlayOrder(bgm, visitKeyRef.current || `shuffle-${Date.now()}`);
      }
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
      /* refreshUrlIfNeeded 가 읽는 인덱스를 즉시 맞춤 (setState 반영 전) */
      safeIndexRef.current = nextTrackIdx;
      setTrackIndex(nextTrackIdx);
      setUserMuted(false);
      setTouchUnlocked(true);
      bumpPlayEpoch();
      const key = visitKeyRef.current || "live";
      const el = ensureAudioEl();
      el.loop = !isPlaylistAdvanceMode(bgm);
      const startUrl = (url) => {
        if (!url) return;
        el.dataset.vluePlayToken = `${playEpochRef.current}|${key}|${nextTrackIdx}|${url}`;
        void tryPlayNow(url, resolveBgmVolumeGain(styleConfigRef.current));
      };
      const url = resolveUrlFromConfig(styleConfigRef.current, key, nextTrackIdx);
      if (url) {
        startUrl(url);
        return;
      }
      /* 서명 URL 만료·미포함 — soundId 로 재조회 후 재생 */
      void refreshUrlIfNeeded(styleConfigRef.current).then(({ url: fresh }) => {
        startUrl(fresh);
      });
    },
    [
      bumpPlayEpoch,
      cancelFade,
      ensureAudioEl,
      refreshUrlIfNeeded,
      resolveUrlFromConfig,
      syncPlayOrder,
      tryPlayNow
    ]
  );

  const skipPrev = useCallback(() => skipTrack(-1), [skipTrack]);
  const skipNext = useCallback(() => skipTrack(1), [skipTrack]);

  advanceTrackRef.current = () => {
    const bgm = styleConfigRef.current?.bgm;
    if (!isPlaylistAdvanceMode(bgm)) return;
    const p = phaseRef.current;
    /* 프로필·케이스함·실통화 미리보기 — 곡이 끝나면 다음 곡 */
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
      bindBgmPeerDisplay,
      unlockFromUserGesture,
      unlockAudioGesture,
      previewInSettings,
      stopSettingsPreview,
      hushMainAudio,
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
      bindBgmPeerDisplay,
      unlockFromUserGesture,
      unlockAudioGesture,
      previewInSettings,
      stopSettingsPreview,
      hushMainAudio,
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
    /* Overlay WebView 가 Provider 밖에 떠도 Showcase가 크래시하지 않게 no-op */
    return {
      visitSessionKey: "",
      trackIndex: 0,
      playEpoch: 0,
      phase: "idle",
      styleConfig: null,
      bindStyleConfig: () => {},
      bindBgmPeerDisplay: () => {},
      setPlaybackPhase: () => {},
      unlockFromUserGesture: () => {},
      unlockAudioGesture: () => {},
      effectiveMuted: true,
      canToggleMute: false,
      toggleMute: () => {},
      bgmUrl: null,
      stopSettingsPreview: () => {},
      hushMainAudio: () => {},
      audioPlaying: false,
      isAudible: false,
      canSkipTracks: false,
      skipTrack: () => {}
    };
  }
  return ctx;
}
