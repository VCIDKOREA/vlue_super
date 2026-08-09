import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminDiagnosticSessionDetail,
  fetchAdminDiagnosticSessions
} from "../../lib/adminConsoleApi.js";
import { ADMIN_DIAGNOSTICS_UI_ENABLED } from "../../lib/adminDiagnosticsFlags.js";

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
  { seq: 8, short: "addView() SUCCESS/FAIL/EXCEPTION" },
  { seq: 9, short: "React Root" },
  { seq: 10, short: "Showcase Visible" },
  { seq: 11, short: "Call End" }
];

const PERF_MILESTONE_LABELS = {
  INCOMING_CALL: "Incoming",
  BIG_PUSH_REQUESTED: "BigPush Requested",
  BIG_PUSH_VISIBLE: "BigPush Visible",
  ANSWER_DETECTED: "Answer Detected",
  SHOWCASE_REQUESTED: "Showcase Requested",
  OVERLAY_ATTACHED: "Overlay Attached",
  REACT_ROOT_READY: "React Root Ready",
  REACT_ROOT_MOUNTED: "React Root Ready",
  DCC_BOUND: "DCC Bound",
  SHOWCASE_VISIBLE: "Showcase Visible",
  CALL_END: "Call End",
  PERF_SUMMARY: "Performance Summary"
};

const TIMELINE_SKIP_CODES = new Set([
  "SESSION_CREATED",
  "SESSION_BIND",
  "PERF_SUMMARY",
  "OVERLAY_PERMISSION_PROBE"
]);

function chronoEvents(events) {
  return [...(events || [])]
    .filter((e) => !TIMELINE_SKIP_CODES.has(String(e.code || "").toUpperCase()))
    .sort((a, b) => {
      const ta = a.elapsedMs ?? 0;
      const tb = b.elapsedMs ?? 0;
      if (ta !== tb) return ta - tb;
      return (a.seq ?? 0) - (b.seq ?? 0);
    });
}

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
  /* SUCCESS가 있으면 SKIP 잔여와 무관하게 성공 표시 */
  const success = related.find(
    (e) =>
      e.ok === true &&
      e.code !== "SKIP" &&
      !String(e.code).includes("FAIL") &&
      !String(e.code).includes("EXCEPTION")
  );
  const hardFail = related.find(
    (e) =>
      e.code === "ADD_VIEW_EXCEPTION" ||
      e.code === "ADD_VIEW_FAIL" ||
      (e.ok === false && e.code !== "SKIP" && e.code !== "CALL_END")
  );
  if (hardFail && !success) return { mark: "✖", failed: true, event: hardFail };
  if (success) return { mark: "✔", failed: false, event: success };
  const skipOnly = related.find((e) => e.code === "SKIP");
  if (skipOnly && related.length === 1) {
    return { mark: "○", failed: false, event: skipOnly };
  }
  const last = related[related.length - 1];
  return { mark: last.ok === false ? "✖" : "✔", failed: last.ok === false, event: last };
}

export default function AdminDiagnosticsPanel(props) {
  if (!ADMIN_DIAGNOSTICS_UI_ENABLED) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-[13px] text-slate-600">
        <p className="font-black text-slate-900">Diagnostics 비활성화</p>
        <p className="mt-2">
          원격 트레이스가 꺼져 있습니다 (egress 0). 코드는 유지되어 있으며, 재사용 시{" "}
          <code className="rounded bg-white px-1">adminDiagnosticsFlags.js</code> 와 API{" "}
          <code className="rounded bg-white px-1">VLUE_DIAGNOSTICS_ENABLED=true</code>, Android{" "}
          <code className="rounded bg-white px-1">DiagnosticsRemoteGate.ENABLED=true</code> 를 켜면
          됩니다.
        </p>
      </div>
    );
  }
  return <AdminDiagnosticsPanelActive {...props} />;
}

function AdminDiagnosticsPanelActive({ onToast }) {
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
    }, 30000);
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
            <p className="text-[10px] text-slate-400">{busy ? "갱신 중…" : "30초 폴링"}</p>
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

              {(() => {
                const perf = session.perf || {};
                const summary = perf.summary || {};
                const segments = Array.isArray(perf.segments) ? perf.segments : [];
                const kpiBp = session.kpi?.bigPushVisibleMaxMs ?? 300;
                const kpiSc = session.kpi?.showcaseVisibleMaxMs ?? 1000;
                const rows = [
                  { label: "Incoming → BigPush", ms: summary.incomingToBigPushMs, kpi: kpiBp },
                  { label: "Answer → Showcase", ms: summary.answerToShowcaseMs, kpi: kpiSc },
                  { label: "React Init", ms: summary.reactInitMs },
                  { label: "DCC Bind", ms: summary.dccBindMs },
                  { label: "Total Showcase", ms: summary.totalShowcaseMs, kpi: kpiSc }
                ].filter((r) => r.ms != null);
                return (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] text-violet-950">
                      <p className="font-black">Performance</p>
                      <p className="mt-1 text-[10px] text-violet-700">
                        KPI · BigPush Visible ≤ {kpiBp}ms · Showcase Visible ≤ {kpiSc}ms
                      </p>
                      {rows.length ? (
                        <ul className="mt-2 space-y-1 font-mono text-[11px]">
                          {rows.map((r) => {
                            const pass = r.kpi != null ? r.ms <= r.kpi : null;
                            return (
                              <li
                                key={r.label}
                                className={
                                  pass === false
                                    ? "text-rose-700"
                                    : pass === true
                                      ? "text-emerald-800"
                                      : "text-violet-900"
                                }
                              >
                                {r.label} : <span className="font-black">{r.ms}ms</span>
                                {r.kpi != null ? (
                                  <span className="ml-1 text-[10px] opacity-70">
                                    (KPI {r.kpi}ms {pass ? "✔" : "✖"})
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[11px] text-violet-700">
                          구간 데이터 대기 — 새 APK로 통화 후 마일스톤이 쌓이면 표시됩니다.
                        </p>
                      )}
                      {segments.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[10px] font-bold text-violet-800">
                            All segments
                          </summary>
                          <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-violet-900">
                            {segments.map((s) => (
                              <li key={s.id}>
                                {s.label}: {s.elapsedMs}ms
                                {s.kpiMs != null
                                  ? ` · KPI ${s.kpiMs}ms ${s.kpiPass ? "✔" : "✖"}`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Timeline (발생 시점 순)
                </p>
                <ul className="space-y-1.5 font-mono text-[12px]">
                  {chronoEvents(events).map((event) => {
                    const failed =
                      event.ok === false ||
                      String(event.code || "").includes("EXCEPTION") ||
                      String(event.code || "").includes("FAIL");
                    const mark = failed ? "✖" : event.ok === false ? "✖" : "✔";
                    const name =
                      PERF_MILESTONE_LABELS[event.code] ||
                      event.label?.replace(/\s+t=\+?\d+ms.*$/, "") ||
                      event.code;
                    const t = event.elapsedMs ?? 0;
                    const delta =
                      event.deltaFromPrevMs ??
                      event.payloadJson?.deltaFromPrevMs ??
                      event.payloadJson?.delta;
                    return (
                      <li
                        key={event.id}
                        className={failed ? "text-rose-700" : "text-emerald-800"}
                      >
                        <span className="inline-block w-5 font-black">{mark}</span>
                        {name}
                        <span className="ml-2 text-[10px] text-slate-500">
                          {t === 0 ? "t=0ms" : `t=+${t}ms`}
                          {delta != null ? ` · Δ${delta}ms` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {feature === "BIG_PUSH" ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[10px] font-bold text-slate-500">
                      Pipeline steps (seq)
                    </summary>
                    <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-slate-600">
                      {BIG_PUSH_STEPS.map((step) => {
                        const { mark, failed, event } = markForStep(events, step.seq);
                        return (
                          <li
                            key={step.seq}
                            className={failed ? "text-rose-700" : mark === "✔" ? "text-slate-700" : "text-slate-400"}
                          >
                            <span className="inline-block w-5 font-black">{mark}</span>
                            [{step.seq}] {step.short}
                            {event?.elapsedMs != null ? (
                              <span className="ml-2 text-[10px] text-slate-400">
                                t=+{event.elapsedMs}ms
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </div>

              {(() => {
                const probes = (events || []).filter(
                  (e) => e.code === "NORMAL_OVERLAY_PROBE" || e.code === "CALL_OVERLAY_PROBE"
                );
                if (!probes.length) return null;
                const normal = [...probes].reverse().find((e) => e.code === "NORMAL_OVERLAY_PROBE");
                const call = [...probes].reverse().find((e) => e.code === "CALL_OVERLAY_PROBE");
                const best = call?.payloadJson?.analysis ? call : normal;
                const p = best?.payloadJson || {};
                const analysis = p.analysis || {};
                const conclusion = analysis.conclusion || p.analysisHint || null;
                const confidence = analysis.confidence ?? p.confidence ?? p.evidenceScore;
                const evidence = Array.isArray(p.evidence)
                  ? p.evidence
                  : String(p.evidenceText || "")
                      .split("\n")
                      .filter(Boolean)
                      .map((line) => ({
                        ok: line.startsWith("✔"),
                        label: line.replace(/^[✔✘]\s*/, "")
                      }));
                return (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-950">
                    <p className="font-black">Overlay Probe Compare</p>
                    <p className="mt-1 font-mono text-[11px]">
                      NORMAL:{" "}
                      <span className="font-black">
                        {normal?.payloadJson?.result || normal?.label || "—"}
                      </span>
                      {" · "}
                      CALL:{" "}
                      <span className="font-black">
                        {call?.payloadJson?.result || call?.label || "—"}
                      </span>
                    </p>
                    {conclusion ? (
                      <div className="mt-2 rounded border border-sky-100 bg-white/70 px-2 py-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                          Analysis
                        </p>
                        <p className="mt-0.5 font-black text-sky-950">{conclusion}</p>
                        {confidence != null ? (
                          <p className="mt-0.5 font-mono text-[11px] text-sky-800">
                            Confidence : {confidence}%
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {evidence.length ? (
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                          Evidence
                        </p>
                        <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                          {evidence.map((ev, i) => (
                            <li
                              key={ev.key || i}
                              className={ev.ok === false ? "text-rose-700" : "text-emerald-800"}
                            >
                              {ev.mark || (ev.ok === false ? "✘" : "✔")} {ev.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : p.analysisReport ? (
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-sky-900">
                        {p.analysisReport}
                      </pre>
                    ) : null}
                  </div>
                );
              })()}

              {session.failReason || events.some((e) => e.reason && (e.code === "ADD_VIEW_EXCEPTION" || e.code === "ADD_VIEW_FAIL" || (e.payloadJson && e.payloadJson.terminal))) ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
                  <p className="font-black">Reason</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {session.failReason ||
                      events.find((e) => e.code === "ADD_VIEW_EXCEPTION" || e.code === "ADD_VIEW_FAIL")?.reason ||
                      events.find((e) => e.reason)?.reason}
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

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-amber-900">
                  Companion BIG_PUSH Diagnosis
                </p>
                <p className="mt-1 text-[10px] text-amber-800">
                  HUN ≠ Companion BIG_PUSH · Probe Permission ≠ Incoming Gate Permission
                </p>
                {(() => {
                  const diag = overlay.companionBigPushDiagnosis;
                  if (!diag || typeof diag !== "object") {
                    return (
                      <p className="mt-2 text-[11px] text-slate-500">진단 스냅샷 없음 (세션 overlayStateJson)</p>
                    );
                  }
                  const checklist = diag.checklist || {};
                  const gates = diag.gates || {};
                  const pg = diag.permissionGate || {};
                  const current = pg.current && typeof pg.current === "object" ? pg.current : null;
                  const incomingGate = pg.incomingGate || {};
                  const showOverlayGate = pg.showOverlay || {};
                  const history = diag.permissionHistory || {};
                  const rows = [
                    ["Incoming Received", checklist.incomingReceived],
                    ["showOverlay Enter", checklist.showOverlayEnter],
                    ["BigPush Request", checklist.bigPushRequest],
                    ["BigPush Accepted", checklist.bigPushAccepted],
                    ["Attach Request", checklist.attachRequest],
                    ["AddView Begin", checklist.addViewBegin],
                    ["AddView Success", checklist.addViewSuccess],
                    ["Layout Applied", checklist.layoutApplied],
                    ["BigPush Visible", checklist.bigPushVisible],
                    ["System HUN Posted", checklist.systemHunPosted]
                  ];
                  const gateRows = [
                    ["Permission Gate", gates.permissionGate],
                    ["ShowOverlay Gate", gates.showOverlayGate],
                    ["BigPush Gate", gates.bigPushGate],
                    ["Attach Gate", gates.attachGate],
                    ["Visible", gates.visible]
                  ];
                  return (
                    <div className="mt-2 space-y-2 font-mono text-[11px] text-slate-800">
                      <div className="rounded border border-amber-300 bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-700">Permission Gate</p>
                        {current ? (
                          <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
                            <div>
                              canDrawOverlays:{" "}
                              <span className="font-black">
                                {String(current.canDrawOverlays ?? "—")}
                              </span>
                            </div>
                            <div>package: {String(current.packageName ?? "—")}</div>
                            <div>SDK: {String(current.sdkInt ?? "—")}</div>
                            <div>manufacturer: {String(current.manufacturer ?? "—")}</div>
                            <div>model: {String(current.model ?? "—")}</div>
                            <div>source: {String(current.source ?? "—")}</div>
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] text-slate-500">Permission check 없음</p>
                        )}
                        <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] sm:grid-cols-2">
                          <div>
                            Incoming Gate:{" "}
                            <span className="font-black">{String(incomingGate.status ?? "—")}</span>
                            {incomingGate.timestamp != null ? (
                              <span className="text-slate-500">
                                {" "}
                                · {new Date(Number(incomingGate.timestamp)).toISOString()}
                              </span>
                            ) : null}
                            {incomingGate.reason ? (
                              <span className="text-rose-700"> · {String(incomingGate.reason)}</span>
                            ) : null}
                          </div>
                          <div>
                            ShowOverlay:{" "}
                            <span className="font-black">{String(showOverlayGate.status ?? "—")}</span>
                            {showOverlayGate.reason && showOverlayGate.reason !== null ? (
                              <span className="text-rose-700"> · {String(showOverlayGate.reason)}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="rounded border border-slate-200 bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-600">Gates Summary</p>
                        <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {gateRows.map(([label, status]) => (
                            <div key={label}>
                              <span className="text-slate-500">{label}:</span>{" "}
                              <span className="font-black">{String(status ?? "—")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {rows.map(([label, status]) => (
                          <div key={label}>
                            <span className="text-slate-500">{label}:</span>{" "}
                            <span
                              className={
                                status === "PASS"
                                  ? "font-black text-emerald-800"
                                  : "font-black text-rose-800"
                              }
                            >
                              {String(status ?? "FAIL")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded border border-amber-200 bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-600">
                          Exact Breakpoint
                        </p>
                        <p className="mt-1 font-black text-rose-900">
                          {String(diag.exactBreakpoint ?? "—")}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          failureReason={String(diag.failureReason ?? "—")} · rejectReason=
                          {String(diag.rejectReason ?? "—")}
                        </p>
                      </div>
                      <details className="rounded border border-slate-200 bg-white px-2 py-1">
                        <summary className="cursor-pointer text-[10px] font-bold text-slate-700">
                          Permission History (Probe ≠ Incoming)
                        </summary>
                        <ul className="mt-1 max-h-40 space-y-1 overflow-auto text-[10px] text-slate-600">
                          {["INCOMING_GATE", "SHOW_OVERLAY_GATE", "ATTACH_GATE", "DIAGNOSTIC_PROBE"].map(
                            (src) => {
                              const row = history[src];
                              if (!row || typeof row !== "object") {
                                return (
                                  <li key={src}>
                                    {src}: <span className="text-slate-400">—</span>
                                  </li>
                                );
                              }
                              return (
                                <li key={src}>
                                  {src}: canDraw=
                                  <span className="font-black">{String(row.canDrawOverlays)}</span>
                                  {" · "}
                                  {row.timestamp != null
                                    ? new Date(Number(row.timestamp)).toISOString()
                                    : "—"}
                                  {row.result ? ` · ${row.result}` : ""}
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </details>
                      {diag.samsungEvidence ? (
                        <details className="rounded border border-slate-200 bg-white px-2 py-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-700">
                            Samsung / addView Evidence
                          </summary>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-slate-600">
                            {JSON.stringify(diag.samsungEvidence, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                      {Array.isArray(diag.events) && diag.events.length > 0 ? (
                        <details className="rounded border border-slate-200 bg-white px-2 py-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-700">
                            BIG_PUSH Event Log ({diag.events.length})
                          </summary>
                          <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                            {[...diag.events].reverse().map((ev, i) => (
                              <li key={`bp-${ev?.timestamp ?? i}-${i}`}>
                                {String(ev?.code ?? "?")}
                                {ev?.source ? ` · ${ev.source}` : ""}
                                {ev?.elapsedMs != null ? ` · +${ev.elapsedMs}ms` : ""}
                                {ev?.canDrawOverlays != null
                                  ? ` · canDraw=${ev.canDrawOverlays}`
                                  : ""}
                                {ev?.state ? ` · ${ev.state}` : ""}
                                {ev?.position ? `/${ev.position}` : ""}
                                {ev?.failureReason ? ` · ${ev.failureReason}` : ""}
                                {ev?.accepted === true
                                  ? " · accepted"
                                  : ev?.accepted === false
                                    ? " · rejected"
                                    : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-cyan-900">
                  Companion Runtime Stability
                </p>
                <p className="mt-1 text-[10px] text-cyan-800">
                  Phase 6-G · Latency / CallSession / Stale / UI Divergence (Native OverlayState SoT)
                </p>
                {(() => {
                  const rs = overlay.companionRuntimeStability;
                  if (!rs || typeof rs !== "object") {
                    return (
                      <p className="mt-2 text-[11px] text-slate-500">
                        런타임 안정성 스냅샷 없음 (세션 overlayStateJson)
                      </p>
                    );
                  }
                  const lat = rs.latency || {};
                  const life = rs.lifecycle || {};
                  const stale = rs.staleEvents || {};
                  const div = rs.uiDivergence || {};
                  const member = rs.memberLookup || {};
                  const top = Array.isArray(rs.topSlowSegments) ? rs.topSlowSegments : [];
                  const pg = overlay.companionBigPushDiagnosis?.permissionGate || {};
                  const hist = overlay.companionBigPushDiagnosis?.permissionHistory || {};
                  const gateVal = (src) => {
                    const row = hist[src];
                    if (!row || typeof row !== "object") return "—";
                    return String(row.canDrawOverlays);
                  };
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                        {[
                          ["Incoming→BigPush", lat.incomingToBigPushMs],
                          ["Answer→Showcase", lat.answerToShowcaseMs],
                          ["CallEnd→Gone", lat.callEndToOverlayGoneMs],
                          ["CallEnd→WebIdle", "—"]
                        ].map(([label, v]) => (
                          <div key={label} className="rounded border border-cyan-200 bg-white px-2 py-1">
                            <p className="text-[10px] text-slate-500">{label}</p>
                            <p className="font-black text-slate-900">
                              {v == null || v === "—" ? "—" : `${v}ms`}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded border border-cyan-200 bg-white px-2 py-2 font-mono text-[11px] text-slate-700">
                        <p>
                          CallSession:{" "}
                          <span className="font-black">{String(life.callSessionId ?? rs.callSessionId ?? "—")}</span>
                          {" · active="}
                          <span className="font-black">{String(life.active ?? rs.callSessionActive)}</span>
                        </p>
                        <p className="mt-1">
                          OverlayState: <span className="font-black">{String(overlay.overlayState ?? "—")}</span>
                          {" · Position: "}
                          <span className="font-black">{String(overlay.overlayPosition ?? "—")}</span>
                          {" · Attached: "}
                          <span className="font-black">{String(overlay.overlayAlreadyAttached ?? "—")}</span>
                        </p>
                        <p className="mt-1">
                          STALE: <span className="font-black">{String(stale.count ?? 0)}</span>
                          {" · UI_DIVERGENCE: "}
                          <span className="font-black">{String(div.count ?? 0)}</span>
                          {" · WINDOW: "}
                          <span className="font-black">
                            {overlay.overlayAlreadyAttached ? "1" : "0"}/1
                          </span>
                        </p>
                        <p className="mt-1">
                          MEMBER:{" "}
                          <span className="font-black">
                            {member.matched === true
                              ? "MATCH"
                              : member.matched === false
                                ? "MISS"
                                : String(member.phase ?? "—")}
                          </span>
                          {member.lookupElapsedMs != null ? ` · ${member.lookupElapsedMs}ms` : ""}
                          {member.maskedPhone ? ` · ${member.maskedPhone}` : ""}
                        </p>
                        <p className="mt-1">
                          PERMISSION: INCOMING={gateVal("INCOMING_GATE")} / SHOW=
                          {gateVal("SHOW_OVERLAY_GATE")} / ATTACH={gateVal("ATTACH_GATE")} / PROBE=
                          {gateVal("DIAGNOSTIC_PROBE")}
                          {pg.current?.canDrawOverlays != null
                            ? ` · current=${pg.current.canDrawOverlays}`
                            : ""}
                        </p>
                      </div>
                      {top.length > 0 ? (
                        <details className="rounded border border-cyan-200 bg-white px-2 py-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-700">
                            Top Slow Segments ({top.length})
                          </summary>
                          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                            {top.map((s, i) => (
                              <li key={`slow-${i}`}>
                                {String(s.from ?? "?")} → {String(s.to ?? "?")}:{" "}
                                <span className="font-black">{String(s.deltaMs)}ms</span>
                                {s.severity ? ` · ${s.severity}` : ""}
                                {s.threadName ? ` · ${s.threadName}` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {Array.isArray(stale.recent) && stale.recent.length > 0 ? (
                        <details className="rounded border border-cyan-200 bg-white px-2 py-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-700">
                            Recent Stale Events ({stale.recent.length})
                          </summary>
                          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                            {[...stale.recent].reverse().map((ev, i) => (
                              <li key={`stale-${i}`}>
                                {String(ev.event ?? "?")} · {String(ev.source ?? "")}
                                {ev.elapsedSinceCallEndMs != null
                                  ? ` · +${ev.elapsedSinceCallEndMs}ms after end`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Companion Overlay
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 sm:grid-cols-3">
                  {[
                    "overlayState",
                    "overlayPosition",
                    "screenState",
                    "miniCaseVisibility",
                    "overlayContext",
                    "lastTransition",
                    "rejectedTransition"
                  ].map((k) => (
                    <div key={k}>
                      <span className="text-slate-400">{k}:</span>{" "}
                      <span className="font-bold">{String(overlay[k] ?? "—")}</span>
                    </div>
                  ))}
                </div>
                {(() => {
                  const sec = overlay.securityAuditReport;
                  if (!sec || typeof sec !== "object") return null;
                  const summary = sec.summary || {};
                  const section = (title, key) => {
                    const rows = Array.isArray(sec[key]) ? sec[key] : [];
                    if (!rows.length) return null;
                    return (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] font-bold text-slate-800">
                          {title} ({rows.length})
                        </summary>
                        <ul className="mt-1 max-h-36 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                          {rows.map((f, i) => (
                            <li
                              key={`${key}-${f?.id ?? i}`}
                              className={
                                f?.severity === "RISK"
                                  ? "text-rose-800"
                                  : f?.severity === "REVIEW"
                                    ? "text-amber-800"
                                    : f?.severity === "OK"
                                      ? "text-emerald-800"
                                      : ""
                              }
                            >
                              [{String(f?.severity ?? "?")}] {String(f?.title ?? f?.id ?? "?")}
                              {f?.detail ? ` — ${String(f.detail)}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    );
                  };
                  return (
                    <div className="mt-3 rounded border border-slate-300 bg-white px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-slate-800">
                        Security Audit Report
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        total={String(summary.total ?? "—")} · risk=
                        <span className="font-bold text-rose-800">{String(summary.risk ?? 0)}</span> ·
                        review=
                        <span className="font-bold text-amber-800">{String(summary.review ?? 0)}</span> ·
                        ok={String(summary.ok ?? 0)}
                      </p>
                      {section("Manifest Risks", "manifestRisks")}
                      {section("Intent Security", "intentSecurity")}
                      {section("Overlay Security", "overlaySecurity")}
                      <p className="mt-2 text-[10px] font-black uppercase text-slate-800">
                        Privacy Report
                      </p>
                      {section("Privacy", "privacyReport")}
                      <p className="mt-2 text-[10px] font-black uppercase text-slate-800">
                        Release Checklist
                      </p>
                      {section("Release", "releaseChecklist")}
                      {section("Store Readiness", "storeReadiness")}
                    </div>
                  );
                })()}
                {(() => {
                  const dash = overlay.recoveryDashboard;
                  if (!dash || typeof dash !== "object") return null;
                  const timeline = Array.isArray(dash.recoveryTimeline) ? dash.recoveryTimeline : [];
                  const cases = Array.isArray(dash.recoveryCaseResults) ? dash.recoveryCaseResults : [];
                  const memCb = Array.isArray(dash.memoryCallbackHistory)
                    ? dash.memoryCallbackHistory
                    : [];
                  const life = Array.isArray(dash.serviceLifecycle) ? dash.serviceLifecycle : [];
                  const last = dash.lastRecoveryCase;
                  const rate =
                    dash.recoverySuccessRate != null
                      ? `${(Number(dash.recoverySuccessRate) * 100).toFixed(0)}%`
                      : "—";
                  return (
                    <div className="mt-3 rounded border border-orange-100 bg-orange-50/50 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-orange-900">
                        Recovery Panel
                      </p>
                      <p className="mt-1">
                        Success Rate: <span className="font-bold">{rate}</span> · attempts=
                        {String(dash.recoveryAttemptCount ?? 0)} · success=
                        {String(dash.recoverySuccessCount ?? 0)}
                        {last && typeof last === "object" ? (
                          <span className="ml-2">
                            Last:{" "}
                            <span
                              className={
                                last.passed === true || last.verdict === "PASS"
                                  ? "font-bold text-emerald-800"
                                  : "font-bold text-rose-800"
                              }
                            >
                              {String(last.verdict ?? "—")} {String(last.caseName ?? last.caseId ?? "")}
                            </span>
                          </span>
                        ) : null}
                      </p>
                      {timeline.length ? (
                        <div className="mt-2 max-h-40 overflow-auto rounded border border-orange-100 bg-white px-2 py-2">
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Recovery Timeline ({timeline.length})
                          </p>
                          <ul className="mt-1 space-y-1 text-[10px] text-slate-600">
                            {[...timeline].slice(-20).reverse().map((ev, i) => (
                              <li
                                key={`rec-${ev?.timestamp ?? i}-${i}`}
                                className={
                                  ev?.recoverySuccess === false ? "text-rose-800" : ""
                                }
                              >
                                {String(ev?.recoveryEvent ?? "?")} · expected=
                                {String(ev?.expectedState ?? "—")} · recovered=
                                {String(ev?.recoveredState ?? "—")} ·{" "}
                                {ev?.recoveryTimeMs != null ? `${ev.recoveryTimeMs}ms` : "—"} ·{" "}
                                {ev?.recoverySuccess === true
                                  ? "OK"
                                  : ev?.recoverySuccess === false
                                    ? "FAIL"
                                    : "—"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {memCb.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[10px] font-bold text-orange-900">
                            Memory Callback History ({memCb.length})
                          </summary>
                          <ul className="mt-1 max-h-28 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                            {[...memCb].reverse().map((ev, i) => (
                              <li key={`mcb-${i}`}>
                                {String(ev?.kind ?? "?")}
                                {ev?.levelName ? ` · ${String(ev.levelName)}` : ""}
                                {ev?.level != null ? ` (${ev.level})` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {life.length ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-orange-900">
                            Service Lifecycle ({life.length})
                          </summary>
                          <ul className="mt-1 max-h-28 space-y-0.5 overflow-auto text-[10px] text-slate-600">
                            {[...life].reverse().map((ev, i) => (
                              <li key={`sl-${i}`}>
                                {String(ev?.event ?? "?")}
                                {ev?.detail ? ` · ${String(ev.detail)}` : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {cases.length > 1 ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-orange-900">
                            All recovery cases ({cases.length})
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-[10px]">
                            {[...cases].reverse().map((c, i) => (
                              <li key={`rc-${c?.caseId ?? i}`}>
                                {String(c?.verdict ?? "?")} · {String(c?.caseName ?? c?.caseId)}
                                {c?.stateLeak ? " · stateLeak" : ""}
                                {c?.windowLeak ? " · windowLeak" : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  );
                })()}
                {(() => {
                  const dash = overlay.performanceDashboard;
                  if (!dash || typeof dash !== "object") return null;
                  const perf = dash.performance || {};
                  const mem = dash.memory || {};
                  const cpu = dash.cpu || {};
                  const bat = dash.battery || {};
                  const render = dash.rendering || {};
                  const pass = dash.pass || {};
                  const cpuEvents = ["INCOMING", "ANSWER", "MINI", "RESTORE", "CALL_END"];
                  return (
                    <div className="mt-3 rounded border border-emerald-100 bg-emerald-50/40 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-emerald-900">
                        Performance Dashboard
                      </p>
                      <p className="mt-1">
                        Verdict:{" "}
                        <span
                          className={
                            pass.passed === true || pass.verdict === "PASS"
                              ? "font-bold text-emerald-800"
                              : "font-bold text-rose-800"
                          }
                        >
                          {String(pass.verdict ?? "—")}
                        </span>
                        <span className="ml-2 text-slate-500">
                          attach&lt;{String(pass.kpiOverlayAttachMs ?? 200)}ms · answer→showcase&lt;
                          {String(pass.kpiAnswerToShowcaseMs ?? 500)}ms · window≤1 · no leak
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-400">Attach:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.overlayAttachMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Layout Commit:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.layoutCommitMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">WebView Ready:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.webViewReadyMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">JS Bridge:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.jsBridgeCallMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Controller:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.controllerProcessingMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">updateViewLayout:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.updateViewLayoutMs)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Frame Commit:</span>{" "}
                          <span className="font-bold">{fmtMs(perf.frameCommitMs)}</span>
                        </div>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[10px] font-bold text-emerald-900">
                          Memory
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                          <li>Overlay Memory: {String(mem.overlayMemoryBytes ?? "—")} B</li>
                          <li>WebView Memory: {String(mem.webViewMemoryBytes ?? "—")} B</li>
                          <li>Bitmap: {String(mem.bitmapBytes ?? "—")} B</li>
                          <li>View Count: {String(mem.viewCount ?? "—")}</li>
                          <li>Window Count: {String(mem.windowCount ?? "—")}</li>
                          <li>GC: {String(mem.gcCount ?? "—")}</li>
                          <li>
                            Leak:{" "}
                            <span className={mem.leakDetected ? "text-rose-800" : "text-emerald-800"}>
                              {String(mem.leakDetected ?? "—")}
                            </span>
                          </li>
                        </ul>
                      </details>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] font-bold text-emerald-900">
                          CPU
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                          {cpuEvents.map((ev) => {
                            const row = cpu[ev];
                            if (!row || typeof row !== "object") {
                              return (
                                <li key={ev}>
                                  {ev}: —
                                </li>
                              );
                            }
                            return (
                              <li key={ev}>
                                {ev}: last={fmtMs(row.lastMs)} · avg={fmtMs(row.avgMs)} · n=
                                {String(row.count ?? 0)}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] font-bold text-emerald-900">
                          Battery
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                          <li>FGS duration: {fmtMs(bat.foregroundServiceDurationMs)}</li>
                          <li>WakeLock: {String(bat.wakeLockHeld ?? "—")}</li>
                          <li>Screen ON: {String(bat.screenOn ?? "—")}</li>
                          <li>Overlay alive: {fmtMs(bat.overlayAliveDurationMs)}</li>
                          <li>Cost score: {String(bat.estimatedBatteryCostScore ?? "—")}</li>
                        </ul>
                      </details>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[10px] font-bold text-emerald-900">
                          Rendering
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                          <li>Dropped Frame: {String(render.droppedFrames ?? "—")}</li>
                          <li>Jank: {String(render.jankCount ?? "—")}</li>
                          <li>Skipped Frame: {String(render.skippedFrames ?? "—")}</li>
                          <li>Animation Time: {fmtMs(render.animationTimeMs)}</li>
                          <li>Layout Pass: {String(render.layoutPassCount ?? "—")}</li>
                          <li>Measure: {String(render.measureCount ?? "—")}</li>
                        </ul>
                      </details>
                    </div>
                  );
                })()}
                {(() => {
                  const oem = overlay.oemDeviceInfo;
                  const compat = overlay.deviceCompatibility;
                  const samsung = overlay.samsungCompatibilityAudit;
                  const oneUi = overlay.oneUiCallFlowResult;
                  if (!oem && !compat && !samsung) return null;
                  const source = compat && typeof compat === "object" ? compat : oem;
                  const restrictions = Array.isArray(source?.knownRestrictions)
                    ? source.knownRestrictions
                    : Array.isArray(oem?.knownRestrictions)
                      ? oem.knownRestrictions
                      : [];
                  const checklist = Array.isArray(samsung?.checklist) ? samsung.checklist : [];
                  const attach = samsung?.attachAudit;
                  const layout = samsung?.layoutAudit;
                  return (
                    <div className="mt-3 rounded border border-sky-100 bg-sky-50/50 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-sky-900">
                        Device Compatibility
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-400">Manufacturer:</span>{" "}
                          <span className="font-bold">
                            {String(source?.manufacturer ?? oem?.manufacturer ?? "—")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Brand:</span>{" "}
                          <span className="font-bold">
                            {String(source?.brand ?? oem?.brand ?? "—")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">SDK:</span>{" "}
                          <span className="font-bold">
                            {String(source?.sdkInt ?? oem?.sdkInt ?? "—")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">OEM Family:</span>{" "}
                          <span className="font-bold">
                            {String(source?.oemFamily ?? oem?.oemFamily ?? "—")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Overlay Permission:</span>{" "}
                          <span className="font-bold">
                            {String(
                              source?.overlayPermission ?? oem?.overlayPermission ?? "—"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Battery Optimization:</span>{" "}
                          <span className="font-bold">
                            {String(
                              source?.batteryOptimizationIgnored ??
                                oem?.batteryOptimizationIgnored ??
                                "—"
                            )}
                          </span>
                        </div>
                      </div>
                      {restrictions.length ? (
                        <div className="mt-2">
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Known Restriction
                          </p>
                          <ul className="mt-1 max-h-36 space-y-1 overflow-auto text-[10px] text-slate-600">
                            {restrictions.map((r, i) => (
                              <li key={r?.id ?? i}>
                                <span className="font-bold">{String(r?.title ?? r?.id ?? "?")}</span>
                                {r?.detail ? ` — ${String(r.detail)}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {checklist.length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[10px] font-bold text-sky-900">
                            Samsung Compatibility Checklist ({checklist.length})
                          </summary>
                          <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto text-[10px]">
                            {checklist.map((c, i) => (
                              <li key={c?.id ?? i}>
                                [{String(c?.status ?? "?")}] {String(c?.id ?? "?")} —{" "}
                                {String(c?.detail ?? "")}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {attach && typeof attach === "object" ? (
                        <p className="mt-2 text-[10px] text-slate-600">
                          Attach Audit · successRate=
                          {attach.attachSuccessRate != null
                            ? String(attach.attachSuccessRate)
                            : "—"}{" "}
                          · failRate=
                          {attach.attachFailRate != null ? String(attach.attachFailRate) : "—"} ·
                          badToken={String(attach.badTokenCount ?? 0)} · oemReject=
                          {String(attach.oemRejectCount ?? 0)} · permissionReject=
                          {String(attach.permissionRejectCount ?? 0)}
                        </p>
                      ) : null}
                      {layout && typeof layout === "object" ? (
                        <p className="mt-1 text-[10px] text-slate-600">
                          Layout Audit · applied={String(layout.layoutAppliedCount ?? 0)} · failed=
                          {String(layout.layoutFailedCount ?? 0)} · allOk=
                          {String(layout.allLayoutsObservedOk ?? "—")}
                        </p>
                      ) : null}
                      {oneUi && typeof oneUi === "object" ? (
                        <p className="mt-1 text-[10px]">
                          OneUI Call Flow:{" "}
                          <span
                            className={
                              oneUi.passed === true || oneUi.verdict === "PASS"
                                ? "font-bold text-emerald-800"
                                : "font-bold text-rose-800"
                            }
                          >
                            {String(oneUi.verdict ?? "—")}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
                {(() => {
                  const oem = overlay.oemDeviceInfo;
                  if (!oem || typeof oem !== "object") return null;
                  return (
                    <div className="mt-3 rounded border border-slate-100 bg-slate-50 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-slate-500">Device Info</p>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                        {[
                          ["manufacturer", "Manufacturer"],
                          ["brand", "Brand"],
                          ["model", "Model"],
                          ["sdkInt", "SDK_INT"],
                          ["overlayPermission", "Overlay Permission"],
                          ["batteryOptimizationIgnored", "Battery Optimization Ignored"],
                          ["roleDialer", "ROLE_DIALER"]
                        ].map(([k, label]) => (
                          <div key={k}>
                            <span className="text-slate-400">{label}:</span>{" "}
                            <span className="font-bold">{String(oem[k] ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const rel = overlay.overlayReliability;
                  const lastFail = overlay.lastOverlayFailure;
                  return (
                    <div className="mt-3 rounded border border-rose-100 bg-rose-50/60 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-rose-700">Failure / Rates</p>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                        <div>
                          <span className="text-slate-400">Failure Count:</span>{" "}
                          <span className="font-bold">
                            {rel?.failureCount != null ? String(rel.failureCount) : "0"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Attach Success Rate:</span>{" "}
                          <span className="font-bold">
                            {rel?.attachSuccessRate != null
                              ? `${(Number(rel.attachSuccessRate) * 100).toFixed(0)}%`
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Layout Success Rate:</span>{" "}
                          <span className="font-bold">
                            {rel?.layoutSuccessRate != null
                              ? `${(Number(rel.layoutSuccessRate) * 100).toFixed(0)}%`
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Overlay Success Rate:</span>{" "}
                          <span className="font-bold">
                            {rel?.overlaySuccessRate != null
                              ? `${(Number(rel.overlaySuccessRate) * 100).toFixed(0)}%`
                              : "—"}
                          </span>
                        </div>
                      </div>
                      {lastFail && typeof lastFail === "object" ? (
                        <p className="mt-2 text-rose-900">
                          <span className="text-slate-400">Last Failure:</span>{" "}
                          <span className="font-bold">{String(lastFail.failureReason ?? "—")}</span>
                          {" · "}
                          phase={String(lastFail.phase ?? "—")}
                          {lastFail.detail ? ` · ${String(lastFail.detail)}` : ""}
                        </p>
                      ) : (
                        <p className="mt-2 text-slate-500">Last Failure: —</p>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  const last = overlay.lastOverlayTransition;
                  if (!last || typeof last !== "object") return null;
                  return (
                    <div className="mt-3 rounded border border-slate-100 bg-slate-50 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-slate-500">Last Transition</p>
                      <p className="mt-1">
                        <span className="font-bold">
                          {String(last.previousState ?? "—")} → {String(last.nextState ?? "—")}
                        </span>
                      </p>
                      <p className="text-slate-500">
                        trigger={String(last.triggerEvent ?? "—")} · elapsedMs=
                        {last.elapsedMs != null ? String(last.elapsedMs) : "—"} · userAction=
                        {String(last.userAction ?? false)}
                      </p>
                    </div>
                  );
                })()}
                {(() => {
                  const kpi = overlay.companionKpi;
                  if (!kpi || typeof kpi !== "object") return null;
                  return (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 sm:grid-cols-3">
                      {[
                        "answerToShowcaseMs",
                        "incomingToBigPushMs",
                        "bigPushToShowcaseMs",
                        "kpiAnswerToShowcaseMs",
                        "kpiAnswerToShowcasePass"
                      ].map((k) =>
                        kpi[k] == null ? null : (
                          <div key={k}>
                            <span className="text-slate-400">{k}:</span>{" "}
                            <span className="font-bold">{String(kpi[k])}</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })()}
                {Array.isArray(overlay.overlayTransitions) && overlay.overlayTransitions.length > 0 ? (
                  <div className="mt-3 max-h-48 overflow-auto rounded border border-slate-100 bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      Recent Timeline ({overlay.overlayTransitions.length})
                    </p>
                    <ul className="mt-1 space-y-1 font-mono text-[10px] text-slate-600">
                      {[...overlay.overlayTransitions].reverse().map((ev, i) => (
                        <li key={`${ev?.timestamp ?? i}-${i}`}>
                          {String(ev?.previousState ?? "?")}→{String(ev?.nextState ?? "?")} ·{" "}
                          {String(ev?.triggerEvent ?? "—")} · {String(ev?.elapsedMs ?? "—")}ms · pos=
                          {String(ev?.overlayPosition ?? "—")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(overlay.overlayFailures) && overlay.overlayFailures.length > 0 ? (
                  <div className="mt-3 max-h-48 overflow-auto rounded border border-rose-100 bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-rose-700">
                      Recent Failure Timeline ({overlay.overlayFailures.length})
                    </p>
                    <ul className="mt-1 space-y-1 font-mono text-[10px] text-rose-900">
                      {[...overlay.overlayFailures].reverse().map((ev, i) => (
                        <li key={`fail-${ev?.timestamp ?? i}-${i}`}>
                          {String(ev?.failureReason ?? "?")} · {String(ev?.phase ?? "—")}
                          {ev?.detail ? ` · ${String(ev.detail)}` : ""}
                          {ev?.overlayState ? ` · state=${String(ev.overlayState)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(overlay.attachTimeline) && overlay.attachTimeline.length > 0 ? (
                  <div className="mt-3 max-h-40 overflow-auto rounded border border-slate-100 bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      Attach Timeline ({overlay.attachTimeline.length})
                    </p>
                    <ul className="mt-1 space-y-1 font-mono text-[10px] text-slate-600">
                      {[...overlay.attachTimeline].reverse().map((ev, i) => (
                        <li key={`att-${ev?.timestamp ?? i}-${i}`}>
                          {String(ev?.step ?? "?")}
                          {ev?.failureReason ? ` · ${String(ev.failureReason)}` : ""}
                          {ev?.elapsedMs != null ? ` · ${String(ev.elapsedMs)}ms` : ""}
                          {ev?.phase ? ` · ${String(ev.phase)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(overlay.layoutTimeline) && overlay.layoutTimeline.length > 0 ? (
                  <div className="mt-3 max-h-40 overflow-auto rounded border border-slate-100 bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      Layout Timeline ({overlay.layoutTimeline.length})
                    </p>
                    <ul className="mt-1 space-y-1 font-mono text-[10px] text-slate-600">
                      {[...overlay.layoutTimeline].reverse().map((ev, i) => (
                        <li key={`lay-${ev?.timestamp ?? i}-${i}`}>
                          {String(ev?.step ?? "?")}
                          {ev?.result ? ` → ${String(ev.result)}` : ""}
                          {ev?.failureReason ? ` · ${String(ev.failureReason)}` : ""}
                          {ev?.position ? ` · pos=${String(ev.position)}` : ""}
                          {ev?.elapsedMs != null ? ` · ${String(ev.elapsedMs)}ms` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(() => {
                  const scenarios = Array.isArray(overlay.scenarioResults)
                    ? overlay.scenarioResults
                    : [];
                  const lastSc = overlay.lastScenarioResult;
                  if (!lastSc && !scenarios.length) return null;
                  const shown = lastSc && typeof lastSc === "object" ? lastSc : scenarios[scenarios.length - 1];
                  if (!shown || typeof shown !== "object") return null;
                  const timeline = Array.isArray(shown.timeline) ? shown.timeline : [];
                  const stateFlow = Array.isArray(shown.stateFlow) ? shown.stateFlow : [];
                  const kpi = shown.kpi && typeof shown.kpi === "object" ? shown.kpi : {};
                  const pass = shown.passed === true || shown.verdict === "PASS";
                  return (
                    <div className="mt-3 rounded border border-indigo-100 bg-indigo-50/50 px-2 py-2 font-mono text-[11px] text-slate-700">
                      <p className="text-[10px] font-black uppercase text-indigo-800">
                        Scenario Viewer
                      </p>
                      <p className="mt-1">
                        <span className="text-slate-400">Scenario Name:</span>{" "}
                        <span className="font-bold">{String(shown.scenarioName ?? shown.scenarioId ?? "—")}</span>
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-black ${
                            pass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {String(shown.verdict ?? (pass ? "PASS" : "FAIL"))}
                        </span>
                      </p>
                      <p className="text-slate-500">
                        unexpectedState={String(shown.unexpectedStateCount ?? "—")} · failureCount=
                        {String(shown.failureCount ?? "—")} · totalElapsedMs=
                        {shown.totalElapsedMs != null ? String(shown.totalElapsedMs) : "—"}
                      </p>
                      {shown.missingTransitionHint ? (
                        <p className="mt-1 text-rose-800">
                          Missing/Unexpected: {String(shown.missingTransitionHint)}
                        </p>
                      ) : null}
                      {stateFlow.length ? (
                        <div className="mt-2">
                          <p className="text-[10px] font-black uppercase text-slate-500">State Flow</p>
                          <p className="mt-0.5 break-all text-[10px] text-slate-600">
                            {stateFlow.map(String).join(" → ")}
                          </p>
                        </div>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
                        <div>
                          <span className="text-slate-400">KPI steps:</span>{" "}
                          <span className="font-bold">{String(kpi.stepCount ?? "—")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">pass:</span>{" "}
                          <span className="font-bold">{String(kpi.passCount ?? "—")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">fail:</span>{" "}
                          <span className="font-bold">{String(kpi.failCount ?? "—")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">elapsed:</span>{" "}
                          <span className="font-bold">
                            {kpi.totalElapsedMs != null ? `${kpi.totalElapsedMs}ms` : "—"}
                          </span>
                        </div>
                      </div>
                      {timeline.length ? (
                        <div className="mt-2 max-h-48 overflow-auto rounded border border-indigo-100 bg-white px-2 py-2">
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Timeline ({timeline.length})
                          </p>
                          <ul className="mt-1 space-y-1 font-mono text-[10px] text-slate-600">
                            {timeline.map((st, i) => {
                              const stepFail = st?.verdict === "FAIL";
                              return (
                                <li
                                  key={`sc-${st?.index ?? i}`}
                                  className={stepFail ? "text-rose-800" : ""}
                                >
                                  [{String(st?.verdict ?? "?")}] {String(st?.event ?? "?")} · state=
                                  {String(st?.actual?.overlayState ?? "—")} · pos=
                                  {String(st?.actual?.overlayPosition ?? "—")} · mini=
                                  {String(st?.actual?.miniCaseVisibility ?? "—")} · screen=
                                  {String(st?.actual?.screenState ?? "—")} · failReason=
                                  {String(st?.actual?.failureReason ?? "—")} ·{" "}
                                  {st?.elapsedMs != null ? `${st.elapsedMs}ms` : "—"}
                                  {Array.isArray(st?.failReasons) && st.failReasons.length
                                    ? ` · ${st.failReasons.join("; ")}`
                                    : ""}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                      {scenarios.length > 1 ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[10px] font-bold text-indigo-800">
                            All scenario runs ({scenarios.length})
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                            {[...scenarios].reverse().map((s, i) => (
                              <li key={`all-sc-${s?.scenarioId ?? i}-${i}`}>
                                {String(s?.verdict ?? "?")} · {String(s?.scenarioName ?? s?.scenarioId ?? "—")}
                                {s?.unexpectedStateCount
                                  ? ` · unexpected=${s.unexpectedStateCount}`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  );
                })()}
                {(() => {
                  const lastEx = overlay.lastExceptionCase;
                  const exCases = Array.isArray(overlay.exceptionCaseResults)
                    ? overlay.exceptionCaseResults
                    : [];
                  const exTimeline = Array.isArray(overlay.exceptionTimeline)
                    ? overlay.exceptionTimeline
                    : [];
                  const stress = overlay.lastStressResult;
                  const stressTl = Array.isArray(overlay.stressTimeline)
                    ? overlay.stressTimeline
                    : [];
                  const mem = overlay.memorySummary;
                  const matrix = overlay.failureMatrix;
                  if (!lastEx && !exCases.length && !stress && !mem && !matrix) return null;
                  return (
                    <div className="mt-3 space-y-3">
                      {(lastEx || exCases.length > 0) && (
                        <div className="rounded border border-amber-100 bg-amber-50/60 px-2 py-2 font-mono text-[11px] text-slate-700">
                          <p className="text-[10px] font-black uppercase text-amber-900">
                            Exception Timeline
                          </p>
                          {lastEx && typeof lastEx === "object" ? (
                            <p className="mt-1">
                              <span className="font-bold">
                                {String(lastEx.caseName ?? lastEx.caseId ?? "—")}
                              </span>
                              <span
                                className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-black ${
                                  lastEx.passed === true || lastEx.verdict === "PASS"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {String(lastEx.verdict ?? "—")}
                              </span>
                              {lastEx.hint ? (
                                <span className="ml-2 text-rose-800">{String(lastEx.hint)}</span>
                              ) : null}
                            </p>
                          ) : null}
                          {exTimeline.length ? (
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-[10px] text-slate-600">
                              {[...exTimeline].slice(-16).reverse().map((ev, i) => (
                                <li key={`ex-${ev?.index ?? i}-${i}`}>
                                  {String(ev?.event ?? ev?.eventType ?? "?")} ·{" "}
                                  {String(ev?.verdict ?? ev?.overlayState ?? "—")}
                                  {ev?.actual?.failureReason
                                    ? ` · ${String(ev.actual.failureReason)}`
                                    : ""}
                                  {ev?.elapsedMs != null ? ` · ${ev.elapsedMs}ms` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {exCases.length > 1 ? (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-[10px] font-bold text-amber-900">
                                All exception cases ({exCases.length})
                              </summary>
                              <ul className="mt-1 space-y-0.5 text-[10px]">
                                {[...exCases].reverse().map((c, i) => (
                                  <li key={`exc-${c?.caseId ?? i}`}>
                                    {String(c?.verdict ?? "?")} · {String(c?.caseName ?? c?.caseId)}
                                    {c?.stateLeak ? " · stateLeak" : ""}
                                    {c?.overlayLeak ? " · overlayLeak" : ""}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </div>
                      )}
                      {stress && typeof stress === "object" ? (
                        <div className="rounded border border-teal-100 bg-teal-50/60 px-2 py-2 font-mono text-[11px] text-slate-700">
                          <p className="text-[10px] font-black uppercase text-teal-900">
                            Stress Timeline
                          </p>
                          <p className="mt-1">
                            cycles={String(stress.completedCycles ?? stress.cycles ?? "—")} ·{" "}
                            <span
                              className={
                                stress.passed === true || stress.verdict === "PASS"
                                  ? "font-bold text-emerald-800"
                                  : "font-bold text-rose-800"
                              }
                            >
                              {String(stress.verdict ?? "—")}
                            </span>
                            {" · "}attach={String(stress.attachCount ?? "—")} remove=
                            {String(stress.removeCount ?? "—")} · final=
                            {String(stress.finalState ?? "—")}
                          </p>
                          <p className="text-slate-500">
                            stateLeak={String(stress.stateLeak ?? false)} · overlayLeak=
                            {String(stress.overlayLeak ?? false)} · windowDuplicate=
                            {String(stress.windowDuplicate ?? false)} · unexpected=
                            {String(stress.unexpectedTransitionCount ?? 0)}
                          </p>
                          {stressTl.length ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] font-bold text-teal-900">
                                Cycles ({stressTl.length})
                              </summary>
                              <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto text-[10px]">
                                {stressTl.slice(-20).map((c, i) => (
                                  <li key={`st-${c?.cycle ?? i}`}>
                                    #{String(c?.cycle ?? i)} state={String(c?.state ?? "—")} ·
                                    attached={String(c?.attached ?? "—")} ·{" "}
                                    {c?.elapsedMs != null ? `${c.elapsedMs}ms` : ""}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                      {mem && typeof mem === "object" ? (
                        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-2 font-mono text-[11px] text-slate-700">
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Memory Summary
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                            <div>
                              Attach Count:{" "}
                              <span className="font-bold">
                                {String(mem.overlayAttachCount ?? "—")}
                              </span>
                            </div>
                            <div>
                              Remove Count:{" "}
                              <span className="font-bold">
                                {String(mem.overlayRemoveCount ?? "—")}
                              </span>
                            </div>
                            <div>
                              Window Attached Count:{" "}
                              <span className="font-bold">
                                {String(mem.windowAttachedCount ?? "—")}
                              </span>
                            </div>
                            <div>
                              Attached Now:{" "}
                              <span className="font-bold">
                                {String(mem.windowAttachedNow ?? "—")}
                              </span>
                            </div>
                            <div>
                              Leak:{" "}
                              <span
                                className={
                                  mem.leak ? "font-bold text-rose-800" : "font-bold text-emerald-800"
                                }
                              >
                                {String(mem.leak ?? "—")}
                              </span>
                            </div>
                            <div>
                              Verdict:{" "}
                              <span className="font-bold">{String(mem.verdict ?? "—")}</span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {matrix && typeof matrix === "object" ? (
                        <div className="rounded border border-rose-100 bg-rose-50/50 px-2 py-2 font-mono text-[11px] text-slate-700">
                          <p className="text-[10px] font-black uppercase text-rose-800">
                            Failure Matrix
                          </p>
                          <p className="mt-1">
                            totalFailures={String(matrix.totalFailures ?? 0)}
                          </p>
                          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] sm:grid-cols-3">
                            {Object.keys(matrix)
                              .filter((k) => k !== "totalFailures")
                              .map((k) => (
                                <li key={k}>
                                  {k}: <span className="font-bold">{String(matrix[k])}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-slate-500">Overlay / LayoutParams</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 sm:grid-cols-3">
                  {[
                    "overlayState",
                    "overlayContext",
                    "overlayPosition",
                    "overlayInstanceId",
                    "showOverlayCount",
                    "addViewCount",
                    "removeViewCount",
                    "overlayCreateCountInSession",
                    "overlayAlreadyAttached",
                    "foregroundStartedAtMs",
                    "foregroundEndedAtMs",
                    "lastStopSelfAtMs",
                    "lastOnDestroyAtMs",
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
                    "windowToken",
                    "rootViewHashCode",
                    "parent",
                    "isAttachedToWindow",
                    "isShown",
                    "measuredWidth",
                    "measuredHeight",
                    "actualWidth",
                    "actualHeight",
                    "windowVisibility",
                    "displayId",
                    "currentActivity",
                    "topPackage",
                    "layoutParamsToken",
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

function fmtMs(v) {
  if (v === undefined || v === null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `${Math.round(n * 100) / 100}ms`;
}

function uniqueSeqs(events) {
  const map = new Map();
  for (const e of events || []) {
    if (!map.has(e.seq)) map.set(e.seq, { seq: e.seq, short: e.label || e.code });
  }
  return [...map.values()].sort((a, b) => a.seq - b.seq);
}
