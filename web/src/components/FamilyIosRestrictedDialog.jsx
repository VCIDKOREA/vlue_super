import { useEffect, useState } from "react";
import { FAMILY_PLATFORM_MATRIX, IOS_RESTRICTED_MESSAGE } from "../lib/familyPlatformCapabilities.js";

/** iOS 정책 제한 안내 — 확인 버튼 필수 */
export default function FamilyIosRestrictedDialog() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const onShow = (e) => {
      setDetail(e.detail || null);
      setOpen(true);
    };
    window.addEventListener("vlue-show-ios-restricted", onShow);
    return () => window.removeEventListener("vlue-show-ios-restricted", onShow);
  }, []);

  if (!open) return null;

  const featureLabel = detail?.label || FAMILY_PLATFORM_MATRIX[detail?.feature]?.label;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/45 px-5">
      <div
        role="alertdialog"
        aria-labelledby="ios-restricted-title"
        aria-describedby="ios-restricted-body"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <p id="ios-restricted-title" className="text-[15px] font-black text-slate-900">
          iPhone 기능 제한 안내
        </p>
        <p id="ios-restricted-body" className="mt-3 text-[13px] leading-relaxed text-slate-700">
          {IOS_RESTRICTED_MESSAGE}
        </p>
        {featureLabel ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            해당 기능: {featureLabel}
          </p>
        ) : null}
        {detail?.wardChild ? (
          <p className="mt-2 text-[11px] text-slate-500">
            자녀 iPhone에서는 OCR 빌지 스캔 등 일부 기능만 이용할 수 있습니다.
          </p>
        ) : null}
        {detail?.guardianIosWard ? (
          <p className="mt-2 text-[11px] text-slate-500">
            등록된 자녀 기기가 iPhone({detail?.wardNames || "자녀"})입니다. 입출금 알림·악성앱 탐지 등은 Android에서만 동작합니다.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-[13px] font-bold text-white active:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  );
}
