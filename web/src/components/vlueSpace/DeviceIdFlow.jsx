import { useState } from "react";
import { buildGeneralScanResult, probeGeneralDeviceScan } from "../../lib/vlueSpace/deviceScan.js";
import { evaluateInstitutionalGate, runInstitutionalScan } from "../../lib/vlueSpace/institutionGate.js";
import { appendSpaceRecord, readSpaceRecords } from "../../lib/vlueSpace/spaceRecords.js";
import { readSpaceAuth } from "../../lib/vlueSpace/spaceSession.js";
import SpaceHistoryView from "./SpaceHistoryView.jsx";
import SpaceResultView from "./SpaceResultView.jsx";

const EMPTY = "저장된 DEVICE ID 기록이 없습니다. 실제로 고른 장치나 잠금 사유만 남깁니다.";

export default function DeviceIdFlow({ onBack }) {
  const [step, setStep] = useState("intro");
  const [mode, setMode] = useState("general");
  const [probe, setProbe] = useState(null);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState(() => readSpaceRecords("device-id"));
  const gate = evaluateInstitutionalGate(null);
  const localLogin = readSpaceAuth();

  const openGeneral = () => {
    setMode("general");
    setStep("settings");
    void probeGeneralDeviceScan().then(setProbe);
  };

  const pickBluetooth = async () => {
    const current = probe || (await probeGeneralDeviceScan());
    setProbe(current);
    if (!current.bluetooth.requestDevice || !navigator.bluetooth?.requestDevice) {
      setResult(buildGeneralScanResult({ probe: current }));
      setStep("result");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      setResult(buildGeneralScanResult({ probe: current, picked: { name: device?.name || "", id: device?.id || "" } }));
    } catch (err) {
      setResult(buildGeneralScanResult({ probe: current, errorName: err?.name || "error" }));
    }
    setStep("result");
  };

  const runInstitution = () => {
    const scan = runInstitutionalScan(null);
    const note = localLogin.loggedIn
      ? "이 브라우저의 로그인 표시는 기관 본인 인증 서버 응답이 아닙니다."
      : "이 브라우저에는 로그인 표시가 없고, 기관 본인 인증 서버 응답도 없습니다.";
    setResult({ ...scan.result, review: [...scan.result.review, note] });
    setStep("result");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={step === "intro" ? onBack : () => setStep("intro")} className="min-h-11 rounded-lg border border-white/15 px-3 text-[12px] font-bold">
          {step === "intro" ? "기능 목록" : "처음으로"}
        </button>
        <p className="text-[11px] font-black tracking-wide text-cyan-300">DEVICE ID</p>
      </div>

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">주변 기기 확인은 두 갈래입니다</h3>
          <p>일반 탐색은 이 브라우저가 실제로 열어 주는 장치 선택만 사용합니다. 기관용 탐색은 인증 조건이 막히면 실행 단계에서 멈춥니다.</p>
          <button type="button" onClick={openGeneral} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">일반 주변 탐색</button>
          <button type="button" onClick={() => { setMode("institution"); setStep("settings"); }} className="min-h-12 w-full rounded-xl border border-white/15 text-[14px] font-black">기관용 탐색</button>
        </div>
      ) : null}

      {step === "settings" && mode === "general" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-[13px] leading-snug text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">일반 탐색에서 볼 수 있는 범위</h3>
          <p>주변 Wi-Fi 목록은 브라우저가 주지 않습니다. Bluetooth 선택 API가 있으면 사용자가 고른 장치 한 건만 기록합니다.</p>
          <p>{probe?.bluetooth?.requestDevice ? "이 브라우저에는 Bluetooth 선택 API가 있습니다." : "Bluetooth 선택 API는 확인되지 않았습니다."}</p>
          <button type="button" onClick={() => setStep("run")} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">실행 화면</button>
        </div>
      ) : null}

      {step === "settings" && mode === "institution" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <h3 className="text-[18px] font-black">기관용 실행 조건</h3>
          <ul className="space-y-2">
            {gate.checks.map((check) => (
              <li key={check.id} className="rounded-xl border border-white/10 p-3 text-[12px] leading-snug text-slate-300">
                <span className="block font-black text-slate-100">{check.label}</span>
                <span className="mt-1 block">미연동. {check.reason}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setStep("run")} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">실행 화면</button>
        </div>
      ) : null}

      {step === "run" && mode === "general" ? (
        <div className="space-y-3 text-[13px] leading-snug text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">일반 탐색 실행</h3>
          <p>선택 창이 없거나 장치를 고르지 않으면 탐색 성공으로 표시하지 않습니다. 가상 기기 목록은 만들지 않습니다.</p>
          <button type="button" onClick={() => void pickBluetooth()} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">장치 선택 실행</button>
        </div>
      ) : null}

      {step === "run" && mode === "institution" ? (
        <div className="space-y-3 text-[13px] leading-snug text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">기관용 탐색 실행</h3>
          <p>다섯 조건 중 하나라도 서버 확인이 없으면 이 버튼의 실행 함수가 장치 조회 전에 멈춥니다.</p>
          <button type="button" onClick={runInstitution} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">기관용 확인 실행</button>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <button type="button" onClick={() => setRecords(appendSpaceRecord(result))} className="min-h-11 w-full rounded-xl bg-white/10 text-[13px] font-black">이 상태 기록</button>
          <button type="button" onClick={() => setStep("history")} className="min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-bold">기록 보기</button>
        </div>
      ) : null}

      {step === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SpaceHistoryView records={records} emptyLabel={EMPTY} />
        </div>
      ) : null}
    </div>
  );
}
