import { useEffect, useRef } from "react";
import { redeemElderInvite } from "../lib/familyProtectionApi.js";
import {
  captureProtectionInviteFromLocation,
  clearStoredProtectionInvite
} from "../lib/protectionInvite.js";

/** 로그인된 메인 앱 — 초대 링크의 inviteCode로 자녀 그룹에 연결 */
export default function ProtectionInviteRedeem({ enabled, onToast }) {
  const ran = useRef(false);
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  useEffect(() => {
    if (!enabled || ran.current) return undefined;
    const code = captureProtectionInviteFromLocation();
    if (!code) return undefined;
    ran.current = true;
    let cancelled = false;
    (async () => {
      try {
        await redeemElderInvite(code);
        if (cancelled) return;
        clearStoredProtectionInvite();
        toastRef.current?.("가족 보호 그룹에 연결되었습니다.");
        window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
      } catch (err) {
        ran.current = false;
        if (!cancelled) toastRef.current?.(err?.message || "가족 초대 연결에 실패했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return null;
}
