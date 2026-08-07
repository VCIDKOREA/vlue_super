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

              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Companion Overlay
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 sm:grid-cols-3">
                  {["overlayState", "overlayContext", "overlayPosition", "lastTransition", "rejectedTransition"].map(
                    (k) => (
                      <div key={k}>
                        <span className="text-slate-400">{k}:</span>{" "}
                        <span className="font-bold">{String(overlay[k] ?? "—")}</span>
                      </div>
                    )
                  )}
                </div>
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

function uniqueSeqs(events) {
  const map = new Map();
  for (const e of events || []) {
    if (!map.has(e.seq)) map.set(e.seq, { seq: e.seq, short: e.label || e.code });
  }
  return [...map.values()].sort((a, b) => a.seq - b.seq);
}
