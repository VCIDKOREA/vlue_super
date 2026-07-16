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
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

/** 숏폼 감성 미리듣기 — 너무 짧지 않게 */
const PREVIEW_MS = 20000;

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const audioRef = useRef(null);
  const previewTimerRef = useRef(0);
  const previewTokenRef = useRef(0);
  const { setPlaybackPhase } = useShowcaseBgm();

  const filtered = useMemo(() => {
    if (theme === "all") return SHOWCASE_BGM_PRESETS;
    return SHOWCASE_BGM_PRESETS.filter((p) => p.theme === theme);
  }, [theme]);

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
    setPreviewId("");
    setPreviewLoading(false);
  };

  useEffect(() => {
    /* 피커가 열려 있는 동안 홈 글로벌 BGM 정지 */
    setPlaybackPhase("idle");
    return () => {
      stopPreview();
      setPlaybackPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPlaybackPhase]);

  const playPreview = (presetId) => {
    const preset = getBgmPresetById(presetId);
    if (!preset?.url) {
      setPreviewError("미리듣기 음원을 찾을 수 없습니다.");
      return;
    }
    stopPreview();
    setPreviewError("");
    setPreviewLoading(true);
    setPlaybackPhase("idle");
    const token = previewTokenRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    /* crossOrigin=anonymous 는 CDN CORS 없으면 onerror → 네트워크 오안내 유발. 재생만 하면 CORS 불필요 */
    audio.volume = 0.85;
    audioRef.current = audio;
    setPreviewId(presetId);

    let settled = false;
    const fail = (msg) => {
      if (previewTokenRef.current !== token || settled) return;
      settled = true;
      setPreviewError(msg || "미리듣기를 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.");
      setPreviewLoading(false);
      setPreviewId("");
    };

    const startPlay = () => {
      if (previewTokenRef.current !== token || settled) return;
      setPreviewLoading(false);
      setPreviewError("");
      audio.play().then(() => {
        settled = true;
      }).catch(() => {
        fail("재생이 차단되었습니다. 한 번 더 눌러 주세요.");
      });
    };

    audio.onerror = () =>
      fail("음원을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요. (Wi‑Fi와 무관하게 서버 음원 연결일 수 있습니다)");
    audio.oncanplay = startPlay;
    audio.onloadeddata = startPlay;
    audio.src = preset.url;
    try {
      audio.load();
    } catch {
      fail();
    }

    /* 프록시·CDN 로딩 대기 후 재생 시도 */
    window.setTimeout(() => {
      if (previewTokenRef.current !== token || settled) return;
      if (audio.readyState >= 2) startPlay();
    }, 3000);

    /* 최종 타임아웃 */
    window.setTimeout(() => {
      if (previewTokenRef.current !== token || settled) return;
      fail("음원 로딩이 지연됩니다. 다시 눌러 주세요.");
    }, 18000);

    previewTimerRef.current = window.setTimeout(() => {
      if (previewTokenRef.current !== token) return;
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
        <span>강력 추천 · 숏폼(릴스·쇼츠) 감성</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        곡을 누르면 선택되며 약 {PREVIEW_MS / 1000}초 미리듣기가 재생됩니다. 창을 나가면 바로 멈춥니다.
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
              <small>
                {playing ? (previewLoading ? "불러오는 중…" : "미리듣기 중…") : p.tag}
              </small>
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
