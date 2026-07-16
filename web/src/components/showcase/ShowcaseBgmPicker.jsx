import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Search, Sparkles } from "lucide-react";
import {
  buildShowcaseBgmPresets,
  SHOWCASE_BGM_THEMES
} from "../../lib/showcase/showcaseBgmPresets.js";
import {
  extractSoundCloudTrackUrl,
  fetchSoundCloudMeta
} from "../../lib/showcase/showcaseSoundCloud.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseSoundCloudPlayer from "./ShowcaseSoundCloudPlayer.jsx";

/**
 * SoundCloud 미니앨범 차트 + URL 지정
 * 선택 시 전체 곡 재생 (다른 곡 선택 시 전환)
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [theme, setTheme] = useState("all");
  const [scQuery, setScQuery] = useState(value?.soundcloud?.query || value?.youtube?.query || "");
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewTrackUrl, setPreviewTrackUrl] = useState("");
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();
  const previewUrlRef = useRef("");

  const filtered = useMemo(() => buildShowcaseBgmPresets(theme), [theme]);
  const weekLabel = useMemo(() => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}년 ${week}주차 차트`;
  }, []);

  const stopPreview = () => {
    previewUrlRef.current = "";
    setPreviewTrackUrl("");
    setPreviewId("");
  };

  useEffect(() => {
    setPlaybackPhase("idle");
    return () => {
      stopPreview();
      setPlaybackPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPlaybackPhase]);

  const playTrack = (trackUrl, trackId) => {
    unlockFromUserGesture();
    setPreviewError("");
    previewUrlRef.current = trackUrl;
    setPreviewId(trackId);
    setPreviewTrackUrl(trackUrl);
    setPlaybackPhase("idle");
  };

  const selectTrack = (track) => {
    const trackUrl = track.trackUrl || "";
    if (!trackUrl) {
      setPreviewError("재생할 SoundCloud 트랙을 찾을 수 없습니다.");
      return;
    }
    onChange({
      mode: "soundcloud",
      presetId: track.id,
      soundcloud: {
        trackUrl,
        trackId: track.trackId || "",
        title: track.label,
        artist: track.artist || "",
        artworkUrl: track.artworkUrl || "",
        query: track.label
      },
      youtube: { videoId: "", title: "", artist: "", query: "" }
    });
    playTrack(trackUrl, track.id);
  };

  const mapSoundCloud = async () => {
    const q = scQuery.trim();
    if (!q) return;
    stopPreview();
    setBusy(true);
    setPreviewError("");
    try {
      const trackUrl = extractSoundCloudTrackUrl(q);
      if (!trackUrl) {
        setPreviewError("SoundCloud 트랙 URL 또는 트랙 ID를 입력해 주세요.");
        return;
      }
      const meta = await fetchSoundCloudMeta(trackUrl);
      if (!meta?.trackUrl) {
        setPreviewError("트랙을 찾지 못했습니다. URL을 확인해 주세요.");
        return;
      }
      onChange({
        mode: "soundcloud",
        presetId: "",
        soundcloud: {
          trackUrl: meta.trackUrl,
          trackId: meta.trackId,
          title: meta.title,
          artist: meta.artist,
          artworkUrl: meta.artworkUrl,
          query: q
        },
        youtube: { videoId: "", title: "", artist: "", query: "" }
      });
      playTrack(meta.trackUrl, `sc-${meta.trackId || "custom"}`);
    } finally {
      setBusy(false);
    }
  };

  const selectedArtwork =
    value?.soundcloud?.artworkUrl ||
    filtered.find((p) => p.id === value?.presetId)?.artworkUrl ||
    "";

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>이번 주 릴스 감성 TOP · {weekLabel}</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        SoundCloud 실제 음원입니다. 쇼케이스에 적용되면 <strong>음향만</strong> 나갑니다.
        미니앨범을 누르면 선택 + <strong>전체 곡</strong>이 재생됩니다.
      </p>
      <p className="showcase-bgm-picker__volume-tip" role="note">
        소리가 안 들리면 무음을 끄고 미디어 볼륨을 올려 주세요. 다른 곡을 누르면 재생이 바뀝니다.
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

      <div className="showcase-bgm-picker__albums" role="list">
        {filtered.map((p) => {
          const active =
            (value?.mode === "soundcloud" &&
              (value?.soundcloud?.trackUrl === p.trackUrl || value?.presetId === p.id)) ||
            previewId === p.id;
          const playing = previewId === p.id && Boolean(previewTrackUrl);
          return (
            <button
              key={p.id}
              type="button"
              role="listitem"
              className={`showcase-bgm-picker__album${active ? " active" : ""}${playing ? " is-playing" : ""}`}
              onClick={() => selectTrack(p)}
            >
              <span className="showcase-bgm-picker__cover">
                {p.artworkUrl ? (
                  <img src={p.artworkUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="showcase-bgm-picker__cover-fallback" aria-hidden>
                    {p.label.slice(0, 1)}
                  </span>
                )}
                {playing ? (
                  <span className="showcase-bgm-picker__play-badge" aria-hidden>
                    <Pause size={18} strokeWidth={2.5} />
                  </span>
                ) : null}
              </span>
              <span className="showcase-bgm-picker__album-title">
                {p.rank ? `${p.rank}. ` : ""}
                {p.label}
              </span>
              <span className="showcase-bgm-picker__album-sub">
                {playing ? "재생 중…" : p.artist || p.tag}
              </span>
            </button>
          );
        })}
      </div>

      {previewTrackUrl ? (
        <div className="showcase-bgm-picker__sc-preview">
          <ShowcaseSoundCloudPlayer
            key={previewTrackUrl}
            trackUrl={previewTrackUrl}
            muted={false}
            visual
            hideUi={false}
            className="showcase-bgm-picker__sc-iframe"
            title="BGM preview"
          />
          <p className="showcase-bgm-picker__yt-caption">전체 재생 · 실제 쇼케이스에는 소리만 나갑니다</p>
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
            placeholder="SoundCloud 트랙 URL 또는 트랙 ID"
            value={scQuery}
            onChange={(e) => setScQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mapSoundCloud()}
          />
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={mapSoundCloud} disabled={busy}>
            {busy ? "…" : "지정"}
          </button>
        </div>
        {value?.mode === "soundcloud" && (value?.soundcloud?.trackUrl || value?.soundcloud?.title) ? (
          <p className="showcase-bgm-picker__yt-selected">
            {selectedArtwork ? (
              <img
                className="showcase-bgm-picker__selected-thumb"
                src={selectedArtwork}
                alt=""
                width={28}
                height={28}
              />
            ) : null}
            ✓ {value.soundcloud.title || "SoundCloud"}
            {value.soundcloud.artist ? ` — ${value.soundcloud.artist}` : ""}
          </p>
        ) : (
          <p className="showcase-bgm-picker__yt-hint">
            SoundCloud에서 공유 → 링크 복사 후 붙여넣으면 바로 지정됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
