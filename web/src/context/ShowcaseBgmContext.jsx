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
  /* 미리보기·리플레이·쇼케이스 열람 시 재생. 실통화(call_active)만 강제 무음 */
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
      audioRef.current.preload = "auto";
      audioRef.current.crossOrigin = "anonymous";
    }
    const el = audioRef.current;

    if (!bgmUrl) {
      el.pause();
      el.removeAttribute("src");
      try {
        el.load();
      } catch {
        /* ignore */
      }
      return undefined;
    }

    const currentSrc = el.getAttribute("src") || "";
    if (currentSrc !== bgmUrl) {
      el.src = bgmUrl;
      try {
        el.load();
      } catch {
        /* ignore */
      }
    }

    if (effectiveMuted) {
      el.pause();
      return undefined;
    }

    const tryPlay = () => {
      el.play().catch(() => undefined);
    };
    tryPlay();
    el.addEventListener("canplay", tryPlay, { once: true });
    return () => {
      el.removeEventListener("canplay", tryPlay);
      el.pause();
    };
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
    const el = audioRef.current;
    const url = resolveShowcaseBgmUrl(styleConfig);
    if (el && url && phase !== "call_active") {
      if ((el.getAttribute("src") || "") !== url) {
        el.src = url;
        el.load();
      }
      el.play().catch(() => undefined);
    }
  }, [phase, styleConfig]);

  const toggleUserMute = useCallback(() => {
    setUserMuted((v) => {
      const next = !v;
      const el = audioRef.current;
      if (el && !next) el.play().catch(() => undefined);
      if (el && next) el.pause();
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.__vlueUnlockShowcaseBgm = () => {
      setTouchUnlocked(true);
      setUserMuted(false);
      const el = audioRef.current;
      if (el && bgmUrl) el.play().catch(() => undefined);
    };
    return () => {
      try {
        delete window.__vlueUnlockShowcaseBgm;
      } catch {
        /* ignore */
      }
    };
  }, [bgmUrl]);
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
