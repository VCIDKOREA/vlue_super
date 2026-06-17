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
          <p className="vlue-type-body text-center leading-[1.75] text-[#4e5968]">
            멀리 있어도 마음은 닿을 수 있어요.
            <br />
            VLUE는 그 거리를 조금 더 가깝게 이어 드리려고
            <br />
            지금, 조용히 준비하고 있습니다.
          </p>
          <p className="vlue-type-caption mt-4 text-center text-[#8b95a1]">
            곧 만나요. 당신의 연결을 기다리고 있을게요.
          </p>
          {checking ? (
            <p className="vlue-type-caption mt-2 text-center text-[#8b95a1]">접근 권한 확인 중…</p>
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
