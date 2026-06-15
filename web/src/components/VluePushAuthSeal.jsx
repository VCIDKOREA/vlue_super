import { ShieldCheck } from "lucide-react";
import { VLUE_VERIFIED_PUSH_CONFIRM } from "../lib/vlueDigitalCardUi.js";

/**
 * 빅푸시 펼침 — VLUE 실시간 인증 봉인 (홀로·스캔·라이브 표시)
 */
export default function VluePushAuthSeal({ className = "" }) {
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

        <span className="vlue-push-auth-seal__live" aria-hidden>
          <span className="vlue-push-auth-seal__live-dot" />
          LIVE
        </span>
      </div>
    </div>
  );
}
