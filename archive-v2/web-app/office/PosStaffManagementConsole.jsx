import { useCallback, useEffect, useState } from "react";
import { fetchPosStaffList, patchPosStaffTransmit } from "../../lib/vlueOfficeApi.js";

/** OWNER — 직원 데이터 전송 권한 원격 차단/활성화 */
export default function PosStaffManagementConsole({ isDarkMode = false, onToast }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPosStaffList();
      setStaff(data?.staff || []);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "직원 목록을 불러오지 못했습니다.");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const strong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const rowBorder = isDarkMode ? "border-white/10" : "border-slate-100";

  if (loading) {
    return <p className={`mt-2 text-[10px] ${sub}`}>직원 목록 불러오는 중…</p>;
  }

  if (!staff.length) {
    return <p className={`mt-2 text-[10px] ${sub}`}>등록된 직원이 없습니다. 위에서 @handle로 등록하세요.</p>;
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className={`text-[11px] font-bold ${strong}`}>직원 관리 콘솔</p>
      <p className={`text-[9px] leading-snug ${sub}`}>
        전송 차단 시 해당 직원은 빌지 스캔·전송이 즉시 중단됩니다. 매출 데이터는 사장님 Vault에만 보관됩니다.
      </p>
      {staff.map((s) => {
        const enabled = s.transmitEnabled !== false && s.status === "active";
        const toggling = busyId === s.staffUserId;
        return (
          <div
            key={s.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-2 ${rowBorder}`}
          >
            <div className="min-w-0">
              <p className={`truncate text-[11px] font-semibold ${strong}`}>{s.displayName}</p>
              <p className={`truncate text-[9px] ${sub}`}>{s.handle ? `@${s.handle}` : s.staffUserId}</p>
            </div>
            <button
              type="button"
              disabled={toggling}
              onClick={async () => {
                setBusyId(s.staffUserId);
                try {
                  await patchPosStaffTransmit(s.staffUserId, !enabled);
                  onToast?.(enabled ? "직원 전송 권한을 차단했습니다." : "직원 전송 권한을 활성화했습니다.");
                  await load();
                } catch (e) {
                  onToast?.(e instanceof Error ? e.message : "권한 변경에 실패했습니다.");
                } finally {
                  setBusyId("");
                }
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold disabled:opacity-50 ${
                enabled
                  ? "bg-emerald-600 text-white"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {toggling ? "…" : enabled ? "전송 허용" : "전송 차단됨"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
