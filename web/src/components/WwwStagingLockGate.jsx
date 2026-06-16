import { useCallback, useEffect, useState } from "react";
import {
  isWwwStagingLockEnabled,
  probeStagingAccess,
  promptBasicAuth,
  readStagingBypassSession,
  writeStagingBypassSession
} from "../lib/wwwStagingLock.js";

export default function WwwStagingLockGate({ children }) {
  const lockOn = isWwwStagingLockEnabled();
  const [checking, setChecking] = useState(lockOn);
  const [bypass, setBypass] = useState(!lockOn || readStagingBypassSession());
  const [authError, setAuthError] = useState("");

  const verify = useCallback(async (authHeader) => {
    setChecking(true);
    const ok = await probeStagingAccess(authHeader);
    if (ok) {
      writeStagingBypassSession(true);
      setBypass(true);
      setAuthError("");
    } else if (authHeader) {
      setAuthError("인증에 실패했습니다.");
    }
    setChecking(false);
    return ok;
  }, []);

  useEffect(() => {
    if (!lockOn) return;
    if (readStagingBypassSession()) {
      setBypass(true);
      setChecking(false);
      return;
    }
    verify();
  }, [lockOn, verify]);

  const handleDevLogin = async () => {
    const header = promptBasicAuth();
    if (!header) return;
    await verify(header);
  };

  if (!lockOn || bypass) return children;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-6 py-16">
      <article className="vlue-promo-card w-full max-w-md">
        <div className="vlue-promo-card__hero !pb-10">
          <p className="vlue-type-eyebrow text-white/80">VLUE</p>
          <h1 className="vlue-promo-card__hero-title mt-2">Coming Soon</h1>
          <p className="mt-2 text-[15px] font-normal leading-relaxed text-white/90">
            2026년 정식 오픈을 준비하고 있어요
          </p>
        </div>
        <div className="vlue-promo-card__body -mt-6">
          <p className="vlue-type-body text-[#4e5968]">
            가비아 DNS는 그대로 두고, 내부 스테이징만 잠금 처리했습니다. 개발자·화이트리스트 IP만 미리보기에
            접근할 수 있습니다.
          </p>
          {checking ? (
            <p className="vlue-type-caption mt-6 text-center text-[#8b95a1]">접근 권한 확인 중…</p>
          ) : (
            <>
              <button type="button" onClick={handleDevLogin} className="vlue-promo-card__cta mt-5">
                개발자 로그인
              </button>
              {authError ? (
                <p className="vlue-type-caption mt-2 text-center text-rose-500">{authError}</p>
              ) : null}
            </>
          )}
        </div>
      </article>
    </div>
  );
}
