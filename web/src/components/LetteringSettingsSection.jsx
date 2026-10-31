import { useCallback } from "react";
import { openNativeAppSettings, requestLetteringPermissions, readLetteringPermissionStatus } from "../lib/letteringSettings.js";

/**
 * 설정 > 프로필 하위 — 권한 보조만.
 * 통화 감지 ON/OFF 는 마이페이지 「쇼케이스 켜짐/꺼짐」 토글이 담당.
 */
export default function LetteringSettingsSection({
  isDarkMode = false,
  onNotice
}) {
  const openAppPermissionSettings = useCallback(() => {
    const r = openNativeAppSettings();
    if (r?.ok) {
      onNotice?.("「권한」에서 전화·통화기록·다른 앱 위에 표시를 허용으로 바꿔 주세요.");
    } else {
      onNotice?.("앱 설정을 열 수 없습니다. 기기 설정 → 앱 → VLUÉ → 권한으로 이동해 주세요.");
    }
  }, [onNotice]);

  const checkCallPermissions = useCallback(() => {
    const st = readLetteringPermissionStatus();
    if (st?.callOverlayReady) {
      onNotice?.("통화·오버레이 권한이 이미 허용되어 있습니다.");
      return;
    }
    requestLetteringPermissions();
    onNotice?.("필요한 권한 허용 창을 열었습니다.");
  }, [onNotice]);

  const canOpenAppSettings =
    typeof window !== "undefined" &&
    Boolean(window.Android?.openAppSettings || window.VlueLettering?.openAppSettings);

  const border = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-white";
  const hint = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-2xl border p-3 ${border}`}>
      <p className={`mb-1 text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
        통화·오버레이 권한
      </p>
      <p className={`mb-3 text-[11px] leading-snug ${hint}`}>
        통화 감지 ON/OFF는 마이페이지 우측 상단 <strong>쇼케이스 켜짐/꺼짐</strong> 토글로 제어합니다.
        권한이 부족할 때만 아래에서 허용해 주세요.
      </p>
      <button
        type="button"
        className="mb-2 w-full rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
        onClick={checkCallPermissions}
      >
        통화·오버레이 권한 확인
      </button>
      {canOpenAppSettings ? (
        <button
          type="button"
          className={`w-full rounded-xl border py-2.5 text-[12px] font-bold ${
            isDarkMode ? "border-white/20 text-white/90" : "border-gray-200 text-gray-800"
          }`}
          onClick={openAppPermissionSettings}
        >
          앱 설정 열기
        </button>
      ) : null}
    </div>
  );
}
