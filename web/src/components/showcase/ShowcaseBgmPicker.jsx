import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Search, Sparkles, Volume2 } from "lucide-react";
import {
  getBgmPresetById,
  SHOWCASE_BGM_PRESETS,
  SHOWCASE_BGM_THEMES
} from "../../lib/showcase/showcaseBgmPresets.js";
import {
  extractYoutubeVideoId,
  fetchYoutubeMeta,
  matchYoutubeByKeyword
} from "../../lib/showcase/showcaseYoutube.js";

const PREVIEW_MS = 8000;

/**
 * RF 큐레이션 + 유튜브 검색/지정 BGM 피커
 * 프리셋 탭 시 선택 + 짧은 미리듣기
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [theme, setTheme] = useState("all");
  const [ytQuery, setYtQuery] = useState(value?.youtube?.query || "");
  const [ytBusy, setYtBusy] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const audioRef = useRef(null);
  const previewTimerRef = useRef(0);

  const filtered = useMemo(() => {
    if (theme === "all") return SHOWCASE_BGM_PRESETS;
    return SHOWCASE_BGM_PRESETS.filter((p) => p.theme === theme);
  }, [theme]);

  const stopPreview = () => {
    window.clearTimeout(previewTimerRef.current);
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    setPreviewId("");
  };

  useEffect(() => () => stopPreview(), []);

  const playPreview = (presetId) => {
    const preset = getBgmPresetById(presetId);
    if (!preset?.url) {
      setPreviewError("미리듣기 음원을 찾을 수 없습니다.");
      return;
    }
    stopPreview();
    setPreviewError("");
    const audio = new Audio(preset.url);
    audio.preload = "auto";
    audio.volume = 0.85;
    audioRef.current = audio;
    setPreviewId(presetId);
    audio.play().catch(() => {
      setPreviewError("미리듣기를 재생할 수 없습니다. 네트워크·음원 URL을 확인해 주세요.");
      setPreviewId("");
    });
    previewTimerRef.current = window.setTimeout(() => {
      stopPreview();
    }, PREVIEW_MS);
  };

  const selectPreset = (presetId) => {
    onChange({ mode: "preset", presetId, youtube: { videoId: "", title: "", artist: "", query: "" } });
    playPreview(presetId);
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
      if (!videoId) return;
      onChange({
        mode: "youtube",
        presetId: "",
        youtube: { videoId, title, artist, query: q }
      });
    } finally {
      setYtBusy(false);
    }
  };

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>강력 추천 · VLUE RF 큐레이션</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        곡을 누르면 선택되며 약 {PREVIEW_MS / 1000}초 미리듣기가 재생됩니다.
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
          const active = value?.mode === "preset" && value?.presetId === p.id;
          const playing = previewId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`showcase-bgm-picker__card${active ? " active" : ""}${playing ? " is-previewing" : ""}`}
              onClick={() => selectPreset(p.id)}
            >
              {playing ? (
                <Volume2 size={14} className="showcase-bgm-picker__icon" aria-hidden />
              ) : (
                <Music size={14} className="showcase-bgm-picker__icon" aria-hidden />
              )}
              <span className="showcase-bgm-picker__label">{p.label}</span>
              <small>{playing ? "미리듣기 중…" : p.tag}</small>
            </button>
          );
        })}
      </div>
      {previewError ? (
        <p className="showcase-bgm-picker__preview-error" role="status">
          {previewError}
        </p>
      ) : null}

      <div className="showcase-bgm-picker__youtube">
        <p className="showcase-bgm-picker__yt-title">
          <Search size={13} aria-hidden /> 내 쇼케이스 배경음악/영상 검색 지정하기
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
          <p className="showcase-bgm-picker__yt-hint">YouTube 공식 iframe embed · Audio Library 권장</p>
        )}
      </div>
    </div>
  );
}
