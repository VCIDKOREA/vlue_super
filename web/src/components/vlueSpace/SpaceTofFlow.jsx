import { useState } from "react";
import { appendSpaceRecord, readSpaceRecords } from "../../lib/vlueSpace/spaceRecords.js";
import { buildTofResult, describeTofEnvironment, requestDepthSample } from "../../lib/vlueSpace/tofSupport.js";
import SpaceHistoryView from "./SpaceHistoryView.jsx";
import SpaceResultView from "./SpaceResultView.jsx";

const EMPTY = "저장된 SPACE ToF 기록이 없습니다. 실제 깊이 프레임이 있을 때만 거리가 남습니다.";

function readEnvironment() {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  const canQuery = typeof media?.getSupportedConstraints === "function";
  return describeTofEnvironment({
    hasNavigator: typeof navigator !== "undefined",
    hasMedia: Boolean(media),
    canQueryConstraints: canQuery,
    constraints: canQuery ? media.getSupportedConstraints() || null : null
  });
}

export default function SpaceTofFlow({ onBack }) {
  const [step, setStep] = useState("intro");
  const [env, setEnv] = useState(null);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState(() => readSpaceRecords("space-tof"));

  const openSupport = () => {
    setEnv(readEnvironment());
    setStep("support");
  };

  const askDepth = async () => {
    const sample = await requestDepthSample();
    const next = buildTofResult({ support: sample.support, frames: sample.frames, note: sample.note });
    setResult(next);
    setStep(next.enterMeasure ? "measure" : "result");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={step === "intro" ? onBack : () => setStep("intro")} className="min-h-11 rounded-lg border border-white/15 px-3 text-[12px] font-bold">
          {step === "intro" ? "기능 목록" : "처음으로"}
        </button>
        <p className="text-[11px] font-black tracking-wide text-cyan-300">SPACE ToF</p>
      </div>

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">깊이 센서가 있을 때만 거리를 봅니다</h3>
          <p>일반 카메라 영상은 깊이 지도로 바꾸지 않습니다. 지원 여부를 모르면 측정 화면을 열지 않습니다.</p>
          <button type="button" onClick={openSupport} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">센서 지원 확인</button>
        </div>
      ) : null}

      {step === "support" ? (
        <div className="space-y-3 text-[13px] leading-snug text-slate-300">
          <h3 className="text-[18px] font-black text-slate-50">{env?.headline || "확인 중"}</h3>
          <p>{env?.detail}</p>
          <p>지원 단서와 깊이 프레임 수신은 따로 판단합니다. 프레임이 없으면 측정을 시작하지 않습니다.</p>
          {env?.support === "advertised" ? (
            <button type="button" onClick={() => void askDepth()} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">깊이 데이터 요청</button>
          ) : (
            <button type="button" onClick={() => { setResult(buildTofResult({ support: env?.support || "unknown", frames: [], note: env?.detail || "" })); setStep("result"); }} className="min-h-12 w-full rounded-xl bg-cyan-400 text-[14px] font-black text-slate-950">측정 없이 결과 보기</button>
          )}
        </div>
      ) : null}

      {step === "measure" && result?.enterMeasure ? (
        <div className="space-y-3">
          <h3 className="text-[18px] font-black">수신한 깊이 표본</h3>
          <SpaceResultView result={result} />
          <button type="button" onClick={() => setStep("result")} className="min-h-11 w-full rounded-xl border border-white/15 text-[13px] font-bold">결과 화면</button>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <button type="button" disabled={!result?.observed?.length} onClick={() => setRecords(appendSpaceRecord(result))} className="min-h-11 w-full rounded-xl bg-white/10 text-[13px] font-black disabled:text-slate-500">깊이 표본이 있을 때만 기록</button>
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
