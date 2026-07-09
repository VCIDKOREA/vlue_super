import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { resolveShowcaseBgmUrl, isYoutubeBgmMode } from "../lib/showcase/showcaseBgmPresets.js";
import { installShowcaseProximityBridge, subscribeShowcaseProximity } from "../lib/showcase/showcaseProximityBridge.js";

/** @typedef {'call_active' | 'replay' | 'preview' | 'idle'} ShowcasePlaybackPhase */

const ShowcaseBgmContext = createContext(null);

export function ShowcaseBgmProvider({ children }) {
  const audioRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [styleConfig, setStyleConfig] = useState(null);
  const [userMuted, setUserMuted] = useState(false);
  const [touchUnlocked, setTouchUnlocked] = useState(false);
  const [proximityNear, setProximityNear] = useState(false);

  const bgmUrl = useMemo(() => resolveShowcaseBgmUrl(styleConfig), [styleConfig]);
  const youtubeMode = useMemo(() => isYoutubeBgmMode(styleConfig), [styleConfig]);
  const youtubeVideoId = styleConfig?.bgm?.youtube?.videoId || "";

  const shouldPlayAudio = phase === "replay" || phase === "preview";
  const forceMuted = phase === "call_active" || proximityNear;
  const effectiveMuted = forceMuted || userMuted || !shouldPlayAudio || (!bgmUrl && !youtubeMode);
  const youtubeMuted = forceMuted || userMuted || !shouldPlayAudio || !touchUnlocked;

  useEffect(() => {
    installShowcaseProximityBridge();
    return subscribeShowcaseProximity((state) => setProximityNear(state === "near"));
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.preload = "metadata";
    }
    const el = audioRef.current;

    if (youtubeMode || effectiveMuted || !bgmUrl) {
      el.pause();
      if (!bgmUrl) el.removeAttribute("src");
      return undefined;
    }

    if (el.src !== bgmUrl) {
      el.src = bgmUrl;
      el.load();
    }

    el.play().catch(() => undefined);
    return () => el.pause();
  }, [bgmUrl, effectiveMuted, youtubeMode]);

  const setPlaybackPhase = useCallback((next) => {
    setPhase(next);
    if (next === "call_active") setUserMuted(true);
    if (next === "replay" || next === "preview") {
      setTouchUnlocked(true);
      setUserMuted(false);
    }
  }, []);

  const bindStyleConfig = useCallback((config) => {
    setStyleConfig(config);
  }, []);

  const unlockFromUserGesture = useCallback(() => {
    setTouchUnlocked(true);
    if (phase !== "call_active") setUserMuted(false);
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.__vlueUnlockShowcaseBgm = unlockFromUserGesture;
    return () => {
      delete window.__vlueUnlockShowcaseBgm;
    };
  }, [unlockFromUserGesture]);

  const toggleMute = useCallback(() => {
    if (phase === "call_active" || proximityNear) return;
    setUserMuted((m) => !m);
  }, [phase, proximityNear]);

  const value = useMemo(
    () => ({
      phase,
      setPlaybackPhase,
      bindStyleConfig,
      userMuted,
      toggleMute,
      effectiveMuted,
      forceMuted,
      bgmUrl,
      youtubeMode,
      youtubeVideoId,
      youtubeMuted,
      touchUnlocked,
      unlockFromUserGesture,
      proximityNear,
      canToggleMute: shouldPlayAudio && Boolean(bgmUrl || youtubeMode) && !proximityNear
    }),
    [
      phase,
      setPlaybackPhase,
      bindStyleConfig,
      userMuted,
      toggleMute,
      effectiveMuted,
      forceMuted,
      bgmUrl,
      youtubeMode,
      youtubeVideoId,
      youtubeMuted,
      touchUnlocked,
      unlockFromUserGesture,
      proximityNear,
      shouldPlayAudio
    ]
  );

  return <ShowcaseBgmContext.Provider value={value}>{children}</ShowcaseBgmContext.Provider>;
}

export function useShowcaseBgm() {
  const ctx = useContext(ShowcaseBgmContext);
  if (!ctx) {
    return {
      phase: "idle",
      setPlaybackPhase: () => {},
      bindStyleConfig: () => {},
      userMuted: true,
      toggleMute: () => {},
      effectiveMuted: true,
      forceMuted: true,
      bgmUrl: null,
      youtubeMode: false,
      youtubeVideoId: "",
      youtubeMuted: true,
      touchUnlocked: false,
      unlockFromUserGesture: () => {},
      proximityNear: false,
      canToggleMute: false
    };
  }
  return ctx;
}
