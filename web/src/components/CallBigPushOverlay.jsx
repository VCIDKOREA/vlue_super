import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Instagram,
  ShieldCheck,
  Phone,
  BadgeCheck
} from "lucide-react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import "../styles/call-big-push.css";

/**
 * V1 통화 수·발신 빅푸시 — 상단 기본 정보 + 드롭다운 시 인스타 피드 / 커스텀 프로필 / 인증명함
 *
 * @param {object} props
 * @param {'incoming'|'outgoing'|'active'} [props.callPhase]
 * @param {string} [props.phoneNumber]
 * @param {string} [props.displayName]
 * @param {boolean} [props.verified]
 * @param {string} [props.membershipTier]
 * @param {object|null} [props.bizcard] 유료 디지털 명함
 * @param {{ mode: 'instagram'|'custom', imageUrl?: string, caption?: string, creatorLink?: string, instagramHandle?: string }} [props.feed]
 * @param {boolean} [props.interactive]
 * @param {boolean} [props.expanded]
 * @param {(v: boolean) => void} [props.onExpandedChange]
 */
export default function CallBigPushOverlay({
  callPhase = "incoming",
  phoneNumber = "010-1234-5678",
  displayName = "",
  verified = true,
  membershipTier = "free",
  bizcard = null,
  feed = null,
  interactive = true,
  expanded: expandedProp,
  onExpandedChange,
  className = ""
}) {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const panelId = useId();
  const dragStartY = useRef(0);

  const phoneLabel = useMemo(
    () => formatLetteringPhoneDisplay(phoneNumber) || phoneNumber,
    [phoneNumber]
  );

  const isPaid = isPaidLetteringTier(membershipTier);
  const showBizcard = isPaid && bizcard;

  const feedContent = useMemo(() => {
    if (feed?.mode === "instagram") {
      return {
        mode: "instagram",
        imageUrl: feed.imageUrl || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
        caption: feed.caption || "오늘도 안전한 하루 ✨ VLUE와 함께해요",
        link: feed.creatorLink || "https://instagram.com",
        handle: feed.instagramHandle || "@vlue.official"
      };
    }
    return {
      mode: "custom",
      imageUrl: feed?.imageUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
      caption: feed?.caption || "반가워요! 통화 전에 제 프로필을 확인해 주세요 💙",
      link: feed?.creatorLink || "",
      handle: ""
    };
  }, [feed]);

  const statusLabel =
    callPhase === "active"
      ? "통화 중"
      : callPhase === "outgoing"
        ? "발신 중…"
        : "수신 중…";

  const toggleExpanded = useCallback(() => {
    if (!interactive) return;
    setExpanded(!expanded);
  }, [expanded, interactive, setExpanded]);

  const onHandlePointerDown = (e) => {
    if (!interactive) return;
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandlePointerUp = (e) => {
    if (!interactive) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 28) setExpanded(true);
    if (delta < -28) setExpanded(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`vlue-call-big-push ${expanded ? "vlue-call-big-push--expanded" : ""} ${className}`.trim()}
      data-phase={callPhase}
      data-verified={verified ? "true" : "false"}
    >
      {/* ── 상단 기본 바 (표준 통화 UX) ── */}
      <button
        type="button"
        className="vlue-call-big-push__bar"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={!interactive}
      >
        <div className="vlue-call-big-push__bar-left">
          <span className="vlue-call-big-push__avatar" aria-hidden>
            {displayName ? displayName.slice(0, 1) : <Phone className="h-4 w-4" />}
          </span>
          <div className="vlue-call-big-push__bar-text">
            <div className="vlue-call-big-push__bar-row">
              <span className="vlue-call-big-push__phone">{phoneLabel}</span>
              {verified ? (
                <span className="vlue-call-big-push__badge" title="VLUE 인증">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  <span>인증</span>
                </span>
              ) : (
                <span className="vlue-call-big-push__badge vlue-call-big-push__badge--warn">미확인</span>
              )}
            </div>
            <p className="vlue-call-big-push__meta">
              {displayName || "알 수 없는 번호"} · {statusLabel}
            </p>
          </div>
        </div>
        <span className="vlue-call-big-push__chevron" aria-hidden>
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      <div
        className="vlue-call-big-push__handle"
        role="separator"
        aria-label="프로필 펼치기"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
      >
        <span className="vlue-call-big-push__handle-pill" />
      </div>

      {/* ── 드롭다운 확장 패널 ── */}
      <div id={panelId} className="vlue-call-big-push__panel" hidden={!expanded}>
        <div className="vlue-call-big-push__panel-inner">
          {/* 인스타 감성 피드 (단일 게시물) */}
          <section className="vlue-call-big-push__feed" aria-label="감성 프로필">
            <header className="vlue-call-big-push__feed-head">
              {feedContent.mode === "instagram" ? (
                <Instagram className="h-4 w-4 text-[#E1306C]" aria-hidden />
              ) : (
                <span className="vlue-call-big-push__feed-dot" aria-hidden />
              )}
              <span className="vlue-call-big-push__feed-user">
                {feedContent.handle || displayName || "나의 프로필"}
              </span>
              {feedContent.mode === "instagram" ? (
                <span className="vlue-call-big-push__feed-tag">Instagram</span>
              ) : null}
            </header>
            <div className="vlue-call-big-push__feed-image-wrap">
              <img
                src={feedContent.imageUrl}
                alt=""
                className="vlue-call-big-push__feed-image"
                draggable={false}
              />
            </div>
            <p className="vlue-call-big-push__feed-caption">{feedContent.caption}</p>
            {feedContent.link ? (
              <a
                href={feedContent.link}
                className="vlue-call-big-push__feed-link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                크리에이터 링크
              </a>
            ) : null}
          </section>

          {/* 유료 — 디지털 인증명함 (드롭다운 하단) */}
          {showBizcard ? (
            <section className="vlue-call-big-push__bizcard" aria-label="VLUE 인증 명함">
              <div className="vlue-call-big-push__bizcard-label">
                <BadgeCheck className="h-4 w-4 text-blue-600" aria-hidden />
                <span>디지털 인증명함</span>
              </div>
              <LetteringDigitalReception card={bizcard} embeddedInPush previewMode />
            </section>
          ) : (
            <p className="vlue-call-big-push__upsell">
              유료 플랜에서 미니멀 인증명함이 통화 화면에 함께 노출됩니다.
            </p>
          )}

          <p className="vlue-call-big-push__safety">
            VLUE가 통화 상대를 백그라운드에서 검증 중입니다. 의심되면 통화를 끊고 번호를 검색해 보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
