import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { readProfileOrLogoAvatar, scrubBrandAvatarsFromStorage } from "../lib/vlueAvatar.js";
import { withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import { scrubLetteringDemoPollution } from "../lib/letteringDemoPollution.js";
import { ensureDigitalCardId } from "../lib/digitalCardApi.js";
import { buildKakaoBizcardPublicUrls } from "../lib/kakaoBizcardFeedShare.js";
import { buildPublicCardViewUrl } from "../lib/vlueViralLinks.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";
import UserProfileAvatar from "./UserProfileAvatar.jsx";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import { pushAndroidBackHandler } from "../lib/androidBackStack.js";

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
  /* WebView location.href 로 이동하면 /app 셸이 깨져 재실행처럼 보임 — 절대 사용하지 않음 */
  return false;
}

/**
 * 카카오톡 Feed에 전송되는 「명함 카드」 UI 미리보기
 */
export default function KakaoBizcardFeedPreview({
  card,
  className = "",
  isDarkMode = false,
  onToast
}) {
  const snap = useMemo(
    () => scrubLetteringDemoPollution(withLetteringBizcardPreviewFallback(card || {})),
    [card]
  );
  const name = String(snap.name || "").trim();
  const org = String(snap.organization || "").trim();
  const title = String(snap.title || "").trim();
  const dept = String(snap.department || "").trim();
  const roleLine = [dept, title].filter(Boolean).join(" | ");
  const tags = useMemo(() => buildTags(snap), [snap]);
  const [avatarTick, setAvatarTick] = useState(0);
  const avatarUrl = useMemo(() => {
    scrubBrandAvatarsFromStorage();
    return readProfileOrLogoAvatar();
  }, [avatarTick, snap.name]);
  const displayName = name || "명함 미설정";
  const hasProfile = Boolean(name || org || roleLine || tags.length);
  const [viewUrl, setViewUrl] = useState("");
  const [liveOpen, setLiveOpen] = useState(false);
  const [face, setFace] = useState("front");

  useEffect(() => {
    const bump = () => setAvatarTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", bump);
    return () => window.removeEventListener("vlue-avatar-changed", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = (await ensureDigitalCardId()) || "";
      if (cancelled) return;
      if (id) {
        const urls = buildKakaoBizcardPublicUrls(id, snap);
        setViewUrl(urls.viewUrl || buildPublicCardViewUrl(id));
      } else {
        setViewUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snap.name, snap.organization, snap.phone, snap.title, snap.department]);

  useEffect(() => {
    if (!liveOpen) return undefined;
    return pushAndroidBackHandler(() => {
      setLiveOpen(false);
      return true;
    });
  }, [liveOpen]);

  const openCardView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    /* 앱 내 라이브 명함 — WebView를 외부 HTML로 바꾸지 않음(재실행처럼 보이는 버그 방지) */
    setFace("front");
    setLiveOpen(true);
  };

  const openPublicPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!viewUrl) {
      onToast?.("명함을 저장한 뒤 공개 페이지를 열 수 있습니다.");
      return;
    }
    const ok = openExternalSafely(viewUrl);
    if (!ok) onToast?.("외부 브라우저에서 명함 페이지를 열 수 없습니다.");
  };

  return (
    <div
      className={`vlue-kakao-feed-preview mt-2 overflow-hidden rounded-2xl ${className}`}
      data-theme={isDarkMode ? "dark" : "light"}
      aria-label="카카오 명함 카드 미리보기"
    >
      <div className="vlue-kakao-feed-preview__header">
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
          <span className="vlue-kakao-feed-preview__cta-rest">님의 명함을 확인하세요.</span>
        </p>
        <button type="button" className="vlue-kakao-feed-preview__cta-btn" onClick={openCardView}>
          명함 확인
        </button>
        <button type="button" className="vlue-kakao-feed-preview__footer" onClick={openCardView}>
          <div className="vlue-kakao-feed-preview__brand">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span>VLUE</span>
          </div>
          <span className="vlue-kakao-feed-preview__chev" aria-hidden>
            ›
          </span>
        </button>
      </div>

      {liveOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[10000200] flex flex-col bg-black/70 p-3"
              role="dialog"
              aria-modal="true"
              aria-label="디지털 인증명함"
              onClick={() => setLiveOpen(false)}
            >
              <div
                className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
                onClick={(ev) => ev.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                  <p className="text-[13px] font-black text-white">디지털 인증명함</p>
                  <div className="flex items-center gap-2">
                    {viewUrl ? (
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-300"
                        onClick={openPublicPage}
                      >
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
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <LetteringDigitalReception
                    card={snap}
                    verified
                    embeddedInPush
                    previewMode
                    face={face}
                    onFaceChange={setFace}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
