import { useState } from "react";
import VLUE_BRAND_LOGO from "../assets/vlue-shield-logo.svg?url";
import {
  getBiometricProfile,
  hasStoredCredential,
  isWebAuthnSupported,
  registerBiometric,
  verifyBiometric,
  setBiometricGraceNow,
  BIOMETRIC_GRACE_MS
} from "../lib/webauthnBiometric";

const hours = Math.round(BIOMETRIC_GRACE_MS / (60 * 60 * 1000));

/**
 * 메인 진입 전 WebAuthn 생체 인증 또는 (미지원 시) 24시간 유예
 */
function BiometricGate({ onPassed }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supported = isWebAuthnSupported();
  const registered = hasStoredCredential();
  const bio = getBiometricProfile();

  const finish = () => {
    setBiometricGraceNow();
    onPassed?.();
  };

  const handleRegister = async () => {
    setError("");
    setBusy(true);
    try {
      const ok = await registerBiometric();
      if (!ok) {
        setError("등록에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      finish();
    } catch (e) {
      const name = e?.name || "";
      if (name === "NotAllowedError") {
        setError("등록이 취소되었거나 기기에서 거부되었습니다.");
      } else {
        setError(e?.message || "등록 중 오류가 발생했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setBusy(true);
    try {
      const ok = await verifyBiometric();
      if (!ok) {
        setError("인증에 실패했습니다.");
        return;
      }
      finish();
    } catch (e) {
      const name = e?.name || "";
      if (name === "NotAllowedError") {
        setError("인증이 취소되었습니다.");
      } else {
        setError(e?.message || "인증 중 오류가 발생했습니다.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnsupportedContinue = () => {
    finish();
  };

  return (
    <div className="biometric-gate-root fixed inset-0 z-[300] flex min-h-[100dvh] w-full flex-col bg-[#fafbfc] antialiased">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <img
          src={VLUE_BRAND_LOGO}
          alt=""
          width={56}
          height={56}
          draggable={false}
          className="biometric-gate-logo h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-blue-900/10"
        />
        <h1 className="mt-5 text-center text-[20px] font-bold tracking-tight text-slate-900">보안 인증</h1>
        <p className="mt-2 max-w-[320px] text-center text-[13px] leading-snug text-slate-600 [word-break:keep-all]">
          {bio.gateDescription}
        </p>
        {bio.platform === "android" && (
          <p className="mt-1 max-w-[320px] text-center text-[11px] text-slate-500">
            지문과 얼굴 중 기기에 등록된 방식으로 인증됩니다.
          </p>
        )}
        {bio.platform === "ios" && (
          <p className="mt-1 max-w-[320px] text-center text-[11px] text-slate-500">
            iOS에서는 Face ID(얼굴 인식)만 사용합니다.
          </p>
        )}
        <p className="mt-2 text-center text-[11px] text-slate-400">
          마지막 인증 후 {hours}시간 동안은 이 단계를 건너뜁니다.
        </p>

        {!supported && (
          <div className="mt-8 w-full max-w-[300px] space-y-3">
            <p className="text-center text-[12px] leading-relaxed text-amber-800">
              이 브라우저는 WebAuthn 생체 인증을 지원하지 않거나 보안 연결(HTTPS)이 아닙니다.
            </p>
            <button
              type="button"
              onClick={handleUnsupportedContinue}
              disabled={busy}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {hours}시간 동안 생략하고 계속
            </button>
          </div>
        )}

        {supported && !registered && (
          <div className="mt-8 w-full max-w-[300px] space-y-3">
            <button
              type="button"
              onClick={handleRegister}
              disabled={busy}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? "등록 중…" : bio.registerButtonLabel}
            </button>
          </div>
        )}

        {supported && registered && (
          <div className="mt-8 w-full max-w-[300px] space-y-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={busy}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? "인증 중…" : bio.verifyButtonLabel}
            </button>
          </div>
        )}

        {error ? <p className="mt-4 max-w-[300px] text-center text-[12px] text-red-600">{error}</p> : null}
      </div>
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] font-medium text-slate-400">VLUE</p>
    </div>
  );
}

export default BiometricGate;
