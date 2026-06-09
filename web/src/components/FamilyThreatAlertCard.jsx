import { useState } from "react";
import { resolveFamilyCrossThreat } from "../lib/familyCrossSecurityApi.js";

function requestNativeDelete(packageName) {
  try {
    const native = window.VlueFamilyBridgeNative;
    if (native?.requestDeletePackage) {
      native.requestDeletePackage(packageName);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** 가족 보안 위협 카드 — [즉시 제거] → Android DELETE 인텐트 */
export default function FamilyThreatAlertCard({ incident, onResolved, onToast }) {
  const [busy, setBusy] = useState(false);
  if (!incident || incident.status !== "open") return null;

  const pkg = incident.packageName || "";
  const label = incident.appLabel || pkg || "위험 앱";

  const onDelete = async () => {
    if (pkg) requestNativeDelete(pkg);
    setBusy(true);
    try {
      await resolveFamilyCrossThreat(incident.id, true);
      onToast?.(`[해결] ${label} 조치가 기록되었습니다.`);
      onResolved?.(incident.id);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "해결 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2.5">
      <p className="text-[12px] font-black text-rose-900">[위협] {label}</p>
      <p className="mt-0.5 text-[11px] text-rose-800">
        {incident.threatKind === "vlue_app_uninstalled"
          ? "VLUE 앱 삭제가 감지되었습니다. 즉시 연락하세요."
          : "가족 기기에서 위험 앱이 탐지되었습니다."}
      </p>
      <div className="mt-2 flex gap-2">
        {pkg ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50"
          >
            즉시 제거
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await resolveFamilyCrossThreat(incident.id, false);
              onResolved?.(incident.id);
            } catch (e) {
              onToast?.(e instanceof Error ? e.message : "처리 실패");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-[11px] font-bold text-rose-700 disabled:opacity-50"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
}
