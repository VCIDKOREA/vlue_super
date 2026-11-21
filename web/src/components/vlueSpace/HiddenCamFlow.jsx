import { useEffect, useRef, useState } from "react";
import { buildHiddenCamResult } from "../../lib/vlueSpace/hiddenCamResult.js";
import { appendSpaceRecord, readSpaceRecords } from "../../lib/vlueSpace/spaceRecords.js";
import {
  configReady,
  DEFAULT_SPACE_CONFIG,
  GUIDANCE_LABEL,
  PALETTE_LABEL,
  PALETTES,
  STABILITY_LABEL,
  STABILITY_LEVELS,
  SUPPRESS_LABEL,
  SUPPRESS_LEVELS
} from "../../lib/vlueSpace/spaceConfig.js";
import { readSpaceSupport } from "../../lib/vlueSpace/support.js";
import SpaceHistoryView from "./SpaceHistoryView.jsx";
import SpaceResultView from "./SpaceResultView.jsx";
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

export default function HiddenCamFlow({ onBack }) {
  const [step, setStep] = useState("intro");
  const [config, setConfig] = useState(DEFAULT_SPACE_CONFIG);
  const [support, setSupport] = useState(null);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState(() => readSpaceRecords("hidden-cam"));
  const running = step === "run";
  const scan = useSpaceScan(config, running);
  const bootRun = useRef(false);

  useEffect(() => {
    if (step !== "run") {
      bootRun.current = false;
      return undefined;
    }
    if (bootRun.current) return undefined;
    bootRun.current = true;
    void scan.start();
    return undefined;
  }, [scan.start, step]);

  const leaveRun = (next, snapshot) => {
    if (snapshot) setResult(snapshot);
    scan.stop();
    setStep(next);
  };

  const setField = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => (running ? leaveRun("intro") : onBack())} className="min-h-11 rounded-lg border border-white/15 px-3 text-[12px] font-bold">
          {running ? "점검 중단" : "기능 목록"}
        </button>
        <p className="text-[11px] font-black tracking-wide text-cyan-300">HIDDEN CAM CHECK</p>
      </div>

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">카메라로 주변을 살펴봅니다</h3>
          <p>밝게 연결된 픽셀을 광학 반사 후보로 보여 줍니다. 렌즈라고 단정하지 않습니다.</p>
          <p>점검은 이 화면에서 시작할 때만 카메라를 엽니다. 다른 기능의 센서는 켜지 않습니다.</p>
          <button type="button" onClick={() => { setStep("support"); void readSpaceSupport().then((next) => setSupport(next["hidden-cam"])); }} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">
            권한과 기기 확인
          </button>
        </div>
      ) : null}

      {step === "support" ? (
        <div className="space-y-3">
          <h3 className="text-[18px] font-black">사용 전 확인</h3>
          <p className="rounded-xl border border-white/10 p-3 text-[13px] leading-snug text-slate-300">{support?.detail || "카메라 상태를 확인하고 있습니다."}</p>
          <p className="text-[12px] font-bold text-cyan-200">{support?.headline || "확인 중"}</p>
          <button type="button" onClick={() => setStep("settings")} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">설정으로</button>
        </div>
      ) : null}

      {step === "settings" ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <section>
            <p className="mb-2 text-[13px] font-black">시각화 필터 <span className="text-[11px] font-semibold text-slate-500">(광학 프리뷰)</span></p>
            <div className="grid gap-2">
              {PALETTES.map((id) => (
                <Choice key={id} active={config.palette === id} onClick={() => setField("palette", id)}>
                  <span className="block">{PALETTE_LABEL[id]}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-500">{id}</span>
                </Choice>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-black">광폭 반사 억제</p>
              <div className="grid gap-1.5">
                {SUPPRESS_LEVELS.map((level) => (
                  <Choice key={level} active={config.suppress === level} onClick={() => setField("suppress", level)}>
                    <span className="block">{SUPPRESS_LABEL[level]}</span>
                    {level === "high" ? <span className="mt-1 block text-[10px] text-slate-500">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-black">포착 안정성</p>
              <div className="grid gap-1.5">
                {STABILITY_LEVELS.map((level) => (
                  <Choice key={level} active={config.stability === level} onClick={() => setField("stability", level)}>
                    <span className="block">{STABILITY_LABEL[level]}</span>
                    {level === "sustained" ? <span className="mt-1 block text-[10px] text-slate-500">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
          </section>
          <section>
            <p className="mb-2 text-[13px] font-black">안내 모드</p>
            <div className="grid grid-cols-2 gap-2">
              {["SILENT", "STANDARD"].map((mode) => (
                <Choice key={mode} active={config.guidance === mode} onClick={() => setField("guidance", mode)}>
                  <span className="block">{GUIDANCE_LABEL[mode]}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">{mode}</span>
                </Choice>
              ))}
            </div>
          </section>
          <section className="space-y-2 rounded-xl border border-white/10 p-3" aria-label="사용자 주체 및 정책 확인">
            <p className="text-[12px] font-black">사용자 주체 및 정책 확인</p>
            {[["agreeJudgment", JUDGMENT], ["agreePortrait", PORTRAIT], ["agreeShutter", SHUTTER]].map(([key, text]) => (
              <label key={key} className="flex items-start gap-2 text-[12px] leading-snug text-slate-300">
                <input className="mt-1" type="checkbox" checked={config[key]} onChange={(event) => setField(key, event.target.checked)} />
                <span>{text}</span>
              </label>
            ))}
          </section>
          <button
            type="button"
            disabled={!configReady(config)}
            onClick={() => setStep("run")}
            className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
          >
            점검 시작
          </button>
        </div>
      ) : null}

      {step === "run" ? (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
          <video ref={scan.videoRef} className="hidden" playsInline muted />
          <canvas ref={scan.canvasRef} className="h-full w-full object-cover" />
          {scan.reading.live ? (
            <>
              {(scan.reading.markers || []).map((mark) => (
                <div key={mark.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${mark.nx * 100}%`, top: `${mark.ny * 100}%` }}>
                  <span className={`block h-8 w-8 rounded-full border border-dashed ${mark.kind === "sustained" ? "border-sky-200" : "border-white/80"}`} />
                  <span className="mt-0.5 block whitespace-nowrap text-[9px] font-bold text-white">{mark.label}</span>
                </div>
              ))}
              <p className="pointer-events-none absolute inset-x-2 top-16 rounded-lg bg-black/70 px-2 py-1 text-[10px] leading-snug text-slate-100">
                표시는 광학 반사 후보입니다. 형태와 밝기만으로 렌즈 여부를 확인하지 않습니다.
              </p>
            </>
          ) : (
            <p className="absolute inset-x-4 top-16 rounded-xl bg-black/75 p-3 text-[12px] leading-snug text-slate-200">
              {scan.cameraError || "카메라 프레임이 없습니다. 측정값을 만들지 않습니다."}
            </p>
          )}
          <div className="absolute inset-x-2 bottom-16 z-10 space-y-1">
            {scan.torchLamp.lit === true ? <p className="rounded-lg bg-amber-200 px-2 py-1 text-[11px] font-black text-slate-950">손전등이 켜져 있습니다.</p> : null}
            {scan.flash.phase === "off" ? <p className="rounded-lg bg-black/75 px-2 py-1 text-[10px] font-bold text-slate-100">조명 OFF 측정</p> : null}
            {scan.flash.phase === "on" ? <p className="rounded-lg bg-black/75 px-2 py-1 text-[10px] font-bold text-slate-100">조명 ON 측정</p> : null}
            {scan.flash.phase === "settle" ? <p className="rounded-lg bg-black/75 px-2 py-1 text-[10px] font-bold text-slate-100">조명 전환 중입니다. 이 구간은 측정하지 않습니다.</p> : null}
            <button
              type="button"
              disabled={!scan.torch.supported || !scan.reading.live || scan.flash.running}
              onClick={() => void scan.runFlashAnalysis()}
              className="min-h-11 w-full rounded-lg bg-white/90 text-[12px] font-black text-slate-950 disabled:bg-black/70 disabled:text-slate-400"
            >
              조명 반응 분석
            </button>
            {scan.torch.checked && !scan.torch.supported ? <p className="rounded-lg bg-black/75 px-2 py-1 text-[10px] leading-snug text-slate-200">{scan.torch.reason}</p> : null}
          </div>
          <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2">
            <span className="rounded-full border border-cyan-300/50 bg-black/70 px-2 py-1 text-[10px] font-black text-cyan-100">OPTICAL VISUALIZATION FILTER</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((value) => (
                <button key={value} type="button" onClick={() => scan.changeZoom(value)} className={`min-h-11 rounded-lg px-2 text-[12px] font-black ${scan.zoom === value ? "bg-cyan-300 text-slate-950" : "bg-black/70"}`}>{value.toFixed(1)}x</button>
              ))}
            </div>
          </div>
          <div className="absolute bottom-2 left-2 flex flex-col gap-1">
            {[["y", -0.35, "위"], ["x", -0.35, "왼쪽"], ["x", 0.35, "오른쪽"], ["y", 0.35, "아래"]].map(([axis, delta, label]) => (
              <button key={label} type="button" onClick={() => scan.nudge(axis, delta)} className="min-h-11 min-w-11 rounded-lg bg-black/70 px-2 text-[12px] font-black">{label}</button>
            ))}
          </div>
          <div className="absolute bottom-2 right-2 flex max-w-[46%] flex-col gap-1">
            <button type="button" onClick={() => void scan.capture()} className="min-h-11 rounded-lg bg-black/70 text-[12px] font-black">캡처</button>
            <button type="button" onClick={() => leaveRun("result", buildHiddenCamResult({ config, reading: { ...scan.reading, flash: scan.flash.report }, cameraError: scan.cameraError }))} className="min-h-11 rounded-lg bg-cyan-300 text-[12px] font-black text-slate-950">결과 보기</button>
          </div>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <button
            type="button"
            disabled={!result?.observed?.length}
            onClick={() => setRecords(appendSpaceRecord(result))}
            className="min-h-11 w-full rounded-xl bg-white/10 text-[13px] font-black disabled:text-slate-500"
          >
            관찰이 있을 때만 기록
          </button>
          <button type="button" onClick={() => setStep("history")} className="min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-bold">기록 보기</button>
        </div>
      ) : null}

      {step === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SpaceHistoryView records={records} />
        </div>
      ) : null}
    </div>
  );
}
