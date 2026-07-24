import { useEffect, useMemo, useState } from "react";
import { Music2, X } from "lucide-react";
import { resolveShowcaseBgmLabel } from "../../lib/showcase/showcaseBgmPresets.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";

const MODE_LABEL = {
  signature: "VLUE Signature Sound",
  user: "User Original Sound",
  borrowed: "Shared Track (퍼가기)",
  none: "없음"
};

/**
 * 쇼케이스 음원 칩 — 탭 시 관련 정보 + 재생 언락
 */
export default function ShowcaseBgmTrackChip({
  styleConfig,
  visible = true,
  className = "",
  /** top | inline — 상단 고정 / 하단 바 안 */
  placement = "top"
}) {
  const [open, setOpen] = useState(false);
  const { unlockFromUserGesture, setPlaybackPhase, phase, bgmUrl, effectiveMuted, toggleUserMute } =
    useShowcaseBgm();
  const bgm = styleConfig?.bgm || null;
  const label = resolveShowcaseBgmLabel(styleConfig);

  const details = useMemo(() => {
    if (!bgm || bgm.mode === "none") return null;
    return {
      title: String(bgm.title || "").trim() || "제목 없음",
      artist: String(bgm.artistName || "").trim() || "—",
      attribution: String(bgm.attributionLabel || "").trim() || "—",
      mode: MODE_LABEL[bgm.mode] || bgm.mode || "—",
      linkBroken: Boolean(bgm.linkBroken),
      hasAudio: Boolean(String(bgm.audioUrl || "").trim())
    };
  }, [bgm]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  if (!visible || !label || !details) return null;

  const onTapChip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    unlockFromUserGesture?.();
    if (phase === "idle" || phase === "call_active") {
      setPlaybackPhase?.("replay");
    }
    setOpen(true);
  };

  const onClose = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`showcase-bgm-chip showcase-bgm-chip--${placement} ${className}`.trim()}
        aria-label={`음원 정보: ${label}`}
        title="음원 정보 보기"
        onClick={onTapChip}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Music2 size={13} strokeWidth={2.4} aria-hidden />
        <span className="showcase-bgm-chip__label">{label}</span>
        <Music2 size={12} strokeWidth={2.2} aria-hidden className="showcase-bgm-chip__tail" />
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
                <dt>아티스트</dt>
                <dd>{details.artist}</dd>
              </div>
              <div>
                <dt>유형</dt>
                <dd>{details.mode}</dd>
              </div>
              <div>
                <dt>고지</dt>
                <dd>{details.attribution}</dd>
              </div>
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
            <div className="showcase-bgm-sheet__actions">
              <button
                type="button"
                className="showcase-bgm-sheet__btn"
                onClick={(e) => {
                  e.stopPropagation();
                  unlockFromUserGesture?.();
                  setPlaybackPhase?.("replay");
                  if (effectiveMuted && bgmUrl) toggleUserMute?.();
                }}
              >
                {effectiveMuted ? "재생" : "재생 중"}
              </button>
              <button type="button" className="showcase-bgm-sheet__btn is-ghost" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
