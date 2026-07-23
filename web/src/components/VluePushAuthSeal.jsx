import { Share2, ShieldCheck } from "lucide-react";
import { VLUE_VERIFIED_PUSH_CONFIRM } from "../lib/vlueDigitalCardUi.js";
import FollowActionButton from "./follow/FollowActionButton.jsx";
import { resolveFollowTargetUserId, shouldShowShowcaseFollow } from "../lib/showcase/resolveShowcaseOwnerUserId.js";
import "./follow/follow-action.css";

/**
 * 빅푸시 펼침 — VLUE 실시간 인증 봉인
 * 팔로우 버튼 + 쇼셜 토글(구 LIVE 자리)
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
  onActivate
}) {
  const targetUserId = String(
    targetUserIdProp || resolveFollowTargetUserId(card, { fallbackToMe }) || ""
  ).trim();
  const showFollow = shouldShowShowcaseFollow(targetUserId, { hideFollow });
  const canToggleSocial = socialToggle && typeof onActivate === "function";

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
            <span className="vlue-push-auth-seal__brand">VLUE</span>
            <span className="vlue-push-auth-seal__divider" aria-hidden />
            <span className="vlue-push-auth-seal__phrase">인증 확인</span>
          </p>
          <p className="vlue-push-auth-seal__sub">실시간 검증되었습니다</p>
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
