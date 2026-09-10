import { Share2, ShieldCheck } from "lucide-react";
import { VLUE_VERIFIED_PUSH_CONFIRM } from "../lib/vlueDigitalCardUi.js";
import { resolveAuthValidityPeriod } from "../lib/authValidityPeriod.js";
import FollowActionButton from "./follow/FollowActionButton.jsx";
import {
  resolveFollowTargetUserId,
  shouldShowShowcaseFollow,
  getLocalVlueUserId
} from "../lib/showcase/resolveShowcaseOwnerUserId.js";
import "./follow/follow-action.css";

function resolveSealExpiryLine(card) {
  const peerUserId = String(card?.userId || card?.ownerUserId || "").trim();
  const meId = getLocalVlueUserId();
  const isPeer = Boolean(peerUserId && (!meId || peerUserId !== meId));
  const fromItems = (Array.isArray(card?.verificationItems) ? card.verificationItems : [])
    .map((line) => String(line || "").trim())
    .find((line) => /만료일|인증유효기간/.test(line));
  if (fromItems) {
    const cleaned = fromItems.replace(/^(만료일|인증유효기간)\s*[:：]?\s*/, "").trim();
    if (cleaned) return cleaned;
  }
  const resolved = resolveAuthValidityPeriod({
    paidAt: card?.authPaidAt || null,
    cycleEndAt: card?.authCycleEndAt || card?.cycleEndAt || null,
    validUntil: card?.authValidUntil || null,
    billingCycle: card?.billingCycle || null,
    useLocalFallback: !isPeer && !peerUserId
  });
  return resolved?.line || "";
}

/**
 * 빅푸시 펼침 — VLUÉ 인증 봉인
 * 부제: 만료일(시안블루). 팔로우 + 쇼셜 토글
 */
export default function VluePushAuthSeal({
  className = "",
  targetUserId: targetUserIdProp = null,
  card = null,
  hideFollow = false,
  /** 본인 미리보기 — card에 userId 없을 때 로컬 로그인 id 사용 */
  fallbackToMe = true,
  onToast,
  socialToggle = false,
  socialExpanded = false,
  onActivate,
  /** 만료일 표시(미전달 시 card에서 계산) */
  expiryLine = ""
}) {
  const targetUserId = String(
    targetUserIdProp || resolveFollowTargetUserId(card, { fallbackToMe }) || ""
  ).trim();
  const showFollow = shouldShowShowcaseFollow(targetUserId, { hideFollow });
  const canToggleSocial = socialToggle && typeof onActivate === "function";
  const expiry = String(expiryLine || resolveSealExpiryLine(card) || "").trim();

  return (
    <div
      className={`vlue-push-auth-seal${socialToggle ? " vlue-push-auth-seal--social-toggle" : ""}${
        socialExpanded ? " is-social-open" : ""
      }${className ? ` ${className}` : ""}`.trim()}
      role="status"
      aria-label={VLUE_VERIFIED_PUSH_CONFIRM}
    >
      <div className="vlue-push-auth-seal__fx" aria-hidden>
        <span className="vlue-push-auth-seal__aurora" />
        <span className="vlue-push-auth-seal__mesh" />
        <span className="vlue-push-auth-seal__shine" />
        <span className="vlue-push-auth-seal__scan" />
      </div>

      <div className="vlue-push-auth-seal__row">
        <span className="vlue-push-auth-seal__icon-wrap">
          <span className="vlue-push-auth-seal__icon-ring" />
          <ShieldCheck className="vlue-push-auth-seal__icon" strokeWidth={2.4} />
        </span>

        <div className="vlue-push-auth-seal__copy">
          <p className="vlue-push-auth-seal__headline">
            <span className="vlue-push-auth-seal__brand">VLUÉ</span>
            <span className="vlue-push-auth-seal__divider" aria-hidden />
            <span className="vlue-push-auth-seal__phrase">인증 확인</span>
          </p>
          {expiry ? (
            <p className="vlue-push-auth-seal__sub vlue-push-auth-seal__sub--expiry tabular-nums">
              만료일 {expiry}
            </p>
          ) : null}
        </div>

        {showFollow ? (
          <span className="vlue-push-auth-seal__follow">
            <FollowActionButton
              targetUserId={targetUserId}
              className="follow-action-btn--seal"
              onToast={onToast}
            />
          </span>
        ) : null}

        {canToggleSocial ? (
          <button
            type="button"
            className={`vlue-push-auth-seal__social-toggle${socialExpanded ? " is-open" : ""}`}
            aria-label={socialExpanded ? "쇼셜 링크 닫기" : "쇼셜 링크 열기"}
            aria-expanded={socialExpanded}
            title={socialExpanded ? "쇼셜 닫기" : "쇼셜"}
            onClick={(e) => {
              e.stopPropagation();
              onActivate?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Share2 className="vlue-push-auth-seal__social-toggle-icon" strokeWidth={2.4} aria-hidden />
            <span>쇼셜</span>
          </button>
        ) : (
          <span className="vlue-push-auth-seal__live" aria-hidden>
            <span className="vlue-push-auth-seal__live-dot" />
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}
