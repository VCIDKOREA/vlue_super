import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderOpen,
  Instagram,
  MessageCircle,
  Pencil,
  ShieldCheck,
  X
} from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { readActiveShowcaseStyle, createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
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
  nativeEndCallKeepOverlay,
  nativeRejectCall,
  nativeRevealSystemCallUi,
  nativeSetOverlayFullscreen
} from "../../lib/call/nativeCallControl.js";
import { openExternalHref, formatWebHref } from "../../lib/showcase/showcaseContactActions.js";
import { resolveShowcasePeerAvatar } from "../../lib/showcase/resolveShowcasePeerAvatar.js";
import VLUE_BRAND_LOGO from "../../assets/vlue-shield-logo.svg?url";
import TentCallActionBar from "./TentCallActionBar.jsx";
import InCallControlBar from "../call/InCallControlBar.jsx";
import InCallKakaoShareSlot from "../call/InCallKakaoShareSlot.jsx";
import InCallDtmfPad from "../call/InCallDtmfPad.jsx";
import CompanionSamsungCallCta from "../call/CompanionSamsungCallCta.jsx";
import { COMPANION_MVP_DELEGATE_CALL_UI } from "../../lib/call/companionMvpFlags.js";
import {
  resolveCallPeerMatrixSync,
  resolveInCallKakaoSlot
} from "../../lib/call/callPeerMatrix.js";
import { shareShowcaseInviteViaKakao } from "../../lib/call/shareShowcaseInviteKakao.js";
import TentFloatingMemo from "./TentFloatingMemo.jsx";
import ShowcaseDialConfirmModal from "./ShowcaseDialConfirmModal.jsx";
import FollowActionButton from "../follow/FollowActionButton.jsx";
import {
  resolveFollowTargetUserId,
  shouldShowShowcaseFollow
} from "../../lib/showcase/resolveShowcaseOwnerUserId.js";
import "../follow/follow-action.css";
import "../../styles/tent-showcase.css";
import "../../styles/incall-controls.css";

function openExternal(url) {
  return openExternalHref(formatWebHref(url) || url);
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
  const legacyKakao = String(outlinks.kakao || "").trim();
  const kakaoOpenChat = String(
    outlinks.kakaoOpenChat || (/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : "") || ""
  ).trim();
  const kakaoProfile = String(
    outlinks.kakaoProfile ||
      feed.kakaoProfileUrl ||
      card?.kakaoUrl ||
      card?.kakaoProfileUrl ||
      (!/open\.kakao\.com/i.test(legacyKakao) ? legacyKakao : "") ||
      ""
  ).trim();
  const kakao = kakaoOpenChat || kakaoProfile;
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
    kakaoOpenChat,
    kakaoProfile,
    instagram: String(instagram || "").trim(),
    website: String(website || "").trim(),
    facebook: String(outlinks.facebook || "").trim(),
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
  onClose,
  className = ""
}) {
  const [callStateInternal, setCallStateInternal] = useState(() => normalizeCallState(callStateProp));
  const callState = callStateProp != null ? normalizeCallState(callStateProp) : callStateInternal;
  const [linkToast, setLinkToast] = useState("");
  const [dialOpen, setDialOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

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
      const text = String(msg || "").trim();
      if (!text) return;
      /* App onToast 가 있으면 그쪽만 — 로컬 linkToast와 이중 표시 방지 */
      if (typeof onToast === "function") {
        onToast(text);
        return;
      }
      setLinkToast(text);
      window.setTimeout(() => setLinkToast(""), 2200);
    },
    [onToast]
  );

  const tier = normalizeUserTier(membershipTier || card?.membershipTier);
  const isPaid = tier === USER_TIERS.PAID;
  /* 미리보기·피어는 내 로컬 라이브 스타일로 폴백하지 않음 (계정 잔여 오염 방지) */
  const style =
    showcaseStyle ||
    card?.showcaseStyle ||
    (previewMode ? createDefaultShowcaseStyle() : readActiveShowcaseStyle());
  const privacyMode = privacyModeProp || readShowcasePrivacyMode(tier);

  const [known, setKnown] = useState(() => resolveIsKnownContactSync(peerPhone));
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveIsKnownContact(peerPhone).then((r) => {
      if (!cancelled) setKnown(r);
    });
    return () => {
      cancelled = true;
    };
  }, [peerPhone]);

  const peerMatrix = useMemo(
    () =>
      resolveCallPeerMatrixSync({
        phone: peerPhone || card?.phone,
        isVlueMember: Boolean(verified),
        knownContact: known
      }),
    [peerPhone, card?.phone, verified, known]
  );
  const kakaoSlot = resolveInCallKakaoSlot(peerMatrix);

  const exposeCustom =
    previewMode ||
    shouldExposeCustomShowcase({
      tier,
      privacyMode,
      isKnownContact: known.isKnownContact
    });

  const linksEnabled = areShowcaseLinksEnabled(callState, { previewMode, forceInteractive });
  const isConnected = callState === CALL_STATES.CONNECTED;
  const isRinging = callState === CALL_STATES.RINGING;
  const isFillEmbed = /\btent-showcase--fill\b/.test(String(className || ""));
  /** 실통화만 fixed 전체화면 — 앱 내 다시보기(fill)는 부모 안에 유지해 닫기 버튼이 가려지지 않음 */
  const useFixedFullscreen = !previewMode && !isFillEmbed && (isConnected || isRinging);
  const tentExpanded = useFixedFullscreen || isFillEmbed || (previewMode && (isConnected || forceInteractive));

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
  const followTargetUserId = resolveFollowTargetUserId(card, { fallbackToMe: false });
  const showFollow = shouldShowShowcaseFollow(followTargetUserId);
  const hideBroadcastName = Boolean(
    card?.hideBroadcastName ||
      card?.showcaseStyle?.showBroadcastName === false ||
      style?.showBroadcastName === false
  );
  const titleName = exposeCustom
    ? hideBroadcastName
      ? known.matchedName || phoneLabel
      : displayName || card?.name || card?.displayName || known.matchedName || phoneLabel
    : phoneLabel;
  const orgLine =
    exposeCustom && isPaid && !hideBroadcastName ? organization || card?.organization || "" : "";

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
    nativeEndCallKeepOverlay();
    setCallState(CALL_STATES.ENDED);
    onEnd?.();
  };

  const handleKakaoShare = async () => {
    if (!kakaoSlot.visible || kakaoBusy) return;
    setKakaoBusy(true);
    try {
      await shareShowcaseInviteViaKakao({
        inviteeName: peerMatrix.contactName || displayName || card?.name,
        phone: peerPhone || card?.phone,
        onToast: showLinkToast
      });
    } finally {
      setKakaoBusy(false);
    }
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

  const peerAvatar = useMemo(
    () =>
      resolveShowcasePeerAvatar({
        style,
        card,
        displayName: titleName,
        exposeCustom,
        brandLogoUrl: VLUE_BRAND_LOGO
      }),
    [style, card, titleName, exposeCustom]
  );

  useEffect(() => {
    setAvatarBroken(false);
  }, [peerAvatar.url, peerAvatar.type]);

  const showAvatarImage =
    (peerAvatar.type === "image" || peerAvatar.type === "brand") &&
    Boolean(peerAvatar.url) &&
    !avatarBroken;
  const avatarInitial =
    peerAvatar.type === "initial"
      ? peerAvatar.initial
      : String(titleName || "?").trim().slice(0, 1) || "?";

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
        useFixedFullscreen ? "tent-showcase--fullscreen" : "",
        tentExpanded || isFillEmbed ? "tent-showcase--expanded-embed" : "tent-showcase--compact",
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
          {onClose ? (
            <button
              type="button"
              className="tent-vlue__close"
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={18} strokeWidth={2.4} aria-hidden />
            </button>
          ) : null}
        </header>

        <div className="tent-vlue__spacer" aria-hidden={!keypadOpen}>
          {keypadOpen ? (
            <InCallDtmfPad
              className="tent-vlue__keypad"
              onClose={() => setKeypadOpen(false)}
              onToast={showLinkToast}
            />
          ) : null}
        </div>

        {!keypadOpen ? (
        <div className="tent-vlue__bottom">
          <div className="tent-vlue__identity">
            <div
              className={`tent-vlue__mark-wrap${showAvatarImage ? "" : " tent-vlue__mark-wrap--initial"}`}
            >
              {showAvatarImage ? (
                <img
                  src={peerAvatar.url}
                  alt=""
                  className={`tent-vlue__mark${peerAvatar.type === "brand" ? " tent-vlue__mark--brand" : ""}`}
                  draggable={false}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="tent-vlue__mark-initial" aria-hidden>
                  {avatarInitial}
                </span>
              )}
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
              {phoneLabel ? (
                <button
                  type="button"
                  className="tent-vlue__phone tent-vlue__phone--link"
                  onClick={() => {
                    if (!linksEnabled) {
                      showLinkToast("통화 연결 후 전화를 걸 수 있습니다.");
                      return;
                    }
                    setDialOpen(true);
                  }}
                >
                  {phoneLabel}
                </button>
              ) : null}
            </div>
            {showFollow ? (
              <FollowActionButton
                targetUserId={followTargetUserId}
                className="follow-action-btn--tent"
                onToast={showLinkToast}
              />
            ) : null}
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
        ) : null}
      </div>

      {linkToast ? <p className="tent-showcase__toast">{linkToast}</p> : null}

      {!previewMode && isConnected && kakaoSlot.visible ? (
        <InCallKakaoShareSlot
          visible
          description={kakaoSlot.description}
          label={kakaoSlot.label}
          busy={kakaoBusy}
          onShare={handleKakaoShare}
        />
      ) : null}

      {!previewMode ? (
        isConnected || callState === CALL_STATES.ENDED ? (
          COMPANION_MVP_DELEGATE_CALL_UI ? (
            <CompanionSamsungCallCta
              onOpen={() => {
                try {
                  nativeSetOverlayFullscreen(false);
                  nativeRevealSystemCallUi();
                } catch {
                  /* ignore */
                }
                onToast?.("삼성 전화앱에서 키패드·음소거·스피커·종료를 사용하세요.");
              }}
            />
          ) : (
            <InCallControlBar
              platform="android"
              onEnd={handleEnd}
              showEndButton
              endLabel="통화종료"
              keypadOpen={keypadOpen}
              onKeypadOpenChange={setKeypadOpen}
            />
          )
        ) : (
          <TentCallActionBar
            callState={callState}
            onAnswer={handleAnswer}
            onReject={handleReject}
            onEnd={handleEnd}
          />
        )
      ) : null}

      <TentFloatingMemo
        visible={isConnected || (previewMode && forceInteractive)}
        peerPhone={peerPhone}
        callId={peerPhone || "preview"}
      />

      <ShowcaseDialConfirmModal
        open={dialOpen}
        phone={peerPhone || card?.phone || ""}
        displayName={titleName}
        onClose={() => setDialOpen(false)}
      />
    </div>
  );
}
