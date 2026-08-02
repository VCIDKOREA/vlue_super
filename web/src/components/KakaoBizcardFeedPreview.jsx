import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Trash2 } from "lucide-react";
import { readProfilePhotoAvatar, scrubBrandAvatarsFromStorage } from "../lib/vlueAvatar.js";
import { withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import { scrubLetteringDemoPollution } from "../lib/letteringDemoPollution.js";
import { syncDigitalCardExportSnapshot } from "../lib/digitalCardApi.js";
import { buildPublicShowcaseUrl } from "../lib/vlueViralLinks.js";
import { readLetteringFixedIdentity } from "../lib/letteringBizcardStorage.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  readLetteringBizcardEditable,
  writeLetteringBizcardEditable
} from "../lib/letteringBizcardStorage.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { VLUE_SHOWCASE_DEMO_RECORDING_SEC } from "../lib/vlueShowcaseCard.js";
import { pushAndroidBackHandler } from "../lib/androidBackStack.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import UserProfileAvatar from "./UserProfileAvatar.jsx";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { compressAndUploadMediaImageOrThrow } from "../lib/mediaImageUpload.js";

function buildTags(card) {
  const tags = [];
  const title = String(card.title || "").trim();
  const dept = String(card.department || "").trim();
  if (dept) tags.push(dept);
  if (title && title !== dept) tags.push(title);
  return tags.slice(0, 3);
}

function openExternalSafely(url) {
  if (!url) return false;
  try {
    if (typeof window.Android?.openExternalUrl === "function") {
      window.Android.openExternalUrl(url);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof window.VlueLettering?.openUrl === "function") {
      window.VlueLettering.openUrl(url);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function compressCoverFile(file) {
  const uploaded = await compressAndUploadMediaImageOrThrow(file, "cover");
  return uploaded.url;
}

function readVlueHandleDisplay() {
  try {
    const raw = String(localStorage.getItem("vlue_member_handle") || "").trim();
    if (!raw) return "";
    return raw.startsWith("@") ? raw : `@${raw}`;
  } catch {
    return "";
  }
}

/**
 * 카카오톡에 붙여넣을 때 보이는 「쇼케이스 카드」 UI 미리보기
 */
export default function KakaoBizcardFeedPreview({
  card,
  className = "",
  membershipTier = "free",
  isDarkMode = false,
  onToast
}) {
  const snap = useMemo(
    () => scrubLetteringDemoPollution(withLetteringBizcardPreviewFallback(card || {})),
    [card]
  );
  const [avatarTick, setAvatarTick] = useState(0);
  const [coverTick, setCoverTick] = useState(0);
  const fileRef = useRef(null);
  const name = String(snap.name || "").trim();
  const org = String(snap.organization || "").trim();
  const isPaid = isPaidLetteringTier(membershipTier || snap.membershipTier || "free");
  const vlueHandle = readVlueHandleDisplay();
  const title = String(snap.title || "").trim();
  const dept = String(snap.department || "").trim();
  const roleLine = isPaid
    ? [dept, title].filter(Boolean).join(" | ")
    : [vlueHandle, String(snap.phone || readLetteringFixedIdentity().phone || "").trim()]
        .filter(Boolean)
        .join(" · ");
  const tags = useMemo(() => buildTags(snap), [snap]);
  const avatarUrl = useMemo(() => {
    scrubBrandAvatarsFromStorage();
    /* 사람 얼굴 = 프로필 사진. 회사 로고(card)와 섞지 않음 */
    return readProfilePhotoAvatar();
  }, [avatarTick, snap.name]);
  const coverUrl = useMemo(() => {
    const ed = readLetteringBizcardEditable();
    return String(ed.kakaoFeedBgDataUrl || snap.shareCoverUrl || "").trim();
  }, [coverTick, snap.shareCoverUrl]);
  const displayName = name || "명함 미설정";
  const hasProfile = Boolean(name || org || roleLine || tags.length);
  const [viewUrl, setViewUrl] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const { bindStyleConfig, setPlaybackPhase } = useShowcaseBgm();

  const styledCard = useMemo(
    () =>
      applyShowcaseStyleToCard(
        { ...snap, membershipTier: membershipTier || snap.membershipTier || "free" },
        membershipTier || snap.membershipTier || "free"
      ),
    [snap, membershipTier]
  );

  useEffect(() => {
    const bump = () => setAvatarTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", bump);
    return () => window.removeEventListener("vlue-avatar-changed", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fixed = readLetteringFixedIdentity();
      const phone = String(fixed.phone || snap.phone || "").trim();
      if (cancelled) return;
      if (phone) {
        setViewUrl(buildPublicShowcaseUrl(phone));
      } else {
        setViewUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snap.name, snap.organization, snap.phone, snap.title, snap.department, coverUrl]);

  useEffect(() => {
    if (!liveOpen) return undefined;
    return pushAndroidBackHandler(() => {
      setLiveOpen(false);
      return true;
    });
  }, [liveOpen]);

  useEffect(() => {
    bindStyleConfig(styledCard?.showcaseStyle);
    setPlaybackPhase(liveOpen ? "preview" : "idle");
    return () => setPlaybackPhase("idle");
  }, [liveOpen, styledCard?.showcaseStyle, bindStyleConfig, setPlaybackPhase]);

  const openFullShowcase = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiveOpen(true);
  };

  const openPublicPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewUrl) {
      onToast?.("본인인증 전화번호가 없어 공개 페이지를 열 수 없습니다.");
      return;
    }
    const ok = openExternalSafely(viewUrl);
    if (!ok) onToast?.("외부 브라우저에서 명함 페이지를 열 수 없습니다.");
  };

  const onPickCover = async (file) => {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      onToast?.("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    try {
      const dataUrl = await compressCoverFile(file);
      writeLetteringBizcardEditable({ kakaoFeedBgDataUrl: dataUrl });
      setCoverTick((n) => n + 1);
      const sync = await syncDigitalCardExportSnapshot({ ...snap, shareCoverUrl: dataUrl });
      if (sync?.ok === false) {
        onToast?.(sync.error || "배경은 기기에 저장됐지만 서버 동기화에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      if (sync?.shareCoverUrl) {
        writeLetteringBizcardEditable({ kakaoFeedBgDataUrl: sync.shareCoverUrl });
        setCoverTick((n) => n + 1);
      }
      onToast?.("카드 배경 썸네일을 적용했습니다. 카카오 공유 시 반영됩니다.");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "배경 설정에 실패했습니다.");
    }
  };

  const clearCover = async () => {
    writeLetteringBizcardEditable({ kakaoFeedBgDataUrl: "" });
    setCoverTick((n) => n + 1);
    await syncDigitalCardExportSnapshot({ ...snap, shareCoverUrl: "" });
    onToast?.("배경 썸네일을 제거했습니다.");
  };

  const headerStyle = coverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(11,26,51,0.35), rgba(11,26,51,0.55)), url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : undefined;

  const notificationProps = {
    verified: true,
    card: styledCard,
    platform: "android",
    callPhase: "connected",
    isRecording: true,
    callDurationSec: VLUE_SHOWCASE_DEMO_RECORDING_SEC,
    recordingDurationSec: VLUE_SHOWCASE_DEMO_RECORDING_SEC,
    incomingNumber: styledCard?.phone || snap.phone || "",
    expanded: true,
    onExpandedChange: (next) => {
      if (!next) setLiveOpen(false);
    },
    hideUnverifiedFooter: true,
    previewMode: true,
    includeDigitalCard: true,
    onEndCall: () => setLiveOpen(false),
    onToast
  };

  return (
    <div
      className={`vlue-kakao-feed-preview mt-2 overflow-hidden rounded-2xl ${className}`}
      data-theme={isDarkMode ? "dark" : "light"}
      aria-label="카카오 명함 카드 미리보기"
    >
      <div className="vlue-kakao-feed-preview__header" style={headerStyle}>
        <div className="vlue-kakao-feed-preview__row">
          <div className="vlue-kakao-feed-preview__avatar">
            <UserProfileAvatar src={avatarUrl} blankClassName="bg-[#c5cdd6] text-[#8b95a1]" />
          </div>
          <div className="vlue-kakao-feed-preview__meta">
            <p className="vlue-kakao-feed-preview__name">{displayName}</p>
            {roleLine ? <p className="vlue-kakao-feed-preview__role">{roleLine}</p> : null}
            {org ? <p className="vlue-kakao-feed-preview__org">{org}</p> : null}
            {!hasProfile ? (
              <p className="vlue-kakao-feed-preview__role">명함 수정에서 회사·직책 정보를 입력하세요.</p>
            ) : null}
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="vlue-kakao-feed-preview__tags">
            {tags.map((tag) => (
              <span key={tag} className="vlue-kakao-feed-preview__tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="vlue-kakao-feed-preview__body">
        <p className="vlue-kakao-feed-preview__cta-line">
          <span className="vlue-kakao-feed-preview__cta-name">{displayName}</span>
          <span className="vlue-kakao-feed-preview__cta-rest">님의 쇼케이스를 확인하세요.</span>
        </p>
        <button type="button" className="vlue-kakao-feed-preview__cta-btn" onClick={openFullShowcase}>
          쇼케이스 보기
        </button>
        <button type="button" className="vlue-kakao-feed-preview__footer" onClick={openFullShowcase}>
          <div className="vlue-kakao-feed-preview__brand">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span>VLUE</span>
          </div>
          <span className="vlue-kakao-feed-preview__chev" aria-hidden>
            ›
          </span>
        </button>
      </div>

      <div className="vlue-kakao-feed-preview__cover-tools">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onPickCover(f);
          }}
        />
        <button
          type="button"
          className="vlue-kakao-feed-preview__cover-btn"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={14} aria-hidden />
          배경 썸네일 설정
        </button>
        {coverUrl ? (
          <button type="button" className="vlue-kakao-feed-preview__cover-btn is-muted" onClick={() => void clearCover()}>
            <Trash2 size={14} aria-hidden />
            배경 제거
          </button>
        ) : null}
      </div>

      {liveOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="lettering-showcase-fs"
              role="dialog"
              aria-modal="true"
              aria-label="디지털인증명함 쇼케이스"
              style={{ zIndex: 10000200 }}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-950 px-3 py-2">
                <p className="text-[13px] font-black text-white">디지털인증명함</p>
                <div className="flex items-center gap-2">
                  {viewUrl ? (
                    <button type="button" className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-300" onClick={openPublicPage}>
                      공개 페이지
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-bold text-white"
                    onClick={() => setLiveOpen(false)}
                  >
                    닫기
                  </button>
                </div>
              </div>
              <div className="lettering-showcase-fs__shell" style={{ height: "auto", flex: "1 1 auto" }}>
                <LetteringIncomingNotification
                  {...notificationProps}
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
