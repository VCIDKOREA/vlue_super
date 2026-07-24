import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { resolveShowcaseBgmUrl } from "../lib/showcase/showcaseBgmPresets.js";
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
  const shouldPlayAudio = phase === "replay" || phase === "preview";
  const forceMuted = phase === "call_active" || proximityNear;
  const effectiveMuted = forceMuted || userMuted || !shouldPlayAudio || !bgmUrl;

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

    if (effectiveMuted || !bgmUrl) {
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
  }, [bgmUrl, effectiveMuted]);

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

  const toggleUserMute = useCallback(() => {
    setUserMuted((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      phase,
      styleConfig,
      bgmUrl,
      userMuted,
      touchUnlocked,
      proximityNear,
      effectiveMuted,
      setPlaybackPhase,
      bindStyleConfig,
      unlockFromUserGesture,
      toggleUserMute,
      setUserMuted
    }),
    [
      phase,
      styleConfig,
      bgmUrl,
      userMuted,
      touchUnlocked,
      proximityNear,
      effectiveMuted,
      setPlaybackPhase,
      bindStyleConfig,
      unlockFromUserGesture,
      toggleUserMute
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
