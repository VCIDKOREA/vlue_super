import { useState } from "react";
import { BLE_SCOPE, buildHomeGuardResult, emptyHomeGuardSnapshot, HOME_GUARD_FIELDS } from "../../lib/vlueSpace/homeGuardModel.js";
import { appendSpaceRecord, readSpaceRecords } from "../../lib/vlueSpace/spaceRecords.js";
import { SpaceButton, SpaceChannel } from "./SpaceConsole.jsx";
import SpaceHistoryView from "./SpaceHistoryView.jsx";
import SpaceResultView from "./SpaceResultView.jsx";

const EMPTY = "저장된 HOME GUARD 기록이 없습니다. 연동된 관찰값이나 등록 후보만 남깁니다.";

function slotText(value) {
  if (value === null || value === undefined) return "미연동";
  return String(value);
}

export default function HomeGuardFlow({ onBack }) {
  const [step, setStep] = useState("intro");
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState(() => readSpaceRecords("home-guard"));
  const slots = emptyHomeGuardSnapshot();

  const finish = (bleDevice) => {
    setResult(buildHomeGuardResult({ payload: null, bleDevice }));
    setStep("result");
  };

  const registerBle = async () => {
    if (!navigator.bluetooth?.requestDevice) {
      finish(null);
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
      finish({ name: device?.name || "", id: device?.id || "" });
    } catch {
      finish(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SpaceChannel
        code="HOME GUARD"
        title="네트워크 감시"
        action={step === "intro" ? "기능 목록" : "처음으로"}
        onAction={step === "intro" ? onBack : () => setStep("intro")}
      />

      {step === "intro" ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-white/70">
          <h3 className="text-[18px] font-semibold text-white">홈캠 통신은 관찰 장치가 있을 때만 봅니다</h3>
          <p>통신 대상, 시간대별 송수신량, 연결 상태, 통신 변화는 공유기 API·로그 또는 별도 관찰 장치가 연결되어야 합니다.</p>
          <p>같은 Wi-Fi에 연결되었다는 사실만으로는 다른 기기의 통신을 보지 못합니다. 지금은 미연동입니다.</p>
          <SpaceButton onClick={() => setStep("settings")}>슬롯 확인</SpaceButton>
        </div>
      ) : null}

      {step === "settings" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <h3 className="text-[18px] font-semibold">관찰 슬롯</h3>
          <ul className="space-y-2">
            {HOME_GUARD_FIELDS.map(([key, label]) => (
              <li key={key} className="border border-white/15 p-3 text-[12px] leading-snug">
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-white/45">{slotText(slots[key])}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] leading-snug text-white/45">{BLE_SCOPE}</p>
          <SpaceButton onClick={() => setStep("run")}>실행 화면</SpaceButton>
        </div>
      ) : null}

      {step === "run" ? (
        <div className="space-y-3 text-[13px] leading-snug text-white/70">
          <h3 className="text-[18px] font-semibold text-white">연동 확인</h3>
          <p>관찰 데이터가 없으면 감시 중이나 정상으로 표시하지 않습니다. BLE 선택은 등록 후보만 남기고 통신량을 채우지 않습니다.</p>
          <SpaceButton onClick={() => finish(null)}>관찰 데이터 확인</SpaceButton>
          <SpaceButton variant="ghost" onClick={() => void registerBle()}>BLE 등록 후보 선택</SpaceButton>
        </div>
      ) : null}

      {step === "result" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <SpaceResultView result={result} />
          <SpaceButton variant="quiet" onClick={() => setRecords(appendSpaceRecord(result))}>이 상태 기록</SpaceButton>
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
