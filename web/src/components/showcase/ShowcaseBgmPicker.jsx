import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Search, Sparkles, Volume2 } from "lucide-react";
import {
  buildShowcaseBgmPresets,
  getBgmPresetById,
  SHOWCASE_BGM_THEMES,
  showcaseBgmUrlCandidates
} from "../../lib/showcase/showcaseBgmPresets.js";
import {
  extractYoutubeVideoId,
  fetchYoutubeMeta,
  matchYoutubeByKeyword,
  buildYoutubeEmbedUrl,
  postYoutubeCommand
} from "../../lib/showcase/showcaseYoutube.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

/** 숏폼 감성 미리듣기 */
const PREVIEW_MS = 22000;

/**
 * 릴스 감성 YouTube 차트 + URL 지정
 * 실제 쇼케이스 송출은 음향만(영상 화면은 붙지 않음). 아래 미리보기는 곡 확인용.
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [theme, setTheme] = useState("all");
  const [ytQuery, setYtQuery] = useState(value?.youtube?.query || "");
  const [ytBusy, setYtBusy] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEmbed, setPreviewEmbed] = useState("");
  const audioRef = useRef(null);
  const ytIframeRef = useRef(null);
  const previewTimerRef = useRef(0);
  const previewTokenRef = useRef(0);
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();

  const filtered = useMemo(() => buildShowcaseBgmPresets(theme), [theme]);
  const weekLabel = useMemo(() => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}년 ${week}주차 차트`;
  }, []);

  const stopPreview = () => {
    window.clearTimeout(previewTimerRef.current);
    previewTokenRef.current += 1;
    const a = audioRef.current;
    if (a) {
      try {
        a.oncanplay = null;
        a.onerror = null;
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    setPreviewEmbed("");
    setPreviewId("");
    setPreviewLoading(false);
  };

  useEffect(() => {
    setPlaybackPhase("idle");
    return () => {
      stopPreview();
      setPlaybackPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPlaybackPhase]);

  const forceYoutubeUnmute = () => {
    const iframe = ytIframeRef.current;
    if (!iframe) return;
    postYoutubeCommand(iframe, "playVideo");
    postYoutubeCommand(iframe, "unMute");
    postYoutubeCommand(iframe, "setVolume", [100]);
  };

  const playYoutubePreview = (videoId, trackId) => {
    // mute=1로 로드 후 클릭 제스처 안에서 unMute (모바일 autoplay 정책)
    const embed = buildYoutubeEmbedUrl(videoId, { muted: true, autoplay: true, loop: true });
    if (!embed) {
      setPreviewError("미리듣기 영상을 열 수 없습니다.");
      return;
    }
    unlockFromUserGesture();
    stopPreview();
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewId(trackId);
    setPreviewEmbed(embed);
    setPlaybackPhase("idle");
    window.setTimeout(() => {
      setPreviewLoading(false);
      forceYoutubeUnmute();
    }, 600);
    window.setTimeout(forceYoutubeUnmute, 1400);
    window.setTimeout(forceYoutubeUnmute, 2800);
    previewTimerRef.current = window.setTimeout(() => {
      stopPreview();
    }, PREVIEW_MS);
  };

  const playMp3Preview = (presetId) => {
    const preset = getBgmPresetById(presetId);
    const candidates = preset?.urlFallbacks?.length
      ? [preset.url, ...preset.urlFallbacks].filter(Boolean)
      : showcaseBgmUrlCandidates(preset?.helixN || 1);
    if (!candidates.length) {
      setPreviewError("미리듣기 음원을 찾을 수 없습니다.");
      return;
    }
    stopPreview();
    setPreviewError("");
    setPreviewLoading(true);
    setPlaybackPhase("idle");
    const token = previewTokenRef.current;
    setPreviewId(presetId);

    const tryUrl = (idx) => {
      if (previewTokenRef.current !== token) return;
      if (idx >= candidates.length) {
        setPreviewError("음원을 불러오지 못했습니다. YouTube 곡을 선택하거나 URL로 지정해 주세요.");
        setPreviewLoading(false);
        setPreviewId("");
        return;
      }
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = 0.85;
      audioRef.current = audio;
      let settled = false;
      const fail = () => {
        if (previewTokenRef.current !== token || settled) return;
        settled = true;
        tryUrl(idx + 1);
      };
      const startPlay = () => {
        if (previewTokenRef.current !== token || settled) return;
        setPreviewLoading(false);
        setPreviewError("");
        audio.play().then(() => {
          settled = true;
        }).catch(fail);
      };
      audio.onerror = fail;
      audio.oncanplay = startPlay;
      audio.onloadeddata = startPlay;
      audio.src = candidates[idx];
      try {
        audio.load();
      } catch {
        fail();
      }
      window.setTimeout(() => {
        if (previewTokenRef.current !== token || settled) return;
        if (audio.readyState >= 2) startPlay();
      }, 2000);
    };

    tryUrl(0);
    previewTimerRef.current = window.setTimeout(() => {
      if (previewTokenRef.current !== token) return;
      stopPreview();
    }, PREVIEW_MS);
  };

  const selectTrack = (track) => {
    if (track.kind === "youtube" || track.videoId) {
      onChange({
        mode: "youtube",
        presetId: track.id,
        youtube: {
          videoId: track.videoId,
          title: track.label,
          artist: track.artist || "",
          query: track.label
        }
      });
      playYoutubePreview(track.videoId, track.id);
      return;
    }
    onChange({ mode: "preset", presetId: track.id, youtube: { videoId: "", title: "", artist: "", query: "" } });
    playMp3Preview(track.id);
  };

  const mapYoutube = async () => {
    const q = ytQuery.trim();
    if (!q) return;
    stopPreview();
    setYtBusy(true);
    try {
      let videoId = extractYoutubeVideoId(q);
      let title = "";
      let artist = "";
      if (!videoId) {
        const matched = matchYoutubeByKeyword(q);
        if (matched) {
          videoId = matched.videoId;
          title = matched.title;
          artist = matched.artist;
        }
      }
      if (videoId && !title) {
        const meta = await fetchYoutubeMeta(videoId);
        if (meta) {
          videoId = meta.videoId;
          title = meta.title;
          artist = meta.artist;
        }
      }
      if (!videoId) {
        setPreviewError("YouTube 영상 ID 또는 URL을 확인해 주세요.");
        return;
      }
      onChange({
        mode: "youtube",
        presetId: "",
        youtube: { videoId, title, artist, query: q }
      });
      playYoutubePreview(videoId, `yt-${videoId}`);
    } finally {
      setYtBusy(false);
    }
  };

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>이번 주 릴스 감성 TOP · {weekLabel}</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        실제 음악(YouTube)입니다. 쇼케이스에 적용되면 <strong>음향만</strong> 나갑니다(영상 화면은 붙지 않음).
        곡을 누르면 선택 + 약 {PREVIEW_MS / 1000}초 미리듣기.
      </p>
      <p className="showcase-bgm-picker__volume-tip" role="note">
        소리가 안 들리면 폰 상단의 무음(스피커 슬래시)을 끄고, 미디어 볼륨을 올려 주세요.
      </p>

      <div className="showcase-bgm-picker__themes">
        {SHOWCASE_BGM_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`showcase-bgm-picker__theme${theme === t.id ? " active" : ""}`}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="showcase-bgm-picker__grid">
        {filtered.map((p) => {
          const active =
            (value?.mode === "youtube" && value?.youtube?.videoId === p.videoId) ||
            (value?.mode === "preset" && value?.presetId === p.id) ||
            (value?.presetId === p.id && value?.youtube?.videoId === p.videoId);
          const playing = previewId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`showcase-bgm-picker__card${active ? " active" : ""}${playing ? " is-previewing" : ""}`}
              onClick={() => selectTrack(p)}
            >
              {playing ? (
                <Volume2 size={14} className="showcase-bgm-picker__icon" aria-hidden />
              ) : (
                <Music size={14} className="showcase-bgm-picker__icon" aria-hidden />
              )}
              <span className="showcase-bgm-picker__label">
                {p.rank ? `${p.rank}. ` : ""}
                {p.label}
              </span>
              <small>
                {playing
                  ? previewLoading
                    ? "불러오는 중…"
                    : "미리듣기 중…"
                  : p.artist
                    ? `${p.tag} · ${p.artist}`
                    : p.tag}
              </small>
            </button>
          );
        })}
      </div>

      {previewEmbed ? (
        <div className="showcase-bgm-picker__yt-preview">
          <iframe
            ref={ytIframeRef}
            title="BGM preview"
            src={previewEmbed}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="showcase-bgm-picker__yt-iframe"
            onLoad={forceYoutubeUnmute}
          />
          <p className="showcase-bgm-picker__yt-caption">미리듣기용 화면 · 실제 쇼케이스에는 소리만 재생됩니다</p>
        </div>
      ) : null}

      {previewError ? (
        <p className="showcase-bgm-picker__preview-error" role="status">
          {previewError}
        </p>
      ) : null}

      <div className="showcase-bgm-picker__youtube">
        <p className="showcase-bgm-picker__yt-title">
          <Search size={13} aria-hidden /> 내 쇼케이스 배경음악 검색·지정
        </p>
        <div className="showcase-bgm-picker__yt-row">
          <input
            className={`showcase-style-settings__input flex-1 ${inputCls}`}
            placeholder="노래 제목·키워드 또는 YouTube URL"
            value={ytQuery}
            onChange={(e) => setYtQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mapYoutube()}
          />
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={mapYoutube} disabled={ytBusy}>
            {ytBusy ? "…" : "지정"}
          </button>
        </div>
        {value?.mode === "youtube" && value?.youtube?.videoId ? (
          <p className="showcase-bgm-picker__yt-selected">
            ✓ {value.youtube.title || "YouTube"}
            {value.youtube.artist ? ` — ${value.youtube.artist}` : ""}
          </p>
        ) : (
          <p className="showcase-bgm-picker__yt-hint">
            인기 상업곡은 저작권상 YouTube로만 재생됩니다. Audio Library·공개 스트림 권장.
          </p>
        )}
      </div>
    </div>
  );
}
