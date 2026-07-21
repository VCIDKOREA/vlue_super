import { ShieldCheck } from "lucide-react";
import { VLUE_VERIFIED_PUSH_CONFIRM } from "../lib/vlueDigitalCardUi.js";
import FollowActionButton from "./follow/FollowActionButton.jsx";
import { resolveFollowTargetUserId, shouldShowShowcaseFollow } from "../lib/showcase/resolveShowcaseOwnerUserId.js";
import "./follow/follow-action.css";

/**
 * 빅푸시 펼침 — VLUE 실시간 인증 봉인 (홀로·스캔·라이브 표시)
 * 팔로우 버튼: LIVE 왼쪽 (검색 비공개와 무관하게 userId 있으면 표시)
 */
export default function VluePushAuthSeal({
  className = "",
  targetUserId: targetUserIdProp = null,
  card = null,
  hideFollow = false,
  /** 본인 미리보기 — card에 userId 없을 때 로컬 로그인 id 사용 */
  fallbackToMe = true,
  onToast
}) {
  const targetUserId = String(
    targetUserIdProp || resolveFollowTargetUserId(card, { fallbackToMe }) || ""
  ).trim();
  const showFollow = shouldShowShowcaseFollow(targetUserId, { hideFollow });

  return (
    <div
      className={`vlue-push-auth-seal${className ? ` ${className}` : ""}`.trim()}
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
          <p className="vlue-push-auth-seal__sub">실시간 채널에서 검증되었습니다</p>
        </div>

        {showFollow ? (
          <FollowActionButton
            targetUserId={targetUserId}
            className="follow-action-btn--seal"
            onToast={onToast}
          />
        ) : null}

        <span className="vlue-push-auth-seal__live" aria-hidden>
          <span className="vlue-push-auth-seal__live-dot" />
          LIVE
        </span>
      </div>
    </div>
  );
}
