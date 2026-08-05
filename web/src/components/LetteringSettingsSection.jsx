import { useCallback, useEffect, useState } from "react";
import {
  readLetteringEnabled,
  requestLetteringPermissions,
  writeLetteringEnabled
} from "../lib/letteringSettings.js";

/** 메인 앱 설정 — VLUE 레터링 켜기/끄기 + 권한 유도 */
export default function LetteringSettingsSection({
  isDarkMode = false,
  onNotice,
  onOpenBizcardHub,
  variant = "app"
}) {
  const [enabled, setEnabled] = useState(() => readLetteringEnabled());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onChange = () => setEnabled(readLetteringEnabled());
    window.addEventListener("vlue-lettering-settings-changed", onChange);
    return () => window.removeEventListener("vlue-lettering-settings-changed", onChange);
  }, []);

  const handleToggle = useCallback(
    async (next) => {
      if (!next) {
        writeLetteringEnabled(false);
        setEnabled(false);
        onNotice?.("VLUE 레터링이 꺼졌습니다.");
        return;
      }
      setBusy(true);
      const perm = requestLetteringPermissions();
      writeLetteringEnabled(true);
      setEnabled(true);
      setBusy(false);
      if (perm.ok) {
        onNotice?.(
          "레터링이 켜졌습니다. 전화·통화기록·「다른 앱 위에 표시」권한을 허용해 주세요."
        );
      } else {
        onNotice?.(
          "레터링이 켜졌습니다. VLUE 앱에서 전화·통화기록·다른 앱 위에 표시 권한을 허용해 주세요."
        );
      }
    },
    [onNotice]
  );

  const border = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-white";
  const label = isDarkMode ? "text-gray-200" : "text-gray-700";
  const hint = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-2xl border p-3 ${border}`}>
      <p className={`mb-1 text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
        VLUE 레터링
      </p>
      <p className={`mb-3 text-[11px] leading-snug ${hint}`}>
        통화 수·발신 시 VLUE 인증 명함·쇼케이스를 표시합니다. 꺼두면 백그라운드 감시가 중지됩니다.
        <br />
        ※ 「다른 앱 위에 표시」는 필수입니다. VLUE는 기본 전화 앱이 아니며, 삼성 전화 앱 위에 오버레이로
        쇼케이스를 띄웁니다.
      </p>
      <label className={`flex items-center justify-between text-[12px] font-semibold ${label}`}>
        레터링 기능 켜기
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => handleToggle(e.target.checked)}
        />
      </label>
      {enabled ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className={`w-full rounded-lg border py-2 text-[11px] font-bold ${
              isDarkMode ? "border-blue-400/40 text-blue-300" : "border-blue-200 text-blue-700"
            }`}
            onClick={() => requestLetteringPermissions()}
          >
            통화·오버레이 권한 다시 확인
          </button>
          <button
            type="button"
            className={`w-full rounded-lg border py-2 text-[11px] font-bold ${
              isDarkMode ? "border-amber-400/40 text-amber-200" : "border-amber-200 text-amber-800"
            }`}
            onClick={() => {
              try {
                if (typeof window.Android?.testLetteringBigPush === "function") {
                  window.Android.testLetteringBigPush("01012345678");
                  onNotice?.("빅푸시 테스트 기동 — 배너·알림·화면이 뜨는지 확인하세요.");
                  return;
                }
              } catch {
                /* ignore */
              }
              onNotice?.("빅푸시 테스트는 VLUE Android 앱에서만 가능합니다.");
            }}
          >
            빅푸시 테스트 (통화 없이)
          </button>
        </div>
      ) : null}
      <p className={`mt-3 text-[10px] leading-snug ${hint}`}>
        {variant === "web"
          ? "명함 신청·수정은 이 페이지 「디지털인증명함」 탭에서 할 수 있습니다. 실제 통화 오버레이는 모바일 앱에서 동작합니다."
          : "명함 신청·미리보기·수정은 프로필 메뉴 첫 화면 상단 「디지털인증명함」 카드에서만 할 수 있습니다."}
      </p>
      {onOpenBizcardHub ? (
        <button
          type="button"
          className={`mt-2 w-full rounded-lg border py-2 text-[11px] font-bold ${
            isDarkMode ? "border-cyan-500/35 text-cyan-200" : "border-cyan-200 text-cyan-800"
          }`}
          onClick={onOpenBizcardHub}
        >
          명함 설정 화면으로 이동
        </button>
      ) : null}
    </div>
  );
}
