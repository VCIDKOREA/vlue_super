import { useState } from "react";
import { appendSpaceRecord, readSpaceRecords } from "../../lib/vlueSpace/spaceRecords.js";
import { buildTofResult, describeTofEnvironment, requestDepthSample } from "../../lib/vlueSpace/tofSupport.js";
import { SpaceButton, SpaceChannel, SpacePanel } from "./SpaceConsole.jsx";
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
      <SpaceChannel
        code="SPACE ToF"
        title="공간 깊이 측정"
        action={step === "intro" ? "기능 목록" : "처음으로"}
        onAction={step === "intro" ? onBack : () => setStep("intro")}
      />

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-white/70">
          <h3 className="text-[18px] font-semibold text-white">깊이 센서가 있을 때만 거리를 봅니다</h3>
          <p>일반 카메라 영상은 깊이 지도로 바꾸지 않습니다. 지원 여부를 모르면 측정 화면을 열지 않습니다.</p>
          <SpaceButton onClick={openSupport}>센서 지원 확인</SpaceButton>
        </div>
      ) : null}

      {step === "support" ? (
        <div className="space-y-3 text-[13px] leading-snug text-white/70">
          <h3 className="text-[18px] font-semibold text-white">{env?.headline || "확인 중"}</h3>
          <SpacePanel><p>{env?.detail}</p></SpacePanel>
          <p>지원 단서와 깊이 프레임 수신은 따로 판단합니다. 프레임이 없으면 측정을 시작하지 않습니다.</p>
          {env?.support === "advertised" ? (
            <SpaceButton onClick={() => void askDepth()}>깊이 데이터 요청</SpaceButton>
          ) : (
            <SpaceButton onClick={() => { setResult(buildTofResult({ support: env?.support || "unknown", frames: [], note: env?.detail || "" })); setStep("result"); }}>측정 없이 결과 보기</SpaceButton>
          )}
        </div>
      ) : null}

      {step === "measure" && result?.enterMeasure ? (
        <div className="space-y-3">
          <h3 className="text-[18px] font-semibold">수신한 깊이 표본</h3>
          <SpaceResultView result={result} />
          <SpaceButton variant="ghost" onClick={() => setStep("result")}>결과 화면</SpaceButton>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <SpaceButton variant="quiet" disabled={!result?.observed?.length} onClick={() => setRecords(appendSpaceRecord(result))}>깊이 표본이 있을 때만 기록</SpaceButton>
          <SpaceButton variant="ghost" onClick={() => setStep("history")}>기록 보기</SpaceButton>
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
