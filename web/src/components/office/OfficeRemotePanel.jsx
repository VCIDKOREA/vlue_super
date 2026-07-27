import { useCallback, useEffect, useState } from "react";
import {
  fetchOfficeAgents,
  fetchRemoteControlQueue,
  postOfficeRemoteControl
} from "../../lib/vlueOfficeApi.js";

function readUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id")?.trim() || "";
  } catch {
    return "";
  }
}

export default function OfficeRemotePanel({
  files = [],
  onToast,
  focusFileId = "",
  loading = false,
  onRefresh,
  compact = false
}) {
  const [agents, setAgents] = useState([]);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [agentData, queueData] = await Promise.all([fetchOfficeAgents(), fetchRemoteControlQueue()]);
      setAgents(agentData.agents || []);
      setQueue(queueData.queue || []);
    } catch {
      setAgents([]);
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refresh();
    };
    const t = window.setInterval(tick, 20000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const resolveDeviceId = () => agents[0]?.deviceId || readUserId() || "local-pc";

  const runRemote = async (file, action) => {
    setBusy(true);
    try {
      const data = await postOfficeRemoteControl({
        assetFileId: file.id,
        deviceId: resolveDeviceId(),
        senderLineNumber: agents[0]?.senderLine || "",
        action
      });
      onToast?.(`${action === "fax" ? "팩스" : "인쇄"} 요청 · ${data.job?.status || "접수"}`);
      refresh();
      onRefresh?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "원격 제어 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-3 ${compact ? "border-0 bg-transparent p-0" : ""}`}>
      {!compact ? (
        <p className="text-[13px] font-black text-slate-900">PC 프린트 · 팩스 리모컨</p>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>연결 PC {agents.length > 0 ? "1대" : "없음"}</span>
        <span>대기 {queue.length}</span>
      </div>
      {agents.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-600">
          VLUE PC에서 복합기를 먼저 연결해 주세요. 앱에서는 인쇄·팩스만 보냅니다.
        </p>
      ) : null}
      {loading ? (
        <p className="py-6 text-center text-[12px] text-slate-400">문서 불러오는 중…</p>
      ) : files.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[12px] text-slate-500">
          인쇄할 문서가 없습니다. 내 문서에 PDF·엑셀을 저장하세요.
        </p>
      ) : (
        <div className="max-h-[min(42vh,320px)] space-y-2 overflow-y-auto">
          {files.map((f) => {
            const focused = focusFileId && f.id === focusFileId;
            return (
              <div
                key={f.id}
                className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                  focused ? "border-blue-400 bg-blue-50" : "border-slate-100"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800">{f.name}</span>
                <button
                  type="button"
                  disabled={busy || agents.length === 0}
                  onClick={() => runRemote(f, "print")}
                  className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  인쇄
                </button>
                <button
                  type="button"
                  disabled={busy || agents.length === 0}
                  onClick={() => runRemote(f, "fax")}
                  className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40"
                >
                  팩스
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
