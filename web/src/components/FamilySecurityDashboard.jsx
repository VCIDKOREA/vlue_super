import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  fetchFamilyCrossSecurityDashboard,
  fetchFamilySecurityState
} from "../lib/familyCrossSecurityApi.js";
import { fetchPosLedgerDashboard, fetchPosLedgerRole, invitePosStaff } from "../lib/vlueOfficeApi.js";
import FamilyThreatAlertCard from "./FamilyThreatAlertCard.jsx";
import { openNotificationAccessSettings } from "../lib/posBillNativeOcr.js";
import PosStaffManagementConsole from "./office/PosStaffManagementConsole.jsx";
import { OPEN_POS_DASHBOARD_KEY } from "../lib/posDashboardConstants.js";
import FamilyPlatformMatrixPanel from "./FamilyPlatformMatrixPanel.jsx";
import { isIosShell, requestIosRestrictedNotice } from "../lib/familyPlatformCapabilities.js";

function krw(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}원`;
}

/** 통합 대시보드 — 가족 보안 (+ 사업자만 매출 장부) */
export default function FamilySecurityDashboard({ isDarkMode = false, onToast }) {
  const [sec, setSec] = useState(null);
  const [pos, setPos] = useState(null);
  const [posRole, setPosRole] = useState(null);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffHandle, setStaffHandle] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);

  const isOwner = posRole?.role === "OWNER";
  const canViewPos = Boolean(posRole?.canViewDashboard);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, st, role] = await Promise.all([
        fetchFamilyCrossSecurityDashboard().catch(() => null),
        fetchPosLedgerDashboard().catch(() => null),
        fetchFamilySecurityState().catch(() => null),
        fetchPosLedgerRole().catch(() => null)
      ]);
      setSec(s);
      setPos(p);
      setPosRole(role);
      setStates(st?.members || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      load();
    };
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem(OPEN_POS_DASHBOARD_KEY);
      if (!flag) return;
      sessionStorage.removeItem(OPEN_POS_DASHBOARD_KEY);
      load();
      requestAnimationFrame(() => {
        document.getElementById("pos-sales-dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      /* ignore */
    }
  }, [load]);

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-indigo-100 bg-white";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const strong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const openIncidents = (sec?.incidents || []).filter((i) => i.status === "open");
  const iosWardMembers = states.filter((m) => m.devicePlatform === "ios");

  useEffect(() => {
    if (!iosWardMembers.length) return;
    try {
      const key = "vlue_guardian_ios_ward_notice_v1";
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      window.dispatchEvent(
        new CustomEvent("vlue-show-ios-restricted", {
          detail: { guardianIosWard: true, wardNames: iosWardMembers.map((m) => m.displayName).join(", ") }
        })
      );
    } catch {
      /* ignore */
    }
  }, [iosWardMembers.length]);

  return (
    <div id="pos-sales-dashboard" className={`mt-3 rounded-2xl border p-3 ${panel}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[13px] font-black ${strong}`}>
          {canViewPos ? "매출 대시보드 · 가족 보안" : "가족 보안·상태 대시보드"}
        </p>
        {canViewPos ? (
          <span className="shrink-0 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
            OWNER Vault
          </span>
        ) : null}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      <div className={`mt-2 grid gap-2 ${canViewPos ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className={`rounded-xl border px-2.5 py-2 ${isDarkMode ? "border-rose-500/20 bg-rose-500/10" : "border-rose-100 bg-rose-50"}`}>
          <p className={`text-[10px] font-bold ${sub}`}>가족 보안 상태</p>
          <p className={`mt-0.5 text-[18px] font-black ${isDarkMode ? "text-rose-200" : "text-rose-800"}`}>
            {loading ? "…" : `${sec?.openCount ?? 0}건`}
          </p>
          <p className={`text-[9px] ${sub}`}>미해결 / 해결 {sec?.resolvedCount ?? 0}건</p>
        </div>
        {canViewPos ? (
          <div className={`rounded-xl border px-2.5 py-2 ${isDarkMode ? "border-emerald-500/20 bg-emerald-500/10" : "border-emerald-100 bg-emerald-50"}`}>
            <p className={`text-[10px] font-bold ${sub}`}>오늘의 매출</p>
            <p className={`mt-0.5 text-[18px] font-black ${isDarkMode ? "text-emerald-200" : "text-emerald-800"}`}>
              {loading ? "…" : krw(pos?.todayTotalKrw)}
            </p>
            <p className={`text-[9px] ${sub}`}>이번 달 {krw(pos?.monthTotalKrw)}</p>
          </div>
        ) : null}
      </div>

      {isOwner ? (
        <div className="mt-2 flex gap-1.5">
          <input
            value={staffHandle}
            onChange={(e) => setStaffHandle(e.target.value)}
            placeholder="직원 아이디 (@handle)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-blue-400"
          />
          <button
            type="button"
            disabled={staffBusy || !staffHandle.trim()}
            onClick={async () => {
              setStaffBusy(true);
              try {
                await invitePosStaff(staffHandle.trim());
                setStaffHandle("");
                onToast?.("직원(STAFF) 스캔 권한이 등록되었습니다.");
              } catch (e) {
                onToast?.(e instanceof Error ? e.message : "직원 등록 실패");
              } finally {
                setStaffBusy(false);
              }
            }}
            className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
          >
            직원 등록
          </button>
        </div>
      ) : null}

      {isOwner ? <PosStaffManagementConsole isDarkMode={isDarkMode} onToast={onToast} /> : null}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            if (isIosShell()) {
              requestIosRestrictedNotice("bankNotification");
              return;
            }
            const ok = openNotificationAccessSettings();
            if (!ok) onToast?.("Android 앱에서 알림 접근 권한을 설정해 주세요.");
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[13px] font-black shadow-md active:scale-[0.98] ${
            isDarkMode
              ? "bg-blue-500 text-white shadow-blue-900/40"
              : "bg-blue-600 text-white shadow-blue-600/30"
          }`}
        >
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          은행 입출금 알림 연동 (알림 접근 권한)
        </button>
        <p className={`mt-1.5 text-center text-[9px] font-semibold ${sub}`}>
          탭하면 기기 알림 접근 설정으로 이동합니다
        </p>
      </div>

      {openIncidents.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className={`text-[11px] font-bold ${strong}`}>즉시 조치 필요</p>
          {openIncidents.map((inc) => (
            <FamilyThreatAlertCard
              key={inc.id}
              incident={inc}
              onToast={onToast}
              onResolved={() => load()}
            />
          ))}
        </div>
      ) : null}

      <FamilyPlatformMatrixPanel isDarkMode={isDarkMode} />

      {canViewPos && (pos?.entries || []).length > 0 ? (
        <div className="mt-3">
          <p className={`text-[11px] font-bold ${strong}`}>최근 매출 장부</p>
          {pos.entries.slice(0, 5).map((e) => (
            <div
              key={e.id}
              className={`mt-1.5 rounded-lg border px-2 py-1.5 text-[11px] ${isDarkMode ? "border-white/10" : "border-slate-100"}`}
            >
              <div className="flex justify-between">
                <span className={sub}>{e.saleDate}</span>
                <span className={`font-bold ${strong}`}>{krw(e.totalKrw)}</span>
              </div>
              {e.submittedByName && e.submittedByUserId !== e.ownerUserId ? (
                <p className={`mt-0.5 text-[9px] ${sub}`}>전송: {e.submittedByName}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
