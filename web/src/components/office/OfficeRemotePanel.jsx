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

export default function OfficeRemotePanel({ files = [], onToast, focusFileId = "" }) {
  const [senderLine, setSenderLine] = useState("07012345678");
  const [deviceId, setDeviceId] = useState("");
  const [agents, setAgents] = useState([]);
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [agentData, queueData] = await Promise.all([fetchOfficeAgents(), fetchRemoteControlQueue()]);
      setAgents(agentData.agents || []);
      setQueue(queueData.queue || []);
      if (!deviceId && agentData.agents?.[0]?.deviceId) {
        setDeviceId(agentData.agents[0].deviceId);
      }
    } catch {
      setAgents([]);
      setQueue([]);
    }
  }, [deviceId]);

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const runRemote = async (file, action) => {
    const dev = deviceId.trim() || readUserId() || "local-pc";
    setBusy(true);
    try {
      const data = await postOfficeRemoteControl({
        assetFileId: file.id,
        deviceId: dev,
        senderLineNumber: senderLine.trim(),
        action
      });
      onToast?.(`${action === "fax" ? "팩스" : "프린트"} 요청: ${data.job?.status || "ok"}`);
      refresh();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "원격 제어 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-[13px] font-black text-slate-900">PC 프린트 · 팩스 리모컨</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={senderLine}
          onChange={(e) => setSenderLine(e.target.value)}
          placeholder="발신 회선 번호"
          className="rounded-xl border border-slate-200 px-3 py-2 text-[12px]"
        />
        <input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="PC 장치 ID"
          className="rounded-xl border border-slate-200 px-3 py-2 text-[12px]"
        />
      </div>
      <p className="text-[11px] text-slate-500">
        연결 에이전트 {agents.length} · 대기 큐 {queue.length}
      </p>
      <div className="max-h-40 space-y-2 overflow-y-auto">
        {files.map((f) => {
          const focused = focusFileId && f.id === focusFileId;
          return (
          <div
            key={f.id}
            className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
              focused ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200" : "border-slate-100"
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800">{f.name}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => runRemote(f, "print")}
              className="shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              인쇄
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runRemote(f, "fax")}
              className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-50"
            >
              팩스
            </button>
          </div>
          );
        })}
      </div>
      {queue.length > 0 ? (
        <div className="max-h-32 overflow-y-auto rounded-xl bg-slate-50 p-2">
          {queue.slice(0, 8).map((row) => (
            <p key={row.id} className="truncate text-[10px] text-slate-600">
              [{row.status}] {row.action} · {row.fileName || row.assetFileId}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
