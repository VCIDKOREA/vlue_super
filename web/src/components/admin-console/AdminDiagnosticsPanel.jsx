import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminDiagnosticSessionDetail,
  fetchAdminDiagnosticSessions
} from "../../lib/adminConsoleApi.js";

const FEATURES = [
  { id: "BIG_PUSH", label: "Big Push Trace" },
  { id: "SHOWCASE", label: "Showcase Trace" },
  { id: "MINI_CASE", label: "Mini Case Trace" },
  { id: "OVERLAY", label: "Overlay Trace" },
  { id: "FOREGROUND_SERVICE", label: "Foreground Service Trace" },
  { id: "API", label: "API Trace" },
  { id: "VERIFICATION", label: "Verification Trace" },
  { id: "PUSH", label: "Push Notification Trace" }
];

const BIG_PUSH_STEPS = [
  { seq: 1, short: "Incoming" },
  { seq: 2, short: "MonitorService" },
  { seq: 3, short: "Coordinator" },
  { seq: 4, short: "onCreate" },
  { seq: 5, short: "onStartCommand" },
  { seq: 6, short: "showOverlay" },
  { seq: 7, short: "addView() CALL" },
  { seq: 8, short: "addView() result" },
  { seq: 9, short: "React Root" },
  { seq: 10, short: "Showcase Visible" },
  { seq: 11, short: "Call End" }
];

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "OK"
      ? "bg-emerald-100 text-emerald-800"
      : s === "FAILED" || s === "SKIPPED"
        ? "bg-rose-100 text-rose-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${cls}`}>{s || "—"}</span>
  );
}

function markForStep(events, seq) {
  const related = (events || []).filter((e) => e.seq === seq);
  if (!related.length) return { mark: "·", failed: false, event: null };
  const fail = related.find((e) => e.ok === false || String(e.code).includes("FAIL") || e.code === "SKIP");
  if (fail) return { mark: "✖", failed: true, event: fail };
  const ok = related.find((e) => e.ok === true) || related[related.length - 1];
  return { mark: "✔", failed: false, event: ok };
}

export default function AdminDiagnosticsPanel({ onToast }) {
  const [feature, setFeature] = useState("BIG_PUSH");
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchAdminDiagnosticSessions({ feature, limit: 50 });
      setSessions(data.sessions || []);
      if (selectedId && !(data.sessions || []).some((s) => s.id === selectedId)) {
        /* keep selection if still loading detail */
      }
    } catch (e) {
      onToast?.(e.message || "세션 목록 실패");
    }
  }, [feature, onToast, selectedId]);

  const loadDetail = useCallback(
    async (id) => {
      if (!id) {
        setDetail(null);
        return;
      }
      try {
        const data = await fetchAdminDiagnosticSessionDetail(id);
        setDetail(data);
      } catch (e) {
        onToast?.(e.message || "세션 상세 실패");
      }
    },
    [onToast]
  );

  useEffect(() => {
    setBusy(true);
    void loadList().finally(() => setBusy(false));
  }, [loadList]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const t = window.setInterval(() => {
      void loadList();
      if (selectedId) void loadDetail(selectedId);
    }, 4000);
    return () => window.clearInterval(t);
  }, [loadList, loadDetail, selectedId]);

  const session = detail?.session;
  const events = detail?.events || [];
  const overlay = session?.overlayStateJson || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-black text-slate-900">Diagnostics</h2>
          <p className="text-[12px] text-slate-500">원격 기기 트레이스 — USB/Logcat 없이 실패 단계 분석</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFeature(f.id);
                setSelectedId(null);
                setDetail(null);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                feature === f.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-[12px] font-black text-slate-700">Session 목록</p>
            <p className="text-[10px] text-slate-400">{busy ? "갱신 중…" : "4초 폴링"}</p>
          </div>
          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {!sessions.length ? (
              <p className="px-3 py-10 text-center text-[12px] text-slate-500">세션 없음</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`block w-full px-3 py-2.5 text-left hover:bg-slate-50 ${
                    selectedId === s.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-bold text-slate-900">{s.sessionKey}</span>
                    {statusBadge(s.status)}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {s.deviceModel || "—"} · Android {s.androidVersion || "—"} · App {s.appVersion || "—"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    step {s.lastStep}
                    {s.failStep != null ? ` · fail@${s.failStep}` : ""} · {s.phoneMasked || "phone —"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {!session ? (
            <p className="py-16 text-center text-[13px] text-slate-500">세션을 선택하세요</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-[12px] sm:grid-cols-2">
                <Meta label="Session" value={session.sessionKey} mono />
                <Meta label="Status" value={statusBadge(session.status)} />
                <Meta label="Device" value={session.deviceModel || "—"} />
                <Meta label="Android" value={session.androidVersion || "—"} />
                <Meta label="App" value={session.appVersion || "—"} />
                <Meta label="Phone" value={session.phoneMasked || "—"} mono />
                <Meta label="User" value={session.userId || "—"} mono />
                <Meta label="Started" value={session.startedAt} mono />
              </div>

              <hr className="border-slate-100" />

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Timeline</p>
                <ul className="space-y-1.5 font-mono text-[12px]">
                  {(feature === "BIG_PUSH" ? BIG_PUSH_STEPS : uniqueSeqs(events)).map((step) => {
                    const seq = step.seq;
                    const short = step.short || step.label || `Step ${seq}`;
                    const { mark, failed, event } = markForStep(events, seq);
                    return (
                      <li key={seq} className={failed ? "text-rose-700" : mark === "✔" ? "text-emerald-700" : "text-slate-400"}>
                        <span className="inline-block w-5 font-black">{mark}</span>
                        [{seq}] {short}
                        {event?.elapsedMs != null ? (
                          <span className="ml-2 text-[10px] text-slate-400">+{event.elapsedMs}ms</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {session.failReason || events.some((e) => e.reason) ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
                  <p className="font-black">Reason</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {session.failReason || events.find((e) => e.reason)?.reason}
                  </p>
                  {session.failStep != null ? (
                    <p className="mt-1 text-[11px] text-rose-700">failStep = {session.failStep}</p>
                  ) : null}
                </div>
              ) : null}

              {session.suggestedFixHint ? (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
                  <p className="font-black">수정 후보</p>
                  <p className="mt-1 font-mono text-[11px]">
                    {session.suggestedFixHint.file} · {session.suggestedFixHint.functionName}
                  </p>
                  <p className="mt-1 text-[11px]">{session.suggestedFixHint.note}</p>
                </div>
              ) : null}

              {events.some((e) => e.exceptionStack || e.exceptionMessage) ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-black uppercase text-slate-500">Exception</p>
                  {events
                    .filter((e) => e.exceptionMessage || e.exceptionStack)
                    .map((e) => (
                      <div key={e.id} className="mt-2">
                        <p className="text-[12px] font-bold text-slate-800">
                          {e.exceptionMessage || "(no message)"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {e.exceptionFn || "—"}
                          {e.exceptionLine != null ? `:${e.exceptionLine}` : ""}
                        </p>
                        {e.exceptionStack ? (
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-slate-600">
                            {e.exceptionStack}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-slate-500">Overlay / LayoutParams</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 sm:grid-cols-3">
                  {[
                    "type",
                    "flags",
                    "flagsHex",
                    "gravity",
                    "x",
                    "y",
                    "width",
                    "height",
                    "format",
                    "privateFlags",
                    "alpha",
                    "visibility",
                    "attachedToWindow",
                    "overlayPermission",
                    "notificationPermission",
                    "foregroundServiceState"
                  ].map((k) => (
                    <div key={k}>
                      <span className="text-slate-400">{k}</span>{" "}
                      {formatVal(overlay[k])}
                    </div>
                  ))}
                </div>
                {!Object.keys(overlay || {}).length ? (
                  <p className="mt-2 text-[11px] text-slate-400">오버레이 스냅샷 없음</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className={`text-[12px] text-slate-800 ${mono ? "font-mono" : "font-semibold"}`}>{value}</div>
    </div>
  );
}

function formatVal(v) {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function uniqueSeqs(events) {
  const map = new Map();
  for (const e of events || []) {
    if (!map.has(e.seq)) map.set(e.seq, { seq: e.seq, short: e.label || e.code });
  }
  return [...map.values()].sort((a, b) => a.seq - b.seq);
}
