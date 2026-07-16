import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Pause, Search, Sparkles } from "lucide-react";
import {
  buildShowcaseBgmPresets,
  getNextAvailableBgmTrack,
  searchShowcaseBgmByGenre,
  SHOWCASE_BGM_GENRE_CHIPS,
  SHOWCASE_BGM_THEMES
} from "../../lib/showcase/showcaseBgmPresets.js";
import {
  isShowcaseBgmBlocked,
  markShowcaseBgmBlocked,
  readShowcaseBgmBlockedSet
} from "../../lib/showcase/showcaseBgmBlocked.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import ShowcaseSoundCloudPlayer from "./ShowcaseSoundCloudPlayer.jsx";

const REGION_MSG = "현재 지역에서 재생할 수 없는 음악입니다";

/**
 * SoundCloud 미니앨범 차트 + 장르 검색 추천
 */
export default function ShowcaseBgmPicker({ value, onChange, inputCls = "" }) {
  const [theme, setTheme] = useState("all");
  const [genreQuery, setGenreQuery] = useState("");
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [blocked, setBlocked] = useState(() => readShowcaseBgmBlockedSet());
  const [previewId, setPreviewId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewTrackUrl, setPreviewTrackUrl] = useState("");
  const [notice, setNotice] = useState("");
  const { setPlaybackPhase, unlockFromUserGesture } = useShowcaseBgm();

  const filtered = useMemo(() => {
    const list = buildShowcaseBgmPresets(theme);
    return list.map((t) => ({
      ...t,
      blocked:
        blocked.has(t.id) ||
        blocked.has(t.trackId) ||
        blocked.has(t.trackUrl) ||
        isShowcaseBgmBlocked(t.trackId) ||
        isShowcaseBgmBlocked(t.trackUrl)
    }));
  }, [theme, blocked]);

  const recommendations = useMemo(() => {
    if (!recommendOpen && !genreQuery.trim()) return [];
    return searchShowcaseBgmByGenre(genreQuery, { excludeIds: blocked, limit: 6 }).map((t) => ({
      ...t,
      blocked:
        blocked.has(t.id) ||
        blocked.has(t.trackId) ||
        blocked.has(t.trackUrl)
    }));
  }, [genreQuery, recommendOpen, blocked]);

  const weekLabel = useMemo(() => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}년 ${week}주차 · 한국·글로벌 재생 가능`;
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

  const playTrack = (trackUrl, trackId) => {
    unlockFromUserGesture();
    setPreviewError("");
    setNotice("");
    setPreviewId(trackId);
    setPreviewTrackUrl(trackUrl);
    setPlaybackPhase("idle");
  };

  const applyTrack = useCallback(
    (track) => {
      const trackUrl = track.trackUrl || "";
      if (!trackUrl) {
        setPreviewError("재생할 트랙을 찾을 수 없습니다.");
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  const selectTrack = (track) => {
    if (
      track.blocked ||
      blocked.has(track.id) ||
      blocked.has(track.trackId) ||
      blocked.has(track.trackUrl)
    ) {
      setNotice(REGION_MSG);
      setPreviewError(REGION_MSG);
      return;
    }
    applyTrack(track);
  };

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
      setNotice(REGION_MSG);
      setPreviewError(REGION_MSG);
      stopPreview();

      const nextTrack = getNextAvailableBgmTrack(
        filtered.filter((t) => !t.blocked),
        failedTrack.id,
        new Set([failedTrack.id, failedTrack.trackId, failedTrack.trackUrl])
      );
      if (nextTrack) {
        window.setTimeout(() => {
          setNotice(`${REGION_MSG} · 다음 곡으로 이동합니다`);
          applyTrack(nextTrack);
        }, 450);
      }
    },
    [filtered, applyTrack]
  );

  const runGenreSearch = () => {
    setRecommendOpen(true);
    if (!genreQuery.trim()) {
      setNotice("장르를 입력하거나 아래 추천을 눌러 주세요. (예: Study Beats, 카페)");
    }
  };

  const pickGenreChip = (chip) => {
    setGenreQuery(chip.query);
    setRecommendOpen(true);
    setNotice(`「${chip.label}」 추천 · 한국에서 재생 가능한 곡만 표시합니다`);
  };

  const selectedArtwork =
    value?.soundcloud?.artworkUrl ||
    filtered.find((p) => p.id === value?.presetId)?.artworkUrl ||
    "";

  const currentPreviewTrack = filtered.find((t) => t.id === previewId) || null;

  const renderAlbum = (p) => {
    const isBlocked = Boolean(p.blocked);
    const active =
      !isBlocked &&
      ((value?.mode === "soundcloud" &&
        (value?.soundcloud?.trackUrl === p.trackUrl || value?.presetId === p.id)) ||
        previewId === p.id);
    const playing = !isBlocked && previewId === p.id && Boolean(previewTrackUrl);
    return (
      <button
        key={p.id}
        type="button"
        role="listitem"
        disabled={isBlocked}
        aria-disabled={isBlocked}
        title={isBlocked ? REGION_MSG : undefined}
        className={`showcase-bgm-picker__album${active ? " active" : ""}${playing ? " is-playing" : ""}${isBlocked ? " is-blocked" : ""}`}
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
          {isBlocked ? (
            <span className="showcase-bgm-picker__blocked-badge" aria-hidden>
              <Ban size={16} strokeWidth={2.5} />
            </span>
          ) : playing ? (
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
          {isBlocked ? "재생 불가(지역)" : playing ? "재생 중…" : p.artist || p.tag}
        </span>
      </button>
    );
  };

  return (
    <div className="showcase-bgm-picker">
      <div className="showcase-bgm-picker__hero">
        <Sparkles size={14} aria-hidden />
        <span>이번 주 릴스 감성 TOP · {weekLabel}</span>
      </div>
      <p className="showcase-bgm-picker__hint" style={{ wordBreak: "keep-all" }}>
        SoundCloud 음원 · 한국·글로벌에서 재생 가능한 곡만 엄선했습니다.
        쇼케이스에는 <strong>음향만</strong> 나가며, 미니앨범을 누르면 <strong>전체 곡</strong>이 재생됩니다.
      </p>
      <p className="showcase-bgm-picker__volume-tip" role="note">
        회색 앨범은 현재 지역에서 재생할 수 없습니다. 소리가 안 들리면 무음·미디어 볼륨을 확인해 주세요.
      </p>

      {(notice || previewError) && (
        <p className="showcase-bgm-picker__region-toast" role="status" aria-live="polite">
          {notice || previewError}
        </p>
      )}

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
        {filtered.map(renderAlbum)}
      </div>

      {previewTrackUrl && currentPreviewTrack && !currentPreviewTrack.blocked ? (
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
          <Search size={13} aria-hidden /> 장르로 배경음악 검색·추천
        </p>
        <div className="showcase-bgm-picker__yt-row">
          <input
            className={`showcase-style-settings__input flex-1 ${inputCls}`}
            placeholder="예: Study Beats, 카페, 로파이, 비즈니스"
            value={genreQuery}
            onChange={(e) => {
              setGenreQuery(e.target.value);
              setRecommendOpen(true);
            }}
            onFocus={() => setRecommendOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && runGenreSearch()}
          />
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={runGenreSearch}>
            추천
          </button>
        </div>

        <div className="showcase-bgm-picker__genre-chips">
          {SHOWCASE_BGM_GENRE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`showcase-bgm-picker__genre-chip${genreQuery === chip.query ? " active" : ""}`}
              onClick={() => pickGenreChip(chip)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {recommendOpen && recommendations.length ? (
          <div className="showcase-bgm-picker__recommend">
            <p className="showcase-bgm-picker__recommend-title">추천 앨범 · 한국 재생 가능</p>
            <div className="showcase-bgm-picker__albums showcase-bgm-picker__albums--recommend" role="list">
              {recommendations.map(renderAlbum)}
            </div>
          </div>
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
        ) : (
          <p className="showcase-bgm-picker__yt-hint">
            장르를 고르면 한국에서 들을 수 있는 곡만 추천합니다.
          </p>
        )}
      </div>
    </div>
  );
}
