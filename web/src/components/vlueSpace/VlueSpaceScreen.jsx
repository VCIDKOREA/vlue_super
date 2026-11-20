import { useEffect, useMemo, useState } from "react";
import {
  configReady,
  DEFAULT_SPACE_CONFIG,
  PALETTE_LABEL,
  PALETTES,
  GUIDANCE_LABEL,
  STABILITY_LABEL,
  STABILITY_LEVELS,
  SUPPRESS_LABEL,
  SUPPRESS_LEVELS
} from "../../lib/vlueSpace/spaceConfig.js";
import { readSpaceAuth } from "../../lib/vlueSpace/spaceSession.js";
import { useSpaceScan } from "./useSpaceScan.js";

const JUDGMENT = "탐지 결과는 현장 판단을 돕는 보조 수단이며, 최종 확인과 판단의 주체는 사용자에게 있습니다.";
const PORTRAIT = "스캔·캡처·녹화 중 타인(인물)이 포함될 수 있으며, 동의 없는 무단 배포·공유 시 초상권 주장 등 법적 분쟁과 피해가 발생할 수 있습니다. 현장 점검 목적 외 외부 공유를 삼가 주십시오.";
const SHUTTER = "OS 및 기기 정책에 따라 무음 상태에서도 캡처·녹화 시 소리(셔터음/알림음)가 발생할 수 있습니다.";

function Choice({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-lg border px-3 py-2.5 text-left text-[13px] font-bold leading-snug break-keep ${
        active ? "border-cyan-300 bg-cyan-300/15 text-cyan-50" : "border-white/15 text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function VlueSpaceScreen({ open, onClose }) {
  const [config, setConfig] = useState(DEFAULT_SPACE_CONFIG);
  const [auth, setAuth] = useState(() => readSpaceAuth());
  const [running, setRunning] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const scan = useSpaceScan(config, running && open);

  useEffect(() => {
    const sync = () => setAuth(readSpaceAuth());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (open) return undefined;
    setRunning(false);
    return undefined;
  }, [open]);

  const closedLocked = config.mode === "closed" && !auth.closedAllowed;
  const canStart = configReady(config) && !closedLocked;
  const hotspot = scan.reading.hotspot;
  const reticle = useMemo(() => {
    if (!hotspot) return { left: "50%", top: "46%" };
    return { left: `${hotspot.nx * 100}%`, top: `${hotspot.ny * 100}%` };
  }, [hotspot]);

  if (!open) return null;

  const setField = (key, value) => {
    if (key === "mode") {
      setRunning(false);
      scan.stop();
    }
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const leave = () => {
    setRunning(false);
    scan.stop();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[230] flex bg-[#05080d] text-slate-100" role="dialog" aria-modal="true" aria-label="VLUE SPACE">
      <video ref={scan.videoRef} className="hidden" playsInline muted />
      {!running ? (
        <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-y-auto px-4 py-4">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black tracking-[0.18em] text-cyan-300">VLUE SPACE</p>
              <h2 className="text-[20px] font-black">온디맨드 공간 스캔</h2>
              <p className="mt-1 text-[12px] leading-snug text-slate-400">직접 시작할 때만 카메라와 선택한 보조 신호를 사용합니다.</p>
            </div>
            <button type="button" onClick={leave} className="min-h-11 rounded-lg border border-white/15 px-3 text-[12px] font-bold">
              닫기
            </button>
          </header>

          <section className="mb-3 grid grid-cols-2 gap-2" aria-label="운용 모드">
            <Choice active={config.mode === "general"} onClick={() => setField("mode", "general")}>일반 모드</Choice>
            <Choice active={config.mode === "closed"} onClick={() => setField("mode", "closed")}>폐쇄형 B2B/B2G</Choice>
          </section>
          {closedLocked ? (
            <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-950/40 p-3 text-[13px] leading-relaxed" role="status">
              <p className="font-black text-amber-200">인증이 필요합니다</p>
              <p className="mt-1 text-amber-100/90">시험장·보안회의실 폐쇄형은 로그인 세션이 확인된 뒤에만 열립니다. 지금은 잠금 안내만 표시합니다.</p>
            </div>
          ) : null}

          <section className="mb-4" aria-label="시각화 필터">
            <p className="mb-2 text-[13px] font-black leading-snug text-slate-100">
              시각화 필터 <span className="text-[11px] font-semibold text-slate-500">(광학 프리뷰)</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PALETTES.map((id) => (
                <Choice key={id} active={config.palette === id} onClick={() => setField("palette", id)}>
                  <span className="block">{PALETTE_LABEL[id]}</span>
                  <span className="mt-1 block text-[10px] font-semibold tracking-wide text-slate-500">{id}</span>
                </Choice>
              ))}
            </div>
          </section>

          <section className="mb-3 grid grid-cols-1 gap-2" aria-label="보조 신호">
            {[
              ["optical", "광학 점반사 / 고휘도 집중점"],
              ["radio", "주변 BLE·Wi-Fi 참고 (단정하지 않음)"],
              ["audioSensor", "음향·센서 보조 (허용된 경우만)"]
            ].map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3 text-[13px] font-bold">
                <input type="checkbox" checked={config[key]} onChange={(event) => setField(key, event.target.checked)} />
                {label}
              </label>
            ))}
          </section>

          <section className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-black leading-snug text-slate-100">광폭 반사 억제</p>
              <div className="grid gap-1.5">
                {SUPPRESS_LEVELS.map((level) => (
                  <Choice key={level} active={config.suppress === level} onClick={() => setField("suppress", level)}>
                    <span className="block">{SUPPRESS_LABEL[level]}</span>
                    {level === "high" ? <span className="mt-1 block text-[10px] font-semibold text-slate-500">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-black leading-snug text-slate-100">포착 안정성</p>
              <div className="grid gap-1.5">
                {STABILITY_LEVELS.map((level) => (
                  <Choice key={level} active={config.stability === level} onClick={() => setField("stability", level)}>
                    <span className="block">{STABILITY_LABEL[level]}</span>
                    {level === "sustained" ? <span className="mt-1 block text-[10px] font-semibold text-slate-500">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-4" aria-label="안내 모드">
            <p className="mb-2 text-[13px] font-black leading-snug text-slate-100">안내 모드</p>
            <div className="grid grid-cols-2 gap-2">
              {["SILENT", "STANDARD"].map((mode) => (
                <Choice key={mode} active={config.guidance === mode} onClick={() => setField("guidance", mode)}>
                  <span className="block">{GUIDANCE_LABEL[mode]}</span>
                  <span className="mt-1 block text-[10px] font-semibold tracking-wide text-slate-500">{mode}</span>
                </Choice>
              ))}
            </div>
          </section>

          <section className="mb-4 space-y-2 rounded-xl border border-white/10 p-3" aria-label="사용자 주체 및 정책 확인">
            <p className="text-[12px] font-black">사용자 주체 및 정책 확인</p>
            {[
              ["agreeJudgment", JUDGMENT],
              ["agreePortrait", PORTRAIT],
              ["agreeShutter", SHUTTER]
            ].map(([key, text]) => (
              <label key={key} className="flex items-start gap-2 text-[12px] leading-snug text-slate-300">
                <input className="mt-1" type="checkbox" checked={config[key]} onChange={(event) => setField(key, event.target.checked)} />
                <span>{text}</span>
              </label>
            ))}
          </section>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              setRunning(true);
              void scan.start();
            }}
            className="mb-6 min-h-12 rounded-xl bg-cyan-400 px-4 text-[14px] font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
          >
            스캔 시작
          </button>
        </div>
      ) : (
        <div className="relative h-full w-full">
          <canvas ref={scan.canvasRef} className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-6 border border-cyan-200/30" aria-hidden>
            <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-cyan-200" />
            <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-cyan-200" />
            <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-cyan-200" />
            <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-cyan-200" />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(125,211,252,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.25) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="pointer-events-none absolute right-3 top-16 bottom-28 flex w-3 flex-col overflow-hidden rounded-full border border-white/20" aria-hidden>
            <span className="flex-1" style={{ background: config.palette === "NVG_PHOSPHOR" ? "linear-gradient(#052e16,#4ade80,#ecfccb)" : config.palette === "HIGH_CONTRAST_EDGE" ? "linear-gradient(#000,#fff)" : "linear-gradient(#1e1b4b,#7c2d12,#fde68a,#fff)" }} />
          </div>
          <div className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2" style={reticle}>
            <span className="absolute left-1/2 top-0 h-full w-px bg-cyan-200" />
            <span className="absolute left-0 top-1/2 h-px w-full bg-cyan-200" />
            <span className={`absolute inset-3 rounded-full border ${scan.reading.locked ? "border-amber-300" : "border-cyan-100"}`} />
          </div>
          <div className="absolute left-3 right-12 top-3 flex items-center justify-between gap-2">
            <span className="rounded-full border border-cyan-300/50 bg-black/60 px-2.5 py-1 text-[10px] font-black tracking-wide text-cyan-100">OPTICAL VISUALIZATION FILTER</span>
            <button type="button" onClick={leave} className="min-h-11 rounded-lg bg-black/70 px-3 text-[12px] font-black">스캔 종료</button>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-col">
            <div className="mb-2 flex items-end justify-between px-3">
              <div className="flex flex-col gap-1">
                {[
                  ["y", -0.35, "위"],
                  ["x", -0.35, "왼쪽"],
                  ["x", 0.35, "오른쪽"],
                  ["y", 0.35, "아래"]
                ].map(([axis, delta, label]) => (
                  <button key={label} type="button" onClick={() => scan.nudge(axis, delta)} className="min-h-11 min-w-11 rounded-lg bg-black/70 px-2 text-[12px] font-black">
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map((value) => (
                  <button key={value} type="button" onClick={() => scan.changeZoom(value)} className={`min-h-11 rounded-lg px-2 text-[12px] font-black ${scan.zoom === value ? "bg-cyan-300 text-slate-950" : "bg-black/70"}`}>
                    {value.toFixed(1)}x
                  </button>
                ))}
              </div>
            </div>
          <aside className="max-h-[34vh] overflow-y-auto rounded-t-xl border border-white/15 bg-black/78 p-2.5 text-[11px] leading-snug backdrop-blur">
            <button type="button" onClick={() => setPanelOpen((value) => !value)} className="min-h-11 w-full text-left text-[12px] font-black" aria-expanded={panelOpen}>
              {panelOpen ? "리포트 접기" : "리포트 펼치기"} · {config.mode === "closed" ? "폐쇄형" : "일반"}
            </button>
            {panelOpen ? (
              <div className="space-y-1.5">
                <p>{PALETTE_LABEL[config.palette]} · {SUPPRESS_LABEL[config.suppress]} · {STABILITY_LABEL[config.stability]} · {GUIDANCE_LABEL[config.guidance]}</p>
                <p>{scan.reading.cue?.text}</p>
                <div className="flex gap-1 pt-1">
                  <button type="button" onClick={() => void scan.capture()} className="min-h-11 flex-1 rounded-lg bg-white/10 font-black">캡처</button>
                  <button type="button" onClick={scan.toggleRecord} className="min-h-11 flex-1 rounded-lg bg-white/10 font-black">{scan.recording ? "녹화 중지" : "녹화"}</button>
                  <button type="button" onClick={() => void scan.askGuide("request", { hotspot: scan.reading.hotspot, needZoom: scan.reading.needZoom })} className="min-h-11 flex-1 rounded-lg bg-white/10 font-black">요약</button>
                </div>
                <p className="text-[10px] text-amber-100/90">초상권 주의. 캡처·녹화 시 OS 소리가 날 수 있습니다. {scan.recordNote}</p>
                <p>Gemini {scan.guide.source === "gemini" ? "안내" : "로컬 폴백"}: {scan.guide.text}</p>
                {config.radio ? <p>전파 참고: {scan.signals.radio || "확인 중"}</p> : null}
                {config.audioSensor ? <p>음향 {scan.signals.audio || "대기"} {scan.signals.motion}</p> : null}
                {scan.reading.live ? null : <p>카메라 프레임이 없어 샘플 광학 화면을 표시합니다.</p>}
                {scan.cameraError ? <p>{scan.cameraError}</p> : null}
                {scan.reading.rejected ? <p>넓은 반사면은 제외했습니다.</p> : null}
                {scan.phase === "locked" ? <p>인증이 해제되어 스캔을 멈췄습니다.</p> : null}
                <ul className="max-h-20 overflow-auto text-[10px] text-slate-300">
                  {scan.logs.map((item) => (
                    <li key={item.id}>{item.at} {item.line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
          </div>
        </div>
      )}
    </div>
  );
}
