import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { resolveShowcaseBgmMarqueeText } from "../../lib/showcase/showcaseBgmPresets.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import {
  borrowShowcaseSound,
  fetchShowcaseSoundQuota
} from "../../lib/showcase/showcaseSoundApi.js";
import { readShowcaseStyle, writeShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";

const MODE_LABEL = {
  signature: "VLUE Signature Sound",
  user: "User Original Sound",
  borrowed: "Shared Track",
  none: "미설정"
};

const PLAYLIST_SELECT_LIMIT = 5;

function bgmToPlaylistEntry(bgm) {
  return {
    soundId: String(bgm?.soundId || "").trim(),
    title: String(bgm?.title || "").trim(),
    audioUrl: String(bgm?.audioUrl || "").trim(),
    mode: bgm?.mode || "user",
    attributionLabel: String(bgm?.attributionLabel || "").trim(),
    ownerHandle: String(bgm?.ownerHandle || "").replace(/^@/, "").trim(),
    sharedOwnerHandle: String(bgm?.sharedOwnerHandle || "").replace(/^@/, "").trim(),
    createType: bgm?.createType || "",
    linkBroken: Boolean(bgm?.linkBroken)
  };
}

/**
 * 쇼케이스 음원 칩 — 🎵 고정 + 제목 마키, 탭 시 정보만 (재생은 전송 컨트롤)
 */
export default function ShowcaseBgmTrackChip({
  styleConfig,
  visible = true,
  className = "",
  placement = "top",
  autoResumePlayback = true,
  onToast
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const { visitSessionKey, trackIndex, effectiveMuted, bgmUrl } = useShowcaseBgm();
  const bgm = styleConfig?.bgm || null;
  const marquee = resolveShowcaseBgmMarqueeText(styleConfig, visitSessionKey, trackIndex);

  const details = useMemo(() => {
    if (!bgm || bgm.mode === "none") return null;
    return {
      title: String(bgm.title || "").trim() || "제목 없음",
      artist: String(bgm.artistName || "").trim() || "—",
      attribution: String(bgm.attributionLabel || "").trim() || "—",
      mode: MODE_LABEL[bgm.mode] || bgm.mode || "—",
      ownerHandle: String(bgm.ownerHandle || "").trim(),
      sharedOwnerHandle: String(bgm.sharedOwnerHandle || "").trim(),
      linkBroken: Boolean(bgm.linkBroken),
      hasAudio: Boolean(String(bgm.audioUrl || "").trim()),
      soundId: String(bgm.soundId || "").trim(),
      volumeLevel: bgm.volumeLevel || "medium"
    };
  }, [bgm]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  if (!visible || !marquee || !details) return null;

  const toast = (msg) => {
    setActionMsg(msg);
    onToast?.(msg);
  };

  const onTapChip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActionMsg("");
    setOpen(true);
  };

  const onClose = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(false);
  };

  const onAddToLibrary = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!details.soundId) {
      toast("담을 수 있는 음원 ID가 없습니다.");
      return;
    }
    setBusy("library");
    setActionMsg("");
    try {
      const q = await fetchShowcaseSoundQuota();
      if (!q.quota?.paid && !q.quota?.canAddToLibrary) {
        throw new Error("사운드에 담기는 유료 회원만 가능합니다.");
      }
      await borrowShowcaseSound(details.soundId);
      toast("내 사운드에 담았습니다.");
    } catch (err) {
      toast(err?.message || "담기에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const onAddToPlaylist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!details.soundId || !details.hasAudio || details.linkBroken) {
      toast("재생목록에 추가할 수 없는 음원입니다.");
      return;
    }
    setBusy("playlist");
    setActionMsg("");
    try {
      const q = await fetchShowcaseSoundQuota();
      const paid = Boolean(q.quota?.paid);
      const limit = q.quota?.playlistSelectLimit || (paid ? PLAYLIST_SELECT_LIMIT : 1);
      if (!paid) {
        throw new Error("재생목록 추가는 유료 회원만 가능합니다.");
      }
      const style = readShowcaseStyle();
      const playlist = Array.isArray(style?.bgm?.playlist) ? [...style.bgm.playlist] : [];
      if (playlist.some((p) => p?.soundId === details.soundId)) {
        throw new Error("이미 재생목록에 있습니다.");
      }
      if (playlist.length >= limit) {
        throw new Error(`재생목록은 최대 ${limit}곡까지입니다.`);
      }
      const entry = bgmToPlaylistEntry(bgm);
      writeShowcaseStyle({
        bgm: {
          ...style.bgm,
          playlist: [...playlist, entry]
        }
      });
      toast("재생목록에 추가했습니다.");
    } catch (err) {
      toast(err?.message || "재생목록 추가에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <button
        type="button"
        className={`showcase-bgm-chip showcase-bgm-chip--${placement}${
          !effectiveMuted && autoResumePlayback ? " is-playing" : ""
        } ${className}`.trim()}
        aria-label={`음원 정보: ${marquee}`}
        title="음원 정보 보기"
        onClick={onTapChip}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="showcase-bgm-chip__note" aria-hidden>
          🎵
        </span>
        <span className="showcase-bgm-chip__marquee" aria-hidden={!marquee}>
          <span className="showcase-bgm-chip__marquee-track">
            <span>{marquee}</span>
            <span className="showcase-bgm-chip__marquee-gap">···</span>
            <span>{marquee}</span>
          </span>
        </span>
      </button>

      {open ? (
        <div
          className="showcase-bgm-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="음원 정보"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="showcase-bgm-sheet__panel"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="showcase-bgm-sheet__head">
              <p className="showcase-bgm-sheet__kicker">음원 정보</p>
              <button type="button" className="showcase-bgm-sheet__close" aria-label="닫기" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <h3 className="showcase-bgm-sheet__title">{details.title}</h3>
            <dl className="showcase-bgm-sheet__dl">
              <div>
                <dt>표시</dt>
                <dd>{marquee}</dd>
              </div>
              <div>
                <dt>유형</dt>
                <dd>{details.mode}</dd>
              </div>
              <div>
                <dt>고지</dt>
                <dd>{details.attribution}</dd>
              </div>
              {details.ownerHandle || details.sharedOwnerHandle ? (
                <div>
                  <dt>계정</dt>
                  <dd>
                    {details.sharedOwnerHandle
                      ? `@${details.sharedOwnerHandle.replace(/^@/, "")} (Shared)`
                      : `@${details.ownerHandle.replace(/^@/, "")}`}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>재생</dt>
                <dd>
                  {details.linkBroken
                    ? "연결이 끊긴 음원"
                    : !details.hasAudio
                      ? "오디오 URL 없음"
                      : !bgmUrl
                        ? "재생 URL 없음"
                        : effectiveMuted
                          ? "일시정지·무음"
                          : "재생 중"}
                </dd>
              </div>
            </dl>
            <p className="showcase-bgm-sheet__note">
              VLUE는 음원을 판매하거나 저작권을 최종 인증하지 않습니다. 등록자 권리·이용 권한 범위에서
              소개·재생됩니다.
            </p>
            {actionMsg ? <p className="showcase-bgm-sheet__action-msg">{actionMsg}</p> : null}
            <div className="showcase-bgm-sheet__actions showcase-bgm-sheet__actions--stack">
              <button
                type="button"
                className="showcase-bgm-sheet__btn"
                disabled={Boolean(busy)}
                onClick={onAddToLibrary}
              >
                {busy === "library" ? "담는 중…" : "🎵+사운드에 담기"}
              </button>
              <button
                type="button"
                className="showcase-bgm-sheet__btn is-ghost"
                disabled={Boolean(busy)}
                onClick={onAddToPlaylist}
              >
                {busy === "playlist" ? "추가 중…" : "🎵 재생목록에 추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
