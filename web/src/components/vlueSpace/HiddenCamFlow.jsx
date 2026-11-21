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
import { SpaceButton, SpaceChannel, SpaceCorners, SpacePanel } from "./SpaceConsole.jsx";
import SpaceHistoryView from "./SpaceHistoryView.jsx";
import SpaceResultView from "./SpaceResultView.jsx";
import { useSpaceScan } from "./useSpaceScan.js";

const FLASH_HUD = {
  increased: "밝기 증가",
  decreased: "밝기 감소",
  unchanged: "의미 있는 변화 없음",
  unstable: "변화가 일정하지 않음",
  unmatched: "동일 후보로 대응하지 못함",
  uncertain: "대응이 불확실함",
  unsupported: "조명 비교 불가",
  failed: "측정 실패"
};

const JUDGMENT = "탐지 결과는 현장 판단을 돕는 보조 수단이며, 최종 확인과 판단의 주체는 사용자에게 있습니다.";
const PORTRAIT = "스캔·캡처·녹화 중 타인(인물)이 포함될 수 있으며, 동의 없는 무단 배포·공유 시 초상권 주장 등 법적 분쟁과 피해가 발생할 수 있습니다. 현장 점검 목적 외 외부 공유를 삼가 주십시오.";
const SHUTTER = "OS 및 기기 정책에 따라 무음 상태에서도 캡처·녹화 시 소리(셔터음/알림음)가 발생할 수 있습니다.";

function Choice({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-sm border px-3 py-2.5 text-left text-[13px] font-semibold leading-snug break-keep ${
        active ? "border-white bg-white/10 text-white" : "border-white/20 text-white/75"
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
      <SpaceChannel
        code="HIDDEN CAM CHECK"
        title="야간 광학 관측"
        action={running ? "점검 중단" : "기능 목록"}
        onAction={() => (running ? leaveRun("intro") : onBack())}
      />

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-white/70">
          <h3 className="text-[18px] font-semibold text-white">카메라로 주변을 살펴봅니다</h3>
          <p>밝게 연결된 픽셀을 광학 반사 후보로 보여 줍니다. 렌즈라고 단정하지 않습니다.</p>
          <p>점검은 이 화면에서 시작할 때만 카메라를 엽니다. 다른 기능의 센서는 켜지 않습니다.</p>
          <SpaceButton onClick={() => { setStep("support"); void readSpaceSupport().then((next) => setSupport(next["hidden-cam"])); }}>
            권한과 기기 확인
          </SpaceButton>
        </div>
      ) : null}

      {step === "support" ? (
        <div className="space-y-3">
          <h3 className="text-[18px] font-semibold">사용 전 확인</h3>
          <SpacePanel>
            <p className="text-[13px] leading-snug text-white/75">{support?.detail || "카메라 상태를 확인하고 있습니다."}</p>
          </SpacePanel>
          <p className="text-[12px] font-semibold tracking-wide text-white">{support?.headline || "확인 중"}</p>
          <SpaceButton onClick={() => setStep("settings")}>설정으로</SpaceButton>
        </div>
      ) : null}

      {step === "settings" ? (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <section>
            <p className="mb-2 text-[13px] font-semibold">시각화 필터 <span className="text-[11px] font-medium text-white/40">(화면 표현 전용, 측정값 아님)</span></p>
            <div className="grid gap-2">
              {PALETTES.map((id) => (
                <Choice key={id} active={config.palette === id} onClick={() => setField("palette", id)}>
                  <span className="block">{PALETTE_LABEL[id]}</span>
                  <span className="mt-1 block text-[10px] font-medium text-white/40">{id}</span>
                </Choice>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-semibold">광폭 반사 억제</p>
              <div className="grid gap-1.5">
                {SUPPRESS_LEVELS.map((level) => (
                  <Choice key={level} active={config.suppress === level} onClick={() => setField("suppress", level)}>
                    <span className="block">{SUPPRESS_LABEL[level]}</span>
                    {level === "high" ? <span className="mt-1 block text-[10px] text-white/40">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold">포착 안정성</p>
              <div className="grid gap-1.5">
                {STABILITY_LEVELS.map((level) => (
                  <Choice key={level} active={config.stability === level} onClick={() => setField("stability", level)}>
                    <span className="block">{STABILITY_LABEL[level]}</span>
                    {level === "sustained" ? <span className="mt-1 block text-[10px] text-white/40">기본</span> : null}
                  </Choice>
                ))}
              </div>
            </div>
          </section>
          <section>
            <p className="mb-2 text-[13px] font-semibold">안내 모드</p>
            <div className="grid grid-cols-2 gap-2">
              {["SILENT", "STANDARD"].map((mode) => (
                <Choice key={mode} active={config.guidance === mode} onClick={() => setField("guidance", mode)}>
                  <span className="block">{GUIDANCE_LABEL[mode]}</span>
                  <span className="mt-1 block text-[10px] text-white/40">{mode}</span>
                </Choice>
              ))}
            </div>
          </section>
          <section className="space-y-2 border border-white/15 p-3" aria-label="사용자 주체 및 정책 확인">
            <p className="text-[12px] font-semibold">사용자 주체 및 정책 확인</p>
            {[["agreeJudgment", JUDGMENT], ["agreePortrait", PORTRAIT], ["agreeShutter", SHUTTER]].map(([key, text]) => (
              <label key={key} className="flex items-start gap-2 text-[12px] leading-snug text-white/70">
                <input className="mt-1" type="checkbox" checked={config[key]} onChange={(event) => setField(key, event.target.checked)} />
                <span>{text}</span>
              </label>
            ))}
          </section>
          <SpaceButton disabled={!configReady(config)} onClick={() => setStep("run")}>
            점검 시작
          </SpaceButton>
        </div>
      ) : null}

      {step === "run" ? (
        <div className="relative min-h-0 flex-1 overflow-hidden border border-white/20 bg-black">
          <video ref={scan.videoRef} className="hidden" playsInline muted />
          <canvas ref={scan.canvasRef} className="h-full w-full object-cover" />
          <SpaceCorners />
          {scan.reading.live && scan.flash.phase !== "off" && scan.flash.phase !== "on" && scan.flash.phase !== "settle" ? (
            <span className="vlue-scan pointer-events-none absolute inset-x-10 top-0 h-px bg-white/50" style={{ animation: "vlue-space-scan 4.8s linear infinite" }} />
          ) : null}
          {scan.reading.live ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2" aria-hidden>
              <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-white/70" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-white/70" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-white/70" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/70" />
            </div>
          ) : null}
          {scan.reading.live ? (
            (scan.reading.markers || []).map((mark) => (
              <div key={mark.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${mark.nx * 100}%`, top: `${mark.ny * 100}%` }}>
                <span
                  className={`block h-8 w-8 border border-dashed ${mark.kind === "sustained" ? "vlue-hold border-sky-200" : "border-white/80"}`}
                  style={mark.kind === "sustained" ? { animation: "vlue-space-hold 1.6s ease-in-out infinite" } : undefined}
                />
                <span className="mt-0.5 block whitespace-nowrap text-[9px] font-semibold text-white">{mark.label}</span>
              </div>
            ))
          ) : (
            <p className="absolute inset-x-4 top-14 border border-white/20 bg-black/80 p-3 text-[12px] leading-snug text-white/85">
              {scan.cameraError || "카메라 프레임이 없습니다. 측정값을 만들지 않습니다."}
            </p>
          )}
          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            <span className="max-w-[58%] bg-black/70 px-2 py-1 text-[10px] leading-snug text-white/80">
              화면 필터 {PALETTE_LABEL[config.palette] || config.palette}. 측정 원본과 분리된 표현입니다.
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((value) => (
                <button key={value} type="button" onClick={() => scan.changeZoom(value)} className={`min-h-11 rounded-sm px-2 text-[12px] font-semibold ${scan.zoom === value ? "bg-white text-black" : "bg-black/70 text-white"}`}>{value.toFixed(1)}x</button>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-2 bottom-2 z-10 space-y-1 bg-black/75 p-2">
            <p className="text-[11px] leading-snug text-white/85">
              {scan.reading.live
                ? `광학 반사 후보 ${scan.reading.candidates?.length || 0}${scan.reading.limited ? " · 표시 상한" : ""}`
                : "프레임 없음"}
              {scan.reading.live ? " · 렌즈라고 단정하지 않습니다." : ""}
            </p>
            {scan.torchLamp.lit === true ? <p className="border border-red-400/80 px-2 py-1 text-[11px] font-semibold text-red-200">손전등이 켜져 있습니다.</p> : null}
            {scan.flash.phase === "off" ? <p className="text-[11px] font-semibold text-white">조명 OFF 측정</p> : null}
            {scan.flash.phase === "on" ? <p className="text-[11px] font-semibold text-white">조명 ON 측정</p> : null}
            {scan.flash.phase === "settle" ? <p className="text-[11px] font-semibold text-white">조명 전환 중입니다. 이 구간은 측정하지 않습니다.</p> : null}
            {(scan.flash.phase === "idle" || scan.flash.phase === "done") && scan.flash.report?.status ? (
              <p className="text-[11px] text-white/80">조명 반응 관찰 · {FLASH_HUD[scan.flash.report.status] || "기록 있음"}</p>
            ) : null}
            {scan.torch.checked && !scan.torch.supported ? <p className="text-[10px] leading-snug text-white/70">{scan.torch.reason}</p> : null}
            <button
              type="button"
              disabled={!scan.torch.supported || !scan.reading.live || scan.flash.running}
              onClick={() => void scan.runFlashAnalysis()}
              className="min-h-11 w-full rounded-sm bg-white text-[12px] font-semibold text-black disabled:bg-white/10 disabled:text-white/35"
            >
              조명 반응 분석
            </button>
            <div className="grid grid-cols-4 gap-1">
              {[["y", -0.35, "위"], ["x", -0.35, "왼쪽"], ["x", 0.35, "오른쪽"], ["y", 0.35, "아래"]].map(([axis, delta, label]) => (
                <button key={label} type="button" onClick={() => scan.nudge(axis, delta)} className="min-h-11 rounded-sm border border-white/25 text-[12px] font-semibold">{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => void scan.capture()} className="min-h-11 rounded-sm border border-white/30 text-[12px] font-semibold">캡처</button>
              <button type="button" onClick={() => leaveRun("result", buildHiddenCamResult({ config, reading: { ...scan.reading, flash: scan.flash.report }, cameraError: scan.cameraError }))} className="min-h-11 rounded-sm bg-white text-[12px] font-semibold text-black">결과 보기</button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <SpaceButton variant="quiet" disabled={!result?.observed?.length} onClick={() => setRecords(appendSpaceRecord(result))}>
            관찰이 있을 때만 기록
          </SpaceButton>
          <SpaceButton variant="ghost" onClick={() => setStep("history")}>기록 보기</SpaceButton>
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
