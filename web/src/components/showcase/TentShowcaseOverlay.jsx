import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderOpen,
  Instagram,
  MessageCircle,
  Pencil,
  ShieldCheck
} from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { readShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import { readShowcasePrivacyMode } from "../../lib/showcase/showcasePrivacyMode.js";
import {
  areShowcaseLinksEnabled,
  CALL_STATES,
  maxShowcasePhotosForTier,
  normalizeCallState,
  normalizeUserTier,
  shouldExposeCustomShowcase,
  USER_TIERS
} from "../../lib/showcase/tentShowcaseTypes.js";
import {
  resolveIsKnownContact,
  resolveIsKnownContactSync
} from "../../lib/contacts/hybridKnownContact.js";
import {
  nativeAnswerCall,
  nativeEndCall,
  nativeRejectCall,
  nativeSetOverlayFullscreen
} from "../../lib/call/nativeCallControl.js";
import VLUE_BRAND_LOGO from "../../assets/vlue-shield-logo.svg?url";
import TentCallActionBar from "./TentCallActionBar.jsx";
import TentFloatingMemo from "./TentFloatingMemo.jsx";
import "../../styles/tent-showcase.css";

function openExternal(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  const href = /^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("tel:") ? u : `https://${u}`;
  try {
    window.open(href, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    try {
      window.location.href = href;
      return true;
    } catch {
      return false;
    }
  }
}

function instagramUrlFromHandle(handle) {
  const h = String(handle || "").trim().replace(/^@/, "");
  if (!h) return "";
  if (/^https?:\/\//i.test(h)) return h;
  return `https://instagram.com/${encodeURIComponent(h)}`;
}

function resolveSocialLinks(style, card) {
  const outlinks = style?.commercial?.outlinks || {};
  const feed = style?.platformFeed || {};
  const kakao =
    outlinks.kakao ||
    feed.kakaoProfileUrl ||
    card?.kakaoUrl ||
    card?.kakaoProfileUrl ||
    "";
  const instagram =
    outlinks.instagram ||
    feed.instagramProfileUrl ||
    instagramUrlFromHandle(feed.instagramHandle) ||
    card?.instagramUrl ||
    card?.website ||
    "";
  const website = card?.website || outlinks.website || outlinks.youtube || "";
  return {
    kakao: String(kakao || "").trim(),
    instagram: String(instagram || "").trim(),
    website: String(website || "").trim(),
    attachments: style?.commercial?.attachments || []
  };
}

/**
 * V1 상용 — 전체화면 천막 쇼케이스 오버레이
 *
 * ringing: 글래스 빅푸시 + 배너(링크 잠금) + 통화/거절
 * connected: 100vw×100vh 천막 전개 + 링크 활성 + 유선상 메모 + 통화 종료
 */
export default function TentShowcaseOverlay({
  callState: callStateProp = CALL_STATES.RINGING,
  onCallStateChange,
  verified = true,
  membershipTier = "free",
  peerPhone = "",
  displayName = "",
  organization = "",
  card = null,
  showcaseStyle = null,
  privacyMode: privacyModeProp,
  previewMode = false,
  forceInteractive = false,
  onAnswer,
  onReject,
  onEnd,
  onOpenVault,
  onToast,
  className = ""
}) {
  const [callStateInternal, setCallStateInternal] = useState(() => normalizeCallState(callStateProp));
  const callState = callStateProp != null ? normalizeCallState(callStateProp) : callStateInternal;
  const [linkToast, setLinkToast] = useState("");

  const setCallState = useCallback(
    (next) => {
      const n = normalizeCallState(next);
      if (callStateProp == null) setCallStateInternal(n);
      onCallStateChange?.(n);
    },
    [callStateProp, onCallStateChange]
  );

  const showLinkToast = useCallback(
    (msg) => {
      onToast?.(msg);
      setLinkToast(msg);
      window.setTimeout(() => setLinkToast(""), 2200);
    },
    [onToast]
  );

  const tier = normalizeUserTier(membershipTier || card?.membershipTier);
  const isPaid = tier === USER_TIERS.PAID;
  const style = showcaseStyle || readShowcaseStyle();
  const privacyMode = privacyModeProp || readShowcasePrivacyMode(tier);

  const [known, setKnown] = useState(() => resolveIsKnownContactSync(peerPhone));

  useEffect(() => {
    let cancelled = false;
    resolveIsKnownContact(peerPhone).then((r) => {
      if (!cancelled) setKnown(r);
    });
    return () => {
      cancelled = true;
    };
  }, [peerPhone]);

  const exposeCustom = shouldExposeCustomShowcase({
    tier,
    privacyMode,
    isKnownContact: known.isKnownContact
  });

  const linksEnabled = areShowcaseLinksEnabled(callState, { previewMode, forceInteractive });
  const isConnected = callState === CALL_STATES.CONNECTED;
  const isRinging = callState === CALL_STATES.RINGING;
  /** 실통화 오버레이는 링잉부터 전체화면 글래스 — 연결 시 링크만 해제 */
  const tentExpanded = !previewMode || isConnected || forceInteractive;

  useEffect(() => {
    if (previewMode) return undefined;
    /* 링잉부터 네이티브 오버레이 MATCH_PARENT */
    nativeSetOverlayFullscreen(true);
    return undefined;
  }, [previewMode]);

  /** 네이티브 OFFHOOK → 연결 상태 동기화 */
  useEffect(() => {
    if (previewMode) return undefined;
    const onNative = (ev) => {
      const state = ev?.detail?.callState || ev?.detail?.state;
      if (state) setCallState(state);
    };
    window.addEventListener("vlue-native-call-state", onNative);
    window.VlueLettering = window.VlueLettering || {};
    const prev = window.VlueLettering.onNativeCallState;
    window.VlueLettering.onNativeCallState = (state) => {
      setCallState(state);
      if (typeof prev === "function") prev(state);
    };
    return () => {
      window.removeEventListener("vlue-native-call-state", onNative);
      if (window.VlueLettering?.onNativeCallState === setCallState) {
        /* keep bridge */
      }
    };
  }, [previewMode, setCallState]);

  const phoneLabel = formatLetteringPhoneDisplay(peerPhone || card?.phone || "");
  const titleName = exposeCustom
    ? displayName || card?.name || card?.displayName || known.matchedName || phoneLabel
    : phoneLabel;
  const orgLine = exposeCustom && isPaid ? organization || card?.organization || "" : "";

  const photos = useMemo(() => {
    if (!exposeCustom) return [];
    const max = maxShowcasePhotosForTier(tier);
    const list = style?.gallery?.photos || [];
    return list.slice(0, max);
  }, [exposeCustom, style, tier]);

  const heroFallback = useMemo(() => {
    if (!exposeCustom) return "";
    return (
      card?.photoUrl ||
      card?.image_url ||
      card?.logoUrl ||
      style?.platformFeed?.coverUrl ||
      ""
    );
  }, [exposeCustom, card, style]);

  const overlayCaption = useMemo(() => {
    const body = String(style?.richCustom?.bodyText || "").trim();
    if (body) return body;
    return String(card?.companyIntro || "").trim().slice(0, 80);
  }, [style, card]);

  const social = useMemo(() => resolveSocialLinks(style, card), [style, card]);

  const openSocial = useCallback(
    (url, label) => {
      if (!linksEnabled) {
        showLinkToast("통화 연결 후 링크를 열 수 있습니다.");
        return;
      }
      if (!url) {
        showLinkToast(`${label} 링크가 아직 등록되지 않았습니다.`);
        return;
      }
      if (!openExternal(url)) {
        showLinkToast("링크를 열 수 없습니다.");
      }
    },
    [linksEnabled, showLinkToast]
  );

  const handleAnswer = () => {
    nativeAnswerCall();
    setCallState(CALL_STATES.CONNECTED);
    onAnswer?.();
  };

  const handleReject = () => {
    nativeRejectCall();
    setCallState(CALL_STATES.MISSED);
    onReject?.();
  };

  const handleEnd = () => {
    nativeEndCall();
    setCallState(CALL_STATES.ENDED);
    onEnd?.();
  };

  const statusCopy = previewMode
    ? "SHOWCASE"
    : isConnected
      ? "ON CALL"
      : "INCOMING";

  const statusLabelKo = previewMode
    ? "쇼케이스 미리보기"
    : isConnected
      ? "통화 중"
      : "수신 중";

  const bodyCopy =
    overlayCaption ||
    (exposeCustom
      ? "더 나은 내일을 디자인합니다.\nVLUE에서 만나요."
      : "VLUE 인증 회원입니다.\n안심하고 통화하세요.");

  const avatarUrl = exposeCustom
    ? photos[0]?.url || heroFallback || card?.photoUrl || VLUE_BRAND_LOGO
    : VLUE_BRAND_LOGO;

  const dockLeft = !isPaid
    ? {
        icon: MessageCircle,
        label: "카카오톡",
        empty: !social.kakao,
        onClick: () => openSocial(social.kakao, "카카오톡")
      }
    : social.website
      ? {
          icon: ExternalLink,
          label: "웹사이트",
          empty: false,
          onClick: () => openSocial(social.website, "웹사이트")
        }
      : {
          icon: Instagram,
          label: "인스타그램",
          empty: !social.instagram,
          onClick: () => openSocial(social.instagram, "인스타그램")
        };

  const dockRight = !isPaid
    ? {
        icon: Instagram,
        label: "인스타그램",
        empty: !social.instagram,
        onClick: () => openSocial(social.instagram, "인스타그램")
      }
    : {
        icon: FolderOpen,
        label: "자료실",
        empty: false,
        onClick: () => {
          if (!linksEnabled) {
            showLinkToast("통화 연결 후 자료실을 열 수 있습니다.");
            return;
          }
          onOpenVault?.();
        }
      };

  const DockLeftIcon = dockLeft.icon;
  const DockRightIcon = dockRight.icon;

  return (
    <div
      className={[
        "tent-showcase",
        "tent-showcase--vlue",
        tentExpanded ? "tent-showcase--fullscreen" : "tent-showcase--compact",
        isConnected ? "tent-showcase--connected" : "",
        isRinging ? "tent-showcase--ringing" : "",
        !linksEnabled ? "tent-showcase--links-locked" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      data-call-state={callState}
      data-tier={tier}
      data-privacy={privacyMode}
      data-known={known.isKnownContact ? "1" : "0"}
    >
      <div className="tent-vlue" aria-label={statusLabelKo}>
        <div className="tent-vlue__bg" aria-hidden>
          {exposeCustom && (photos[0]?.url || heroFallback) ? (
            <img src={photos[0]?.url || heroFallback} alt="" className="tent-vlue__bg-img" />
          ) : null}
          <div className="tent-vlue__grid" />
          <div className="tent-vlue__wash" />
        </div>

        <header className="tent-vlue__top">
          <span className="tent-vlue__status">
            <span className="tent-vlue__status-dot" aria-hidden />
            {statusCopy}
          </span>
        </header>

        <div className="tent-vlue__spacer" aria-hidden />

        <div className="tent-vlue__bottom">
          <div className="tent-vlue__identity">
            <div className="tent-vlue__mark-wrap">
              <img src={avatarUrl} alt="" className="tent-vlue__mark" draggable={false} />
            </div>
            <div className="tent-vlue__identity-copy">
              <h1 className="tent-vlue__title">
                <span>{titleName}</span>
                {verified ? (
                  <ShieldCheck
                    size={22}
                    className="tent-vlue__name-badge"
                    aria-label="VLUE 인증"
                  />
                ) : null}
              </h1>
              {orgLine ? <p className="tent-vlue__org">{orgLine}</p> : null}
              <p className="tent-vlue__phone">{phoneLabel}</p>
            </div>
          </div>

          {bodyCopy ? <p className="tent-vlue__body">{bodyCopy}</p> : null}

          {!exposeCustom && verified ? (
            <p className="tent-vlue__safe">기본 안심 쇼케이스 · 개인 SNS·사진은 숨겨집니다</p>
          ) : null}

          {exposeCustom ? (
            <nav
              className={`tent-vlue__dock${linksEnabled ? "" : " is-locked"}`}
              aria-label="쇼케이스 바로가기"
            >
              <button
                type="button"
                className={`tent-vlue__dock-btn${dockLeft.empty ? " is-empty" : ""}`}
                disabled={!linksEnabled}
                onClick={dockLeft.onClick}
              >
                <DockLeftIcon size={18} aria-hidden />
                <span>{dockLeft.label}</span>
              </button>
              <span className="tent-vlue__dock-sep" aria-hidden />
              <button
                type="button"
                className={`tent-vlue__dock-btn${dockRight.empty ? " is-empty" : ""}`}
                disabled={!linksEnabled}
                onClick={dockRight.onClick}
              >
                <DockRightIcon size={18} aria-hidden />
                <span>{dockRight.label}</span>
              </button>
            </nav>
          ) : (
            <nav className="tent-vlue__dock tent-vlue__dock--safe" aria-label="안심 쇼케이스">
              <div className="tent-vlue__dock-btn tent-vlue__dock-btn--static">
                <ShieldCheck size={18} aria-hidden />
                <span>VLUE 인증</span>
              </div>
              <span className="tent-vlue__dock-sep" aria-hidden />
              <div className="tent-vlue__dock-btn tent-vlue__dock-btn--static">
                <Pencil size={18} aria-hidden />
                <span>{phoneLabel}</span>
              </div>
            </nav>
          )}
        </div>
      </div>

      {linkToast ? <p className="tent-showcase__toast">{linkToast}</p> : null}

      {!previewMode ? (
        <TentCallActionBar
          callState={callState}
          onAnswer={handleAnswer}
          onReject={handleReject}
          onEnd={handleEnd}
        />
      ) : null}

      <TentFloatingMemo
        visible={isConnected || (previewMode && forceInteractive)}
        peerPhone={peerPhone}
        callId={peerPhone || "preview"}
      />
    </div>
  );
}
