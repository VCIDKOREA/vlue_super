import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HelpCircle, ListMusic, Loader2, Music2, Plus, Search, Sparkles, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
import CopyrightVerifySearch from "./CopyrightVerifySearch.jsx";
import {
  borrowShowcaseSound,
  deleteShowcaseSound,
  fetchMyShowcaseSounds,
  fetchShowcaseSoundQuota,
  fetchSignatureSounds,
  notifyThemeBgmChange,
  registerShowcaseSound,
  soundToBgmPatch,
  soundToPlaylistEntry,
  uploadShowcaseSoundFile
} from "../../lib/showcase/showcaseSoundApi.js";
import {
  BGM_PLAY_MODES,
  BGM_VOLUME_LEVELS,
  normalizeBgmVolumeLevel,
  resolveBgmVolumeGain
} from "../../lib/showcase/showcaseBgmPresets.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

const SIGNATURE_PAGE_SIZE = 10;

const CREATE_TYPES = [
  { id: "human_created", label: "직접 창작한 음원" },
  { id: "ai_assisted", label: "AI를 활용해 제작한 음원" },
  { id: "ai_generated", label: "AI 생성 음원" },
  { id: "remake_arrangement", label: "리메이크·편곡 음원" }
];

const AI_SERVICES = ["Suno", "Udio", "기타"];
const RIGHTS_TEXT =
  "본인은 등록하는 음원에 대해 VLUE에서 공개·재생할 수 있는 적법한 권리 또는 이용 권한을 보유하고 있음을 확인합니다. AI 음악 생성 서비스의 이용약관 및 라이선스 조건을 확인하였으며, 해당 음원을 VLUE에서 공개·재생하는 것이 허용되는지 확인했습니다. 타인의 저작물, 가사, 음성, 음원 등을 무단으로 사용하거나 권리를 침해한 콘텐츠를 등록하지 않습니다. 허위 등록 또는 권리 침해로 발생하는 모든 책임은 등록자에게 있습니다.";

const ADD_ACTIONS = [
  { id: "library", label: "내 사운드에 담기" },
  { id: "showcase", label: "쇼케이스에 사용" },
  { id: "playlist", label: "재생목록에 추가" }
];

function resolveMemberHandle(propHandle = "") {
  const fromProp = String(propHandle || "")
    .replace(/^@/, "")
    .trim();
  if (fromProp) return fromProp;
  try {
    return String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
  } catch {
    return "";
  }
}

function SoundHelp({ text }) {
  return (
    <button
      type="button"
      className="showcase-sound-help"
      title={text}
      aria-label={text}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.alert(text);
      }}
    >
      <HelpCircle size={13} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

function isAiType(t) {
  return t === "ai_assisted" || t === "ai_generated" || t === "remake_arrangement";
}

/** 목록 스피커 — 부모 렌더마다 타입 재생성되지 않도록 모듈 스코프에 둠 */
function PreviewSpeakerBtn({ soundId, active, playing, disabled, onPreview }) {
  const loading = active && !playing;
  return (
    <button
      type="button"
      className={`showcase-sound-btn showcase-sound-btn--preview${active ? " is-on" : ""}${loading ? " is-loading" : ""}`}
      aria-label={active ? (loading ? "불러오는 중" : "미리듣기 중지") : "미리듣기"}
      title={active ? (loading ? "불러오는 중…" : "미리듣기 중지") : "미리듣기"}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onPreview?.(soundId);
      }}
    >
      {loading ? (
        <Loader2 size={16} strokeWidth={2.4} aria-hidden className="showcase-sound-btn__spin" />
      ) : active ? (
        <VolumeX size={16} strokeWidth={2.4} aria-hidden />
      ) : (
        <Volume2 size={16} strokeWidth={2.4} aria-hidden />
      )}
    </button>
  );
}

/**
 * A. VLUE Signature Sound / B. User Original Sound
 * 설정 화면에서는 자동재생 없음 — 「BGM 미리듣기」만 재생
 */
export default function ShowcaseBgmPicker({
  value,
  onChange,
  inputCls = "",
  memberHandle = "",
  onToast
}) {
  const handle = resolveMemberHandle(memberHandle);
  const originalTrackLabel = handle ? `@${handle} Original Track` : "Original Track";
  const [tab, setTab] = useState("signature");
  const [signatures, setSignatures] = useState([]);
  const [signaturePage, setSignaturePage] = useState(0);
  const [genreQuery, setGenreQuery] = useState("");
  const [mine, setMine] = useState({ owned: [], borrowed: [] });
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addMenuFor, setAddMenuFor] = useState(null);
  const [previewingId, setPreviewingId] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef(null);
  const previewingIdRef = useRef("");
  const soundByIdRef = useRef(new Map());
  const { setPlaybackPhase, stopSettingsPreview, hushMainAudio, bindStyleConfig } = useShowcaseBgm();

  const paid = Boolean(quota?.paid);
  const playlist = Array.isArray(value?.playlist) ? value.playlist : [];
  const playlistLimit = quota?.playlistSelectLimit || (paid ? 5 : 1);
  const volumeLevel = normalizeBgmVolumeLevel(value?.volumeLevel);
  const playMode = value?.playMode || "single";
  const selectedId = value?.soundId || "";

  /** 하단 토스트 한 번 — 인라인에 남기지 않음 */
  const notify = (msg) => {
    const text = String(msg || "").trim();
    if (!text) return;
    setError("");
    if (typeof onToast === "function") onToast(text);
    else window.alert(text);
  };

  const filteredSignatures = useMemo(() => {
    const q = genreQuery.trim().toLowerCase();
    if (!q) return signatures;
    return signatures.filter((s) => {
      const hay = `${s.title || ""} ${s.artistName || ""} ${s.adminNote || ""} ${
        s.attributionLabel || ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [signatures, genreQuery]);

  const signaturePageCount = Math.max(1, Math.ceil(filteredSignatures.length / SIGNATURE_PAGE_SIZE));
  const signaturePageSafe = Math.min(signaturePage, signaturePageCount - 1);
  const signaturePageItems = useMemo(() => {
    const start = signaturePageSafe * SIGNATURE_PAGE_SIZE;
    return filteredSignatures.slice(start, start + SIGNATURE_PAGE_SIZE);
  }, [filteredSignatures, signaturePageSafe]);

  useEffect(() => {
    setSignaturePage(0);
  }, [filteredSignatures.length, genreQuery]);

  useEffect(() => {
    if (tab === "signature") setSignaturePage(0);
  }, [tab]);

  /* 목록 미리듣기용 음원 인덱스 (pointerdown 핸들러가 최신 URL을 쓰도록) */
  useEffect(() => {
    const map = new Map();
    for (const s of signatures) {
      if (s?.id) map.set(String(s.id), s);
    }
    for (const s of mine.owned || []) {
      if (s?.id) map.set(String(s.id), s);
    }
    for (const s of mine.borrowed || []) {
      if (s?.id) map.set(String(s.id), s);
    }
    soundByIdRef.current = map;
  }, [signatures, mine]);

  const stopLocalPreview = useCallback(() => {
    const el = previewAudioRef.current;
    if (el) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    previewingIdRef.current = "";
    setPreviewingId("");
    setPreviewPlaying(false);
  }, []);

  const ensurePreviewAudio = useCallback(() => {
    if (previewAudioRef.current) return previewAudioRef.current;
    const el = new Audio();
    el.preload = "auto";
    el.addEventListener("playing", () => setPreviewPlaying(true));
    el.addEventListener("pause", () => setPreviewPlaying(false));
    el.addEventListener("ended", () => {
      previewingIdRef.current = "";
      setPreviewingId("");
      setPreviewPlaying(false);
    });
    previewAudioRef.current = el;
    return el;
  }, []);

  /** Context 상태머신 우회 — 제스처 안에서 Audio.play() 만 호출 (즉각 반응) */
  const previewListSoundById = useCallback(
    (soundId) => {
      const id = String(soundId || "").trim();
      const sound = soundByIdRef.current.get(id);
      const url = String(sound?.audioUrl || "").trim();
      if (!id || !url || sound?.linkBroken) {
        const text = "미리들을 수 없는 음원입니다.";
        setError("");
        if (typeof onToast === "function") onToast(text);
        else window.alert(text);
        return;
      }

      if (previewingIdRef.current === id) {
        stopLocalPreview();
        return;
      }

      previewingIdRef.current = id;
      setPreviewingId(id);
      setPreviewPlaying(false);

      hushMainAudio?.();

      const el = ensurePreviewAudio();
      el.volume = resolveBgmVolumeGain({ bgm: { volumeLevel } });
      if (el.dataset.vlueUrl !== url) {
        el.dataset.vlueUrl = url;
        el.src = url;
      } else {
        try {
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      void el.play().catch(() => {
        void el.play().catch(() => {
          const text = "이 기기에서 미리듣기를 재생할 수 없습니다.";
          setError("");
          if (typeof onToast === "function") onToast(text);
          else window.alert(text);
          stopLocalPreview();
        });
      });
    },
    [ensurePreviewAudio, hushMainAudio, onToast, stopLocalPreview, volumeLevel]
  );

  useEffect(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    el.volume = resolveBgmVolumeGain({ bgm: { volumeLevel } });
  }, [volumeLevel]);

  useEffect(
    () => () => {
      const el = previewAudioRef.current;
      if (el) {
        el.pause();
        previewAudioRef.current = null;
      }
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sig, my, q] = await Promise.all([
        fetchSignatureSounds(),
        fetchMyShowcaseSounds(),
        fetchShowcaseSoundQuota()
      ]);
      setSignatures(sig.items || []);
      setMine({ owned: my.owned || [], borrowed: my.borrowed || [] });
      setQuota(q.quota);
    } catch (e) {
      setError(e?.message || "음원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    /* 설정 진입 시 다른 면 BGM 즉시 중지·소유권 확보.
       setPlaybackPhase 를 deps 에 넣으면 미리듣기 시 cleanup 이 재생을 끊음 */
    setPlaybackPhase("idle", { owner: "settings", steal: true });
    setError("");
    return () => {
      stopLocalPreview();
      stopSettingsPreview?.();
      setPlaybackPhase("idle", { steal: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, [load]);

  useEffect(() => {
    /* 목록 미리듣기 중에는 선택값 바인딩으로 URL 덮어쓰지 않음 */
    if (previewingId) return;
    bindStyleConfig?.({ bgm: value || { mode: "none" } }, { owner: "settings" });
  }, [value, bindStyleConfig, previewingId]);

  const patchBgm = (partial) => {
    onChange?.({ ...(value || {}), ...partial });
  };

  const applySound = async (sound, mode, extras = {}) => {
    try {
      if (value?.soundId && value.soundId !== sound.id) {
        await notifyThemeBgmChange();
      }
    } catch (e) {
      setError(e?.message || "주제곡 변경 제한");
      return;
    }
    const patch = soundToBgmPatch(sound, mode, {
      ownerHandle: mode === "user" ? handle : extras.ownerHandle,
      sharedOwnerHandle: mode === "borrowed" ? extras.sharedOwnerHandle || sound.ownerHandle : "",
      createType: sound.createType
    });
    const entry = soundToPlaylistEntry(sound, mode, {
      ownerHandle: handle,
      sharedOwnerHandle: extras.sharedOwnerHandle
    });
    let nextPlaylist;
    if (!paid) {
      nextPlaylist = entry.audioUrl ? [entry] : [];
    } else if (playlist.length) {
      nextPlaylist = playlist.some((p) => p.soundId === entry.soundId)
        ? playlist
        : entry.audioUrl
          ? [entry, ...playlist].slice(0, playlistLimit)
          : playlist;
    } else {
      nextPlaylist = entry.audioUrl ? [entry] : [];
    }
    const nextPlayMode =
      !paid || nextPlaylist.length <= 1
        ? paid
          ? playMode
          : "single"
        : playMode === "single"
          ? "order"
          : playMode;
    /* 설정 화면 자동재생 금지 */
    setPlaybackPhase("idle", { owner: "settings" });
    stopLocalPreview();
    stopSettingsPreview?.();
    onChange?.({
      ...(value || {}),
      ...patch,
      volumeLevel,
      playMode: nextPlayMode,
      playlist: nextPlaylist
    });
  };

  const clearBgm = () => {
    stopLocalPreview();
    stopSettingsPreview?.();
    setPlaybackPhase("idle", { owner: "settings", steal: true });
    onChange?.({
      mode: "none",
      soundId: "",
      title: "",
      artistName: "",
      audioUrl: "",
      attributionLabel: "",
      linkBroken: false,
      ownerHandle: "",
      sharedOwnerHandle: "",
      createType: "",
      volumeLevel,
      playMode: "single",
      playlist: []
    });
  };

  const deleteOwnedSound = async (sound) => {
    const id = String(sound?.id || "").trim();
    if (!id) return;
    const title = String(sound?.title || "이 음원").trim();
    if (!window.confirm(`「${title}」을(를) Original Track에서 삭제할까요?\n삭제하면 복구할 수 없습니다.`)) {
      return;
    }
    setError("");
    try {
      await deleteShowcaseSound(id);
      if (selectedId === id) clearBgm();
      else {
        const nextPlaylist = playlist.filter((t) => t.soundId !== id);
        if (nextPlaylist.length !== playlist.length) patchBgm({ playlist: nextPlaylist });
      }
      await load();
    } catch (e) {
      setError(e?.message || "삭제에 실패했습니다.");
    }
  };

  const addToPlaylist = (sound, mode, extras = {}) => {
    if (!paid) {
      notify("재생목록 추가는 유료 회원만 가능합니다. 무료는 1곡 선택·퍼오기만 가능합니다.");
      return;
    }
    const entry = soundToPlaylistEntry(sound, mode, {
      ownerHandle: handle,
      sharedOwnerHandle: extras.sharedOwnerHandle
    });
    if (!entry.audioUrl) {
      notify("재생할 수 없는 음원입니다.");
      return;
    }
    if (playlist.some((p) => p.soundId === entry.soundId)) {
      notify("이미 재생목록에 있습니다.");
      return;
    }
    if (playlist.length >= playlistLimit) {
      notify(`재생목록은 최대 ${playlistLimit}곡까지 선택할 수 있습니다.`);
      return;
    }
    setError("");
    const nextPlaylist = [...playlist, entry];
    const patch = { playlist: nextPlaylist };
    if (nextPlaylist.length >= 2 && playMode === "single") {
      patch.playMode = "order";
      notify(`재생목록 ${nextPlaylist.length}/${playlistLimit}곡 · 순서재생으로 전환되었습니다.`);
    } else {
      notify(`재생목록에 추가했습니다. (${nextPlaylist.length}/${playlistLimit})`);
    }
    patchBgm(patch);
  };

  /** 보관·선택 중인 주제곡을 재생목록에 넣기 */
  const addCurrentToPlaylist = () => {
    if (!value?.soundId || !value?.audioUrl || value.mode === "none" || value.linkBroken) {
      notify("재생목록에 넣을 음원을 먼저 선택해 주세요.");
      return;
    }
    addToPlaylist(
      {
        id: value.soundId,
        title: value.title,
        audioUrl: value.audioUrl,
        attributionLabel: value.attributionLabel,
        createType: value.createType,
        linkBroken: value.linkBroken,
        ownerHandle: value.ownerHandle
      },
      value.mode,
      { sharedOwnerHandle: value.sharedOwnerHandle }
    );
  };

  const runAddAction = async (actionId, sound, mode, extras = {}) => {
    setAddMenuFor(null);
    if (actionId === "showcase") {
      await applySound(sound, mode, extras);
      return;
    }
    if (actionId === "playlist") {
      addToPlaylist(sound, mode, extras);
      return;
    }
    if (actionId === "library") {
      if (!paid) {
        notify("내 사운드에 담기는 유료 회원만 가능합니다. 무료는 퍼오기만 가능합니다.");
        return;
      }
      if (mode === "borrowed" || sound.kind === "signature") {
        try {
          await borrowShowcaseSound(sound.id);
          await load();
        } catch (e) {
          notify(e?.message || "담기에 실패했습니다.");
        }
      } else {
        notify("이미 내 Original Track입니다.");
      }
    }
  };

  return (
    <div className="showcase-sound-picker">
      <p className="showcase-sound-picker__policy">
        VLUE는 음원을 판매하거나 저작권을 최종 인증하지 않습니다. 적법한 권리·이용 권한이 있는 음원을
        쇼케이스에 연결합니다.
      </p>

      <div className="showcase-sound-picker__volume" role="group" aria-label="BGM 음량">
        <span className="showcase-sound-picker__volume-label">
          <Volume2 size={14} aria-hidden /> 음량
        </span>
        <div className="showcase-sound-picker__volume-opts">
          {BGM_VOLUME_LEVELS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={volumeLevel === v.id ? "is-on" : ""}
              onClick={() => patchBgm({ volumeLevel: v.id })}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {paid ? (
        <div className="showcase-sound-picker__playmode" role="group" aria-label="재생 방식">
          <span className="showcase-sound-picker__volume-label">재생</span>
          <div className="showcase-sound-picker__volume-opts">
            {BGM_PLAY_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={playMode === m.id ? "is-on" : ""}
                onClick={() => patchBgm({ playMode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            재생목록 2곡 이상이면 ◀▶ 로 넘길 수 있습니다. 순서재생: 목록을 이어서 재생 · 셔플: 섞어
            재생합니다.
            {playlist.length > 1 && playMode === "single"
              ? " (지금은 단독이어도 목록 기준으로 재생됩니다)"
              : ""}
          </p>
        </div>
      ) : (
        <p className="showcase-sound-picker__quota">
          무료: 쇼케이스 BGM 주 1회 변경 · 1곡 선택재생 · 업로드 불가 · 퍼오기만 가능
        </p>
      )}

      <div className="showcase-sound-picker__tabs">
        <button
          type="button"
          className={tab === "signature" ? "is-on" : ""}
          onClick={() => setTab("signature")}
        >
          <Sparkles size={14} /> VLUE Signature Sound
        </button>
        <button type="button" className={tab === "user" ? "is-on" : ""} onClick={() => setTab("user")}>
          <Upload size={14} /> User Original Sound
        </button>
      </div>

      {value?.mode && value.mode !== "none" ? (
        <div className="showcase-sound-picker__current is-selected">
          <Music2 size={14} />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{value.title || "선택됨"}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {value.artistName || "—"} · {value.attributionLabel || value.mode}
              {value.linkBroken ? " · 연결 끊김" : ""}
            </p>
          </div>
          {paid ? (
            <button
              type="button"
              className="showcase-sound-btn showcase-sound-btn--ghost"
              onClick={addCurrentToPlaylist}
              title="재생목록에 추가"
              aria-label="재생목록에 추가"
            >
              <ListMusic size={14} /> 재생목록
            </button>
          ) : null}
          <button
            type="button"
            className="showcase-sound-btn showcase-sound-btn--danger"
            onClick={clearBgm}
            title="쇼케이스에서 이 음원 연결 삭제"
          >
            <Trash2 size={14} /> 삭제
          </button>
      </div>
      ) : (
        <p className="text-[11px] text-slate-500 mb-2">아래에서 곡을 선택하세요. 목록의 스피커로 미리들을 수 있습니다.</p>
      )}

      {quota?.paid ? (
        <p className="showcase-sound-picker__quota">
          유료: 오늘 업로드 {quota.registerCount}/{quota.registerLimit} · 보관 {quota.ownedCount}/
          {quota.libraryLimit} · 재생목록 {playlist.length}/{playlistLimit}
        </p>
      ) : null}

      {tab === "signature" ? (
        <div className="showcase-sound-genre-search">
          <label className="showcase-sound-genre-search__field">
            <span className="sr-only">장르 검색</span>
            <Search size={14} aria-hidden className="showcase-sound-genre-search__icon" />
            <input
              type="search"
              className={`${inputCls} showcase-sound-genre-search__input`.trim()}
              placeholder="Genre search"
              value={genreQuery}
              onChange={(e) => setGenreQuery(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <p className="showcase-sound-genre-search__help">
            장르는 <b>영문</b>으로 검색하세요. 예: Jazz, Lo-fi, Hiphop, Ambient
          </p>
            </div>
      ) : null}

      {playlist.length > 0 && paid ? (
        <div className="showcase-sound-playlist">
          <p className="showcase-sound-list__h">
            선택 재생목록 ({playlist.length}/{playlistLimit})
            {playlist.length > 1 ? " · 연속재생" : ""}
          </p>
          {playlist.map((t) => (
            <div key={t.soundId} className="showcase-sound-playlist__row">
              <span className="truncate">{t.title}</span>
              <button
                type="button"
                className="showcase-sound-btn showcase-sound-btn--ghost"
                onClick={() => patchBgm({ playlist: playlist.filter((p) => p.soundId !== t.soundId) })}
              >
                제거
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="showcase-sound-picker__err">{error}</p> : null}
      {loading ? (
        <p className="showcase-sound-picker__loading">
          <Loader2 className="inline animate-spin" size={14} /> 불러오는 중…
        </p>
      ) : null}

      {tab === "signature" && !loading ? (
        <div className="showcase-sound-list">
          {signaturePageItems.map((s) => (
            <div
              key={s.id}
              className={`showcase-sound-list__item-row${selectedId === s.id ? " is-selected" : ""}`}
            >
              <button type="button" className="showcase-sound-list__item" onClick={() => applySound(s, "signature")}>
                <span className="font-bold">{s.title}</span>
                <span className="text-[11px] text-slate-500">
                  {s.artistName || "VLUE"} · {s.attributionLabel}
                </span>
                {selectedId === s.id ? <Check size={14} className="text-emerald-600" aria-hidden /> : null}
              </button>
              <PreviewSpeakerBtn
                soundId={s.id}
                active={previewingId === s.id}
                playing={previewingId === s.id && previewPlaying}
                onPreview={previewListSoundById}
              />
              {paid ? (
                <button
                  type="button"
                  className="showcase-sound-btn showcase-sound-btn--ghost"
                  aria-label="담기"
                  onClick={() => setAddMenuFor({ sound: s, mode: "signature" })}
                >
                  <Plus size={14} />
                </button>
              ) : null}
            </div>
          ))}
          {!filteredSignatures.length ? (
            <p className="showcase-sound-list__lead">
              {signatures.length
                ? "검색 결과가 없습니다. 영문 장르명으로 다시 검색해 보세요."
                : "등록된 Signature Sound가 없습니다."}
            </p>
          ) : signaturePageCount > 1 ? (
            <div className="showcase-sound-pager" role="navigation" aria-label="Signature Sound 페이지">
              <button
                type="button"
                className="showcase-sound-pager__btn"
                aria-label="이전 페이지"
                disabled={signaturePageSafe <= 0}
                onClick={() => setSignaturePage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={16} strokeWidth={2.4} aria-hidden />
              </button>
              <p className="showcase-sound-pager__label" aria-live="polite">
                <b>{signaturePageSafe + 1}</b>
                <span> / {signaturePageCount}</span>
              </p>
              <button
                type="button"
                className="showcase-sound-pager__btn"
                aria-label="다음 페이지"
                disabled={signaturePageSafe >= signaturePageCount - 1}
                onClick={() => setSignaturePage((p) => Math.min(signaturePageCount - 1, p + 1))}
              >
                <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
          </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "user" && !loading ? (
        <div className="showcase-sound-list">
          {paid ? (
            <button
              type="button"
              className="showcase-sound-btn showcase-sound-btn--primary"
              onClick={() => setRegisterOpen(true)}
              disabled={quota && !quota.canRegister}
            >
              <Upload size={14} /> 음원 등록
            </button>
          ) : (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              무료 회원은 음원 업로드가 불가합니다. Signature 선택 또는 Shared Track 퍼오기만 가능합니다.
            </p>
          )}
          {quota && paid && !quota.canRegister ? (
            <p className="text-[11px] text-amber-700">오늘 업로드 한도 또는 보관 한도에 도달했습니다.</p>
        ) : null}

          <h4 className="showcase-sound-list__h">
            <span>{originalTrackLabel}</span>
            <SoundHelp text="내가 VLUE에 등록·업로드한 내 음원입니다. 쇼케이스 배경음악으로 선택해 사용할 수 있습니다." />
          </h4>
          {(mine.owned || []).map((s) => (
            <div
              key={s.id}
              className={`showcase-sound-list__item-row${selectedId === s.id ? " is-selected" : ""}`}
            >
              <button type="button" className="showcase-sound-list__item" onClick={() => applySound(s, "user")}>
                <span className="font-bold">{s.title}</span>
                <span className="text-[11px] text-slate-500">
                  {s.attributionLabel} · {s.visibility === "public" ? "공개" : "비공개"}
                </span>
                {selectedId === s.id ? <Check size={14} className="text-emerald-600" aria-hidden /> : null}
              </button>
              <PreviewSpeakerBtn
                soundId={s.id}
                active={previewingId === s.id}
                playing={previewingId === s.id && previewPlaying}
                onPreview={previewListSoundById}
              />
              {paid ? (
                <button
                  type="button"
                  className="showcase-sound-btn showcase-sound-btn--ghost"
                  aria-label="재생목록에 추가"
                  title="재생목록에 추가"
                  onClick={() => addToPlaylist(s, "user")}
                >
                  <ListMusic size={14} />
                </button>
              ) : null}
              <button
                type="button"
                className="showcase-sound-btn showcase-sound-btn--danger"
                aria-label="음원 삭제"
                title="Original Track에서 삭제"
                onClick={() => deleteOwnedSound(s)}
              >
                <Trash2 size={14} />
              </button>
              {paid ? (
                <button
                  type="button"
                  className="showcase-sound-btn showcase-sound-btn--ghost"
                  aria-label="담기"
                  onClick={() => setAddMenuFor({ sound: s, mode: "user" })}
                >
                  <Plus size={14} />
                </button>
              ) : null}
          </div>
          ))}
          {!mine.owned?.length ? (
            <p className="text-[12px] text-slate-500">등록한 Original Track이 없습니다.</p>
        ) : null}

          <h4 className="showcase-sound-list__h">
            <span>VLUE Shared Track</span>
            <SoundHelp text="공개된 다른 쇼케이스 음원을 가져와(퍼와) 내 쇼케이스에 연결한 음원입니다." />
          </h4>
          {(mine.borrowed || []).map((b) => (
            <div
              key={b.borrowId}
              className={`showcase-sound-list__item-row${selectedId === b.sound?.id ? " is-selected" : ""}`}
            >
          <button
            type="button"
                className={`showcase-sound-list__item${b.sound?.linkBroken ? " is-broken" : ""}`}
            onClick={() => {
                  if (b.sound?.linkBroken) {
                    notify("원본 음원이 비공개·삭제되어 연결이 끊어졌습니다.");
                    return;
                  }
                  applySound(b.sound, "borrowed", { sharedOwnerHandle: b.sound?.ownerHandle });
                }}
              >
                <span className="font-bold">{b.sound?.title || "연결 끊김"}</span>
                <span className="text-[11px] text-slate-500">
                  {b.sound?.linkBroken ? "연결 끊김" : b.sound?.attributionLabel}
                </span>
                {selectedId === b.sound?.id ? (
                  <Check size={14} className="text-emerald-600" aria-hidden />
                ) : null}
              </button>
              {!b.sound?.linkBroken ? (
                <PreviewSpeakerBtn
                  soundId={b.sound?.id}
                  active={previewingId === b.sound?.id}
                  playing={previewingId === b.sound?.id && previewPlaying}
                  onPreview={previewListSoundById}
                />
              ) : null}
              {paid && !b.sound?.linkBroken ? (
                <button
                  type="button"
                  className="showcase-sound-btn showcase-sound-btn--ghost"
                  aria-label="담기"
                  onClick={() =>
                    setAddMenuFor({
                      sound: b.sound,
                      mode: "borrowed",
                      extras: { sharedOwnerHandle: b.sound?.ownerHandle }
                    })
                  }
                >
                  <Plus size={14} />
          </button>
              ) : null}
            </div>
          ))}
          {!mine.borrowed?.length ? (
            <p className="text-[12px] text-slate-500">퍼온 Shared Track이 없습니다.</p>
          ) : null}
        </div>
        ) : null}

      {addMenuFor ? (
        <div className="showcase-sound-add-sheet" role="dialog" aria-label="담기">
          <div className="showcase-sound-add-sheet__panel">
            <p className="font-bold text-[13px] mb-2">🎵 담기 · {addMenuFor.sound?.title}</p>
            {ADD_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="showcase-sound-add-sheet__btn"
                onClick={() =>
                  runAddAction(a.id, addMenuFor.sound, addMenuFor.mode, addMenuFor.extras || {})
                }
              >
                🎵 {a.label}
              </button>
            ))}
            {addMenuFor.mode === "user" ? (
              <button
                type="button"
                className="showcase-sound-add-sheet__btn showcase-sound-add-sheet__btn--danger"
                onClick={() => {
                  const sound = addMenuFor.sound;
                  setAddMenuFor(null);
                  void deleteOwnedSound(sound);
                }}
              >
                삭제 (Original Track에서 제거)
              </button>
            ) : null}
            <button
              type="button"
              className="showcase-sound-btn showcase-sound-btn--ghost showcase-sound-add-sheet__close mt-2 w-full"
              onClick={() => setAddMenuFor(null)}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {registerOpen ? (
        <UserSoundRegisterSheet
          inputCls={inputCls}
          onClose={() => setRegisterOpen(false)}
          onRegistered={async (sound) => {
            setRegisterOpen(false);
            await load();
            await applySound(sound, "user");
          }}
        />
        ) : null}
    </div>
  );
}

function UserSoundRegisterSheet({ inputCls, onClose, onRegistered }) {
  const [createType, setCreateType] = useState("human_created");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [fileMeta, setFileMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyrightVerify, setCopyrightVerify] = useState(null);
  const [consent, setConsent] = useState(false);
  const [consentRights, setConsentRights] = useState(false);
  const [consentThird, setConsentThird] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [commercialUse, setCommercialUse] = useState(false);
  const [aiMeta, setAiMeta] = useState({
    service: "Suno",
    serviceOther: "",
    generatedAt: "",
    plan: "paid",
    lyrics: "self",
    melody: "ai",
    vocalAi: false,
    finalEdit: "edited"
  });

  const ai = isAiType(createType);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const meta = await uploadShowcaseSoundFile(file);
      setFileMeta(meta);
    } catch (err) {
      setError(err?.message || "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!fileMeta?.audioUrl) throw new Error("음원 파일을 업로드해 주세요.");
      if (!consent || !consentRights || !consentThird) {
        throw new Error("필수 동의 항목에 체크해 주세요.");
      }
      if (ai && !consentAi) throw new Error("AI 음원 추가 동의에 체크해 주세요.");
      const sound = await registerShowcaseSound({
        title,
        artistName,
        createType,
        visibility,
        audioUrl: fileMeta.audioUrl,
        objectKey: fileMeta.objectKey,
        contentType: fileMeta.contentType,
        fileSize: fileMeta.fileSize,
        aiMeta: ai ? aiMeta : undefined,
        copyrightVerify: copyrightVerify || undefined,
        commercialUseClaimed: commercialUse,
        rightsConsent: true
      });
      await onRegistered?.(sound);
    } catch (err) {
      setError(err?.message || "등록 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="showcase-sound-register">
      <div className="showcase-sound-register__head">
        <h4>User Original 등록</h4>
        <button type="button" className="showcase-sound-btn showcase-sound-btn--ghost" onClick={onClose}>
          닫기
        </button>
      </div>
      <fieldset className="showcase-sound-register__types">
        <legend>음원 유형</legend>
        {CREATE_TYPES.map((t) => (
          <label key={t.id} className="showcase-sound-register__type">
            <input
              type="radio"
              name="createType"
              checked={createType === t.id}
              onChange={() => setCreateType(t.id)}
            />
            {t.label}
          </label>
        ))}
      </fieldset>
      <input className={inputCls} placeholder="음원 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input
        className={inputCls}
        placeholder="아티스트명 (선택)"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
      />
      <label className="showcase-sound-register__file">
        <Upload size={14} /> 음원 파일 (mp3/m4a/wav · R2 Direct Upload)
        <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" onChange={onFile} disabled={uploading} />
      </label>
      {fileMeta?.audioUrl ? <p className="text-[11px] text-emerald-700">업로드 완료</p> : null}
      {uploading ? <p className="text-[11px]">업로드 중…</p> : null}

      {ai ? (
        <div className="showcase-sound-register__ai">
          <p className="font-bold text-[12px]">AI 음원 상세</p>
          <select
            className={inputCls}
            value={aiMeta.service}
            onChange={(e) => setAiMeta((m) => ({ ...m, service: e.target.value }))}
          >
            {AI_SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={commercialUse}
              onChange={(e) => setCommercialUse(e.target.checked)}
            />
            상업적 이용 권한 보유를 확인했습니다
          </label>
        </div>
      ) : null}

      <CopyrightVerifySearch
        defaultTitle={title}
        defaultAuthor={artistName}
        onSelect={setCopyrightVerify}
        inputCls={inputCls}
      />

      <label className="flex gap-2 text-[11px] items-start mt-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{RIGHTS_TEXT}</span>
      </label>
      <label className="flex gap-2 text-[11px] items-start">
        <input type="checkbox" checked={consentRights} onChange={(e) => setConsentRights(e.target.checked)} />
        본인은 이 음원을 VLUE에 업로드하고 재생할 권리를 보유하고 있습니다.
      </label>
      <label className="flex gap-2 text-[11px] items-start">
        <input type="checkbox" checked={consentThird} onChange={(e) => setConsentThird(e.target.checked)} />
        타인의 저작물·음원·보컬·샘플·가사를 무단 사용하지 않았습니다.
      </label>
      {ai ? (
        <label className="flex gap-2 text-[11px] items-start">
          <input type="checkbox" checked={consentAi} onChange={(e) => setConsentAi(e.target.checked)} />
          AI 생성 서비스 약관상 VLUE 공개·재생이 허용됨을 확인했습니다.
        </label>
      ) : null}

      <label className="flex gap-2 text-[12px] mt-2">
        공개 범위
        <select className={inputCls} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="private">비공개</option>
          <option value="public">공개 (퍼가기 허용)</option>
        </select>
      </label>

      {error ? <p className="showcase-sound-picker__err">{error}</p> : null}
      <button type="button" className="showcase-sound-btn showcase-sound-btn--primary w-full mt-2" disabled={busy} onClick={submit}>
        {busy ? "등록 중…" : "등록"}
      </button>
    </div>
  );
}

/** 공개 Signature/타인 음원 퍼가기 헬퍼 (쇼케이스 보기에서 호출) */
export { borrowShowcaseSound };
