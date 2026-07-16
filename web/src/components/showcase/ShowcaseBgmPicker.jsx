import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Search, Sparkles } from "lucide-react";
import {
  buildShowcaseBgmPresets,
  getNextAvailableBgmTrack,
  searchShowcaseBgmByGenre,
  SHOWCASE_BGM_TAG_CURATIONS
} from "../../lib/showcase/showcaseBgmPresets.js";
import { getReelsChartTrackById, REELS_BGM_CHART_POOL } from "../../lib/showcase/showcaseBgmChart.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseSoundCloudPlayer from "./ShowcaseSoundCloudPlayer.jsx";

function isKrCuratedSelection(value) {
  if (value?.mode !== "soundcloud") return true;
  const presetId = value?.presetId;
  if (presetId && getReelsChartTrackById(presetId)) return true;
  const trackId = String(value?.soundcloud?.trackId || "").trim();
  if (trackId && REELS_BGM_CHART_POOL.some((t) => t.trackId === trackId && t.krVerified)) return true;
  const trackUrl = String(value?.soundcloud?.trackUrl || "").trim();
  if (trackUrl && REELS_BGM_CHART_POOL.some((t) => t.trackUrl === trackUrl && t.krVerified)) return true;
  return !(presetId || trackId || trackUrl);
}

/**
 * SoundCloud 미니앨범 + 태그 큐레이션 + 장르 검색
 * (대한민국 재생 확인 곡만)
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [tagId, setTagId] = useState("all");
  const [genreQuery, setGenreQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchHint, setSearchHint] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [previewTrackUrl, setPreviewTrackUrl] = useState("");
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();

  const activeTag = useMemo(
    () => SHOWCASE_BGM_TAG_CURATIONS.find((t) => t.id === tagId) || SHOWCASE_BGM_TAG_CURATIONS[0],
    [tagId]
  );

  const curated = useMemo(
    () =>
      buildShowcaseBgmPresets(activeTag.theme || "all", {
        genreBoost: activeTag.genreBoost || ""
      }),
    [activeTag]
  );

  const weekLabel = useMemo(() => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}년 ${week}주차`;
  }, []);

  const stopPreview = () => {
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

  const playTrack = (trackUrl, trackKey) => {
    unlockFromUserGesture();
    setPreviewId(trackKey);
    setPreviewTrackUrl(trackUrl);
    setPlaybackPhase("idle");
  };

  const applyTrack = useCallback(
    (track) => {
      const trackUrl = track.trackUrl || "";
      if (!trackUrl) return;
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  const handlePlaybackError = useCallback(
    (failedTrack) => {
      if (!failedTrack) return;
      stopPreview();
      const nextTrack = getNextAvailableBgmTrack(curated, failedTrack.id);
      if (nextTrack) applyTrack(nextTrack);
    },
    [curated, applyTrack]
  );

  const runGenreSearch = () => {
    const q = genreQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchHint("장르 키워드를 입력해 주세요. (예: chill, groovy, 명상)");
      return;
    }
    const hits = searchShowcaseBgmByGenre(q, { limit: 8 });
    setSearchResults(hits);
    setSearchHint(
      hits.length
        ? `「${q}」 검색 결과 · ${hits.length}곡`
        : `「${q}」에 맞는 곡이 없습니다. 다른 장르를 시도해 주세요.`
    );
  };

  const curatedOk = isKrCuratedSelection(value);
  const selectedArtwork =
    (curatedOk && value?.soundcloud?.artworkUrl) ||
    curated.find((p) => p.id === value?.presetId)?.artworkUrl ||
    "";

  const currentPreviewTrack =
    curated.find((t) => t.id === previewId) ||
    (searchResults || []).find((t) => t.id === previewId) ||
    null;

  const renderAlbum = (p) => {
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
        onClick={() => applyTrack(p)}
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
          {playing ? "재생 중…" : `${p.tag || ""} · ${p.artist || ""}`.replace(/^ · /, "")}
        </span>
      </button>
    );
  };

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>릴스 감성 BGM · {weekLabel}</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        대한민국에서 재생이 확인된 SoundCloud 음원만 제공합니다.
        태그를 고르거나 장르로 검색하세요. 쇼케이스에는 <strong>음향만</strong> 나갑니다.
      </p>
      <p className="showcase-bgm-picker__volume-tip" role="note">
        소리가 안 들리면 무음을 끄고 미디어 볼륨을 올려 주세요.
      </p>

      <div className="showcase-bgm-picker__themes" role="tablist" aria-label="태그 큐레이션">
        {SHOWCASE_BGM_TAG_CURATIONS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tagId === t.id}
            className={`showcase-bgm-picker__theme${tagId === t.id ? " active" : ""}`}
            onClick={() => {
              setTagId(t.id);
              setSearchResults(null);
              setSearchHint("");
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {searchResults === null ? (
        <div className="showcase-bgm-picker__albums" role="list">
          {curated.map(renderAlbum)}
        </div>
      ) : null}

      {previewTrackUrl && currentPreviewTrack ? (
        <div className="showcase-bgm-picker__sc-preview">
          <ShowcaseSoundCloudPlayer
            key={previewTrackUrl}
            trackUrl={previewTrackUrl}
            muted={false}
            visual
            hideUi={false}
            className="showcase-bgm-picker__sc-iframe"
            title="BGM preview"
            onError={() => handlePlaybackError(currentPreviewTrack)}
          />
          <p className="showcase-bgm-picker__yt-caption">전체 재생 · 실제 쇼케이스에는 소리만 나갑니다</p>
        </div>
      ) : null}

      <div className="showcase-bgm-picker__youtube">
        <p className="showcase-bgm-picker__yt-title">
          <Search size={13} aria-hidden /> 장르 검색
        </p>
        <p className="showcase-bgm-picker__yt-hint" style={{ marginBottom: 8 }}>
          위 태그 외 장르도 검색할 수 있습니다. 한국 재생 확인 곡만 표시됩니다.
        </p>
        <div className="showcase-bgm-picker__yt-row">
          <input
            className={`showcase-style-settings__input flex-1 ${inputCls}`}
            placeholder="장르 검색 (예: chill, groovy, 명상, indie)"
            value={genreQuery}
            onChange={(e) => setGenreQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runGenreSearch()}
          />
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={runGenreSearch}>
            검색
          </button>
        </div>

        {searchHint ? (
          <p className="showcase-bgm-picker__search-status" role="status">
            {searchHint}
          </p>
        ) : null}

        {searchResults?.length ? (
          <div className="showcase-bgm-picker__recommend">
            <div className="showcase-bgm-picker__albums showcase-bgm-picker__albums--recommend" role="list">
              {searchResults.map(renderAlbum)}
            </div>
          </div>
        ) : null}

        {value?.mode === "soundcloud" && curatedOk && (value?.soundcloud?.trackUrl || value?.soundcloud?.title) ? (
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
        ) : value?.mode === "soundcloud" && !curatedOk ? (
          <p className="showcase-bgm-picker__yt-hint">
            이전 선택 곡은 목록에서 제외되었습니다. 위 앨범에서 새 곡을 골라 주세요.
          </p>
        ) : null}
      </div>
    </div>
  );
}
