import { useMemo, useState } from "react";
import { Music, Search, Sparkles } from "lucide-react";
import { SHOWCASE_BGM_PRESETS, SHOWCASE_BGM_THEMES } from "../../lib/showcase/showcaseBgmPresets.js";
import {
  extractYoutubeVideoId,
  fetchYoutubeMeta,
  matchYoutubeByKeyword
} from "../../lib/showcase/showcaseYoutube.js";

/**
 * RF 큐레이션 + 유튜브 검색/지정 BGM 피커
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [theme, setTheme] = useState("all");
  const [ytQuery, setYtQuery] = useState(value?.youtube?.query || "");
  const [ytBusy, setYtBusy] = useState(false);

  const filtered = useMemo(() => {
    if (theme === "all") return SHOWCASE_BGM_PRESETS;
    return SHOWCASE_BGM_PRESETS.filter((p) => p.theme === theme);
  }, [theme]);

  const selectPreset = (presetId) => {
    onChange({ mode: "preset", presetId, youtube: { videoId: "", title: "", artist: "", query: "" } });
  };

  const mapYoutube = async () => {
    const q = ytQuery.trim();
    if (!q) return;
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
          return (
            <button
              key={p.id}
              type="button"
              className={`showcase-bgm-picker__card${active ? " active" : ""}`}
              onClick={() => selectPreset(p.id)}
            >
              <Music size={14} className="showcase-bgm-picker__icon" aria-hidden />
              <span className="showcase-bgm-picker__label">{p.label}</span>
              <small>{p.tag}</small>
            </button>
          );
        })}
      </div>

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
