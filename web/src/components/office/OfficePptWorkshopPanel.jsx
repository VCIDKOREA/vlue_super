import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOfficePptTasks, postOfficePptMockProgress } from "../../lib/vlueOfficeApi.js";
import { OFFICE_PPT_TASKS_CHANGED } from "../../lib/vlueAssetFilesStorage.js";

const STATUS_LABEL = {
  PENDING: "대기",
  PROCESSING: "생성 중",
  COMPLETED: "완료",
  FAILED: "실패"
};

function CircularProgress({ value, size = 88 }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[15px] font-black text-slate-900">{v}%</span>
    </div>
  );
}

function StripProgress({ value, status }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  const done = status === "COMPLETED";
  const failed = status === "FAILED";
  const bar = failed ? "bg-red-500" : done ? "bg-emerald-500" : "bg-blue-600";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${bar}`}
        style={{ width: `${done || failed ? 100 : v}%` }}
      />
    </div>
  );
}

export default function OfficePptWorkshopPanel({ onToast, onCompletedAsset }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simBusy, setSimBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOfficePptTasks();
      setTasks(data.tasks || []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener(OFFICE_PPT_TASKS_CHANGED, onChanged);
    const poll = window.setInterval(refresh, 4000);
    return () => {
      window.removeEventListener(OFFICE_PPT_TASKS_CHANGED, onChanged);
      window.clearInterval(poll);
    };
  }, [refresh]);

  const active = useMemo(() => {
    const running = tasks.find((t) => t.status === "PROCESSING" || t.status === "PENDING");
    return running || tasks[0] || null;
  }, [tasks]);

  const runDemoProgress = async () => {
    setSimBusy(true);
    try {
      let taskId = "";
      const steps = [0, 18, 42, 67, 89, 100];
      for (let i = 0; i < steps.length; i += 1) {
        const progress = steps[i];
        const status =
          progress >= 100 ? "COMPLETED" : progress > 0 ? "PROCESSING" : "PENDING";
        const data = await postOfficePptMockProgress({
          taskId: taskId || undefined,
          projectTitle: "Q2 사업계획 AI 슬라이드",
          progress,
          status
        });
        taskId = data.task?.id || taskId;
        await new Promise((r) => window.setTimeout(r, 600));
      }
      const latest = await fetchOfficePptTasks();
      const done = (latest.tasks || []).find((t) => t.id === taskId);
      if (done?.assetFileId) {
        onCompletedAsset?.({ id: done.assetFileId, name: done.projectTitle });
      }
      onToast?.("AI PPT 생성이 완료되어 자료실에 저장되었습니다.");
      refresh();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "시뮬레이션 실패");
    } finally {
      setSimBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-black text-slate-900">AI PPT 작업실 진척도</p>
          <p className="text-[11px] text-slate-500">PC 웹 빌더 ↔ 모바일 실시간 동기화</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 disabled:opacity-50"
        >
          {loading ? "…" : "동기화"}
        </button>
      </div>

      {active ? (
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <CircularProgress value={active.progress} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-900">{active.projectTitle}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-blue-600">
              {STATUS_LABEL[active.status] || active.status}
            </p>
            <div className="mt-2">
              <StripProgress value={active.progress} status={active.status} />
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[12px] text-slate-500">
          진행 중인 PPT 작업이 없습니다.
        </p>
      )}

      <button
        type="button"
        disabled={simBusy}
        onClick={runDemoProgress}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
      >
        {simBusy ? "PC 웹 시뮬레이션 중…" : "PC 웹 진척 시뮬레이션"}
      </button>

      {tasks.length > 0 ? (
        <ul className="max-h-44 space-y-2 overflow-y-auto">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[12px] font-semibold text-slate-800">{t.projectTitle}</p>
                <span className="shrink-0 text-[10px] font-bold text-slate-500">
                  {STATUS_LABEL[t.status] || t.status}
                </span>
              </div>
              <div className="mt-2">
                <StripProgress value={t.progress} status={t.status} />
              </div>
              {t.status === "COMPLETED" && t.assetFileId ? (
                <button
                  type="button"
                  onClick={() =>
                    onCompletedAsset?.({
                      id: t.assetFileId,
                      name: t.projectTitle
                    })
                  }
                  className="mt-2 text-[10px] font-bold text-blue-600"
                >
                  프린트/팩스 리모컨 연결 →
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
