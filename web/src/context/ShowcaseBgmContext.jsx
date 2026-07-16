import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  resolveShowcaseBgmUrl,
  isSoundCloudBgmMode,
  isYoutubeBgmMode,
  resolveShowcaseSoundCloudTrackUrl,
  resolveShowcaseYoutubeVideoId
} from "../lib/showcase/showcaseBgmPresets.js";
import { installShowcaseProximityBridge, subscribeShowcaseProximity } from "../lib/showcase/showcaseProximityBridge.js";
import ShowcaseSoundCloudPlayer from "../components/showcase/ShowcaseSoundCloudPlayer.jsx";
import ShowcaseYoutubePlayer from "../components/showcase/ShowcaseYoutubePlayer.jsx";

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
  const soundcloudMode = useMemo(() => isSoundCloudBgmMode(styleConfig), [styleConfig]);
  const soundcloudTrackUrl = useMemo(() => resolveShowcaseSoundCloudTrackUrl(styleConfig), [styleConfig]);
  const youtubeMode = useMemo(() => isYoutubeBgmMode(styleConfig), [styleConfig]);
  const youtubeVideoId = useMemo(() => resolveShowcaseYoutubeVideoId(styleConfig), [styleConfig]);

  const hasStreamBgm = soundcloudMode || youtubeMode;
  const shouldPlayAudio = phase === "replay" || phase === "preview";
  const forceMuted = phase === "call_active" || proximityNear;
  const effectiveMuted = forceMuted || userMuted || !shouldPlayAudio || (!bgmUrl && !hasStreamBgm);
  const streamMuted = forceMuted || userMuted || !shouldPlayAudio || !touchUnlocked;

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

    if (hasStreamBgm || effectiveMuted || !bgmUrl) {
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
  }, [bgmUrl, effectiveMuted, hasStreamBgm]);

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
      soundcloudMode,
      soundcloudTrackUrl,
      youtubeMode,
      youtubeVideoId,
      youtubeMuted: streamMuted,
      soundcloudMuted: streamMuted,
      touchUnlocked,
      unlockFromUserGesture,
      proximityNear,
      canToggleMute: shouldPlayAudio && Boolean(bgmUrl || hasStreamBgm) && !proximityNear
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
      soundcloudMode,
      soundcloudTrackUrl,
      youtubeMode,
      youtubeVideoId,
      streamMuted,
      touchUnlocked,
      unlockFromUserGesture,
      proximityNear,
      shouldPlayAudio,
      hasStreamBgm
    ]
  );

  return (
    <ShowcaseBgmContext.Provider value={value}>
      {children}
      {soundcloudMode && soundcloudTrackUrl ? (
        <div className="showcase-bgm-sc-host" aria-hidden>
          <ShowcaseSoundCloudPlayer
            key={soundcloudTrackUrl}
            trackUrl={soundcloudTrackUrl}
            muted={streamMuted}
            visual={false}
            hideUi
            className="showcase-bgm-sc-host__player"
            title="Showcase BGM audio"
          />
        </div>
      ) : null}
      {/* YouTube 레거시 설정 호환 */}
      {!soundcloudMode && youtubeMode && youtubeVideoId ? (
        <div className="showcase-bgm-yt-host" aria-hidden>
          <ShowcaseYoutubePlayer
            videoId={youtubeVideoId}
            muted={streamMuted}
            className="showcase-bgm-yt-host__player"
            title="Showcase BGM audio"
          />
        </div>
      ) : null}
    </ShowcaseBgmContext.Provider>
  );
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
      soundcloudMode: false,
      soundcloudTrackUrl: "",
      youtubeMode: false,
      youtubeVideoId: "",
      youtubeMuted: true,
      soundcloudMuted: true,
      touchUnlocked: false,
      unlockFromUserGesture: () => {},
      proximityNear: false,
      canToggleMute: false
    };
  }
  return ctx;
}
