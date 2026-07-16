import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Search, Sparkles } from "lucide-react";
import {
  fetchSoundCloudCuration,
  fetchSoundCloudSearchPopular,
  SOUNDCLOUD_GENRE_CURATIONS,
  SOUNDCLOUD_CURATION_LIMIT,
  SOUNDCLOUD_SEARCH_LIMIT
} from "../../lib/showcase/showcaseSoundCloudSearch.js";
import {
  markShowcaseBgmBlocked,
  readShowcaseBgmBlockedSet
} from "../../lib/showcase/showcaseBgmBlocked.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseSoundCloudPlayer from "./ShowcaseSoundCloudPlayer.jsx";

/**
 * SoundCloud 장르 고정 큐레이션(6곡) + 인기순 장르/키워드 검색
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [genreId, setGenreId] = useState(SOUNDCLOUD_GENRE_CURATIONS[0]?.id || "kpop");
  const [curatedTracks, setCuratedTracks] = useState([]);
  const [curationLoading, setCurationLoading] = useState(false);
  const [curationError, setCurationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTracks, setSearchTracks] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [blocked, setBlocked] = useState(() => readShowcaseBgmBlockedSet());
  const [previewId, setPreviewId] = useState("");
  const [previewTrackUrl, setPreviewTrackUrl] = useState("");
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();
  const curationToken = useRef(0);

  const activeGenre = useMemo(
    () => SOUNDCLOUD_GENRE_CURATIONS.find((g) => g.id === genreId) || SOUNDCLOUD_GENRE_CURATIONS[0],
    [genreId]
  );

  const visibleCurated = useMemo(
    () =>
      curatedTracks.filter(
        (t) => !blocked.has(t.id) && !blocked.has(t.trackId) && !blocked.has(t.trackUrl)
      ),
    [curatedTracks, blocked]
  );

  const visibleSearch = useMemo(() => {
    if (!searchTracks) return null;
    return searchTracks.filter(
      (t) => !blocked.has(t.id) && !blocked.has(t.trackId) && !blocked.has(t.trackUrl)
    );
  }, [searchTracks, blocked]);

  useEffect(() => {
    setPlaybackPhase("idle");
    return () => {
      setPreviewTrackUrl("");
      setPreviewId("");
      setPlaybackPhase("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPlaybackPhase]);

  useEffect(() => {
    const token = ++curationToken.current;
    setCurationLoading(true);
    setCurationError("");
    setSearchTracks(null);
    setSearchHint("");
    fetchSoundCloudCuration(genreId)
      .then((res) => {
        if (curationToken.current !== token) return;
        setCuratedTracks(res.tracks || []);
        if (!(res.tracks || []).length) {
          setCurationError("이 장르에서 불러올 곡이 없습니다. 잠시 후 다시 시도해 주세요.");
        }
      })
      .catch((e) => {
        if (curationToken.current !== token) return;
        setCuratedTracks([]);
        setCurationError(e?.message || "큐레이션을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (curationToken.current === token) setCurationLoading(false);
      });
  }, [genreId]);

  const stopPreview = () => {
    setPreviewTrackUrl("");
    setPreviewId("");
  };

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
          title: track.label || track.title || "",
          artist: track.artist || "",
          artworkUrl: track.artworkUrl || "",
          query: track.label || track.title || "",
          license: track.license || "",
          licenseLabel: track.licenseLabel || "",
          attribution: track.attribution || "",
          sourceVerified: true,
          commercialCcOnly: true,
          verifiedAt: track.verifiedAt || new Date().toISOString()
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
      markShowcaseBgmBlocked(failedTrack.id, failedTrack.trackId, failedTrack.trackUrl);
      setBlocked((prev) => {
        const next = new Set(prev);
        next.add(failedTrack.id);
        if (failedTrack.trackId) next.add(failedTrack.trackId);
        if (failedTrack.trackUrl) next.add(failedTrack.trackUrl);
        return next;
      });
      stopPreview();

      const pool = (visibleSearch?.length ? visibleSearch : visibleCurated).filter(
        (t) => t.id !== failedTrack.id && t.trackId !== failedTrack.trackId
      );
      const nextTrack = pool[0] || null;
      if (nextTrack) {
        window.setTimeout(() => applyTrack(nextTrack), 200);
      }
    },
    [visibleCurated, visibleSearch, applyTrack]
  );

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchTracks([]);
      setSearchHint("장르나 키워드를 입력해 주세요.");
      return;
    }
    setSearchLoading(true);
    setSearchHint("");
    try {
      const res = await fetchSoundCloudSearchPopular(q, { limit: SOUNDCLOUD_SEARCH_LIMIT });
      setSearchTracks(res.tracks || []);
      setSearchHint(
        (res.tracks || []).length
          ? `「${q}」 인기순 ${res.tracks.length}곡`
          : `「${q}」 검색 결과가 없습니다.`
      );
    } catch (e) {
      setSearchTracks([]);
      setSearchHint(e?.message || "검색에 실패했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedArtwork = value?.soundcloud?.artworkUrl || "";
  const currentPreviewTrack =
    visibleCurated.find((t) => t.id === previewId) ||
    (visibleSearch || []).find((t) => t.id === previewId) ||
    null;

  const renderAlbum = (p, compact = false) => {
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
        className={`showcase-bgm-picker__album${compact ? " showcase-bgm-picker__album--row" : ""}${active ? " active" : ""}${playing ? " is-playing" : ""}`}
        onClick={() => applyTrack(p)}
      >
        <span className="showcase-bgm-picker__cover">
          {p.artworkUrl ? (
            <img src={p.artworkUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="showcase-bgm-picker__cover-fallback" aria-hidden>
              {(p.label || p.title || "?").slice(0, 1)}
            </span>
          )}
          {playing ? (
            <span className="showcase-bgm-picker__play-badge" aria-hidden>
              <Pause size={18} strokeWidth={2.5} />
            </span>
          ) : null}
        </span>
        <span className="showcase-bgm-picker__album-meta">
          <span className="showcase-bgm-picker__album-title">
            {p.rank ? `${p.rank}. ` : ""}
            {p.label || p.title}
          </span>
          <span className="showcase-bgm-picker__album-sub">
            {playing
              ? "재생 중…"
              : [p.artist || "SoundCloud", p.licenseLabel || p.license, p.playbackCount ? formatPlays(p.playbackCount) : ""]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>SoundCloud 큐레이션 · 장르별 {SOUNDCLOUD_CURATION_LIMIT}곡</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        <strong>상업용 Creative Commons</strong> 음원만 검색합니다 (CC BY / BY-SA / BY-ND / CC0).
        NC·무단배포 금지 곡은 결과에 포함되지 않습니다. 쇼케이스에는 <strong>음향만</strong> 나갑니다.
      </p>
      <p className="showcase-bgm-picker__volume-tip" role="note">
        음원 출처가 확인된 곡만 표시합니다. 지역 제한 곡은 자동 제외됩니다.
      </p>

      <div className="showcase-bgm-picker__themes" role="tablist" aria-label="장르 큐레이션">
        {SOUNDCLOUD_GENRE_CURATIONS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={genreId === g.id}
            className={`showcase-bgm-picker__theme${genreId === g.id ? " active" : ""}`}
            onClick={() => setGenreId(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {searchTracks === null ? (
        <>
          <p className="showcase-bgm-picker__section-title">
            {activeGenre?.label || "장르"} · 고정 {SOUNDCLOUD_CURATION_LIMIT}곡
          </p>
          {curationLoading ? (
            <p className="showcase-bgm-picker__search-status">불러오는 중…</p>
          ) : curationError ? (
            <p className="showcase-bgm-picker__preview-error">{curationError}</p>
          ) : (
            <div className="showcase-bgm-picker__albums" role="list">
              {visibleCurated.map((t) => renderAlbum(t))}
            </div>
          )}
        </>
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
          <Search size={13} aria-hidden /> 검색 (인기순)
        </p>
        <p className="showcase-bgm-picker__yt-hint" style={{ marginBottom: 8 }}>
          장르·키워드 검색 시 SoundCloud 인기순으로 {SOUNDCLOUD_SEARCH_LIMIT}곡 이상 표시합니다.
        </p>
        <div className="showcase-bgm-picker__yt-row">
          <input
            className={`showcase-style-settings__input flex-1 ${inputCls}`}
            placeholder="장르 또는 키워드 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={runSearch} disabled={searchLoading}>
            {searchLoading ? "…" : "검색"}
          </button>
        </div>

        {searchHint ? (
          <p className="showcase-bgm-picker__search-status" role="status">
            {searchHint}
          </p>
        ) : null}

        {visibleSearch?.length ? (
          <div className="showcase-bgm-picker__search-list" role="list">
            {visibleSearch.map((t) => renderAlbum(t, true))}
          </div>
        ) : null}

        {searchTracks !== null ? (
          <button
            type="button"
            className="showcase-bgm-picker__back-curation"
            onClick={() => {
              setSearchTracks(null);
              setSearchHint("");
            }}
          >
            ← 장르 큐레이션으로 돌아가기
          </button>
        ) : null}

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
        ) : null}
      </div>
    </div>
  );
}

function formatPlays(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M plays`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K plays`;
  return `${v} plays`;
}
