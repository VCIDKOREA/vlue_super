import { useCallback, useEffect, useState } from "react";
import { requestIamportCertification } from "../lib/iamportClient.js";
import { getPortoneUserCode } from "../lib/portoneEnv.js";
import { confirmPinResetIdentity } from "../lib/appLockBridge.js";
import { APP_LOCK_REQUIRES_RESET } from "../lib/appLockBridge.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { vlueAuthHeaders } from "../lib/vlueAuthHeaders.js";
import { apiUrl } from "../lib/apiBase.js";

/**
 * 5회 PIN 실패 / PIN 분실 → PASS·휴대폰 본인인증 후 네이티브 PIN 재등록
 */
export default function AppLockPinResetModal({ open, onClose, onPinResetReady }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("intro"); // intro | done

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError("");
      setStep("intro");
    }
  }, [open]);

  const runPass = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const meRes = await fetch(apiUrl("/api/auth/me"), { headers: vlueAuthHeaders() });
      const me = await meRes.json().catch(() => ({}));
      if (!meRes.ok) throw new Error(me.error || "로그인이 필요합니다.");
      const expectPhone = String(me.phoneE164 || me.phone || "").replace(/\D/g, "");

      const userCode = getPortoneUserCode();
      const cert = await requestIamportCertification({
        userCode,
        merchant_uid: `pin_reset_${Date.now()}`,
        name: me.legalName || undefined,
        phone: expectPhone ? formatPhoneE164ForKoreaDisplay(me.phoneE164 || me.phone) : undefined
      });
      const gotPhone = String(cert?.phone || cert?.mobile || "").replace(/\D/g, "");
      if (expectPhone && gotPhone && !gotPhone.endsWith(expectPhone.slice(-8)) && expectPhone.slice(-8) !== gotPhone.slice(-8)) {
        throw new Error("본인인증 번호가 가입 번호와 일치하지 않습니다.");
      }

      // 서버에 인증 완료 기록(가능하면) — 실패해도 클라이언트 매칭 통과 시 진행
      try {
        await fetch(apiUrl("/api/identity/portone/complete"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
          body: JSON.stringify({
            imp_uid: cert?.imp_uid,
            purpose: "app_pin_reset",
            merchant_uid: cert?.merchant_uid
          })
        });
      } catch {
        /* optional */
      }

      confirmPinResetIdentity();
      setStep("done");
      onPinResetReady?.();
    } catch (e) {
      setError(e?.message || "본인인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [onPinResetReady]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[420] flex items-end justify-center bg-black/50 px-3 pb-6 sm:items-center sm:pb-0">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-[11px] font-black tracking-wide text-blue-600">VLUE 보안</p>
        <h2 className="mt-1 text-[18px] font-black text-slate-900">PIN 재설정</h2>
        {step === "intro" ? (
          <>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-600" style={{ wordBreak: "keep-all" }}>
              5회 실패 또는 PIN 분실 시, PASS·휴대폰 본인인증으로 본인 확인 후 새 6자리 PIN을 등록합니다.
              고객센터 없이 기기에서 바로 처리할 수 있습니다.
            </p>
            <p className="mt-2 text-[12px] text-slate-500" style={{ wordBreak: "keep-all" }}>
              지문/얼굴 인식은 추후 업데이트에 추가될 예정이며, 현재는 6자리 PIN으로 안전하게 보호됩니다.
            </p>
            {error ? <p className="mt-3 text-[12px] font-bold text-rose-600">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={runPass}
              className="mt-5 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white disabled:opacity-50"
            >
              {busy ? "본인인증 중…" : "PASS·휴대폰 본인인증"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="mt-2 w-full rounded-2xl border border-slate-200 py-3 text-[13px] font-bold text-slate-600"
            >
              닫기
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-[13px] leading-relaxed text-emerald-700" style={{ wordBreak: "keep-all" }}>
              본인인증이 완료되었습니다. 네이티브 PIN 등록 화면에서 새 6자리를 입력해 주세요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-3.5 text-[14px] font-black text-white"
            >
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** 네이티브·브릿지 이벤트로 모달 오픈 */
export function useAppLockResetListener(setOpen) {
  useEffect(() => {
    const onReset = () => setOpen(true);
    window.addEventListener(APP_LOCK_REQUIRES_RESET, onReset);
    return () => window.removeEventListener(APP_LOCK_REQUIRES_RESET, onReset);
  }, [setOpen]);
}
