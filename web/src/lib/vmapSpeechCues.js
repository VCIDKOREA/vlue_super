/** V-MAP 턴바이턴·안전·특수구간 TTS 멘트 */

/** 숫자가 작을수록 급하다. 재생 중인 일반 안내보다 급하면 그 문장을 끊는다. */
export const TTS_PRIORITY = {
  URGENT: 1,
  NEAR: 2,
  GENERAL: 3
};

export function classifyTurn(instruction) {
  const text = String(instruction || "");
  if (/U턴|유턴/i.test(text)) return "유턴";
  if (/10시/.test(text)) return "10시 방향";
  if (/2시/.test(text)) return "2시 방향";
  if (/약간/.test(text)) return "";
  if (/급우|우회전|오른쪽/.test(text) && !/합류/.test(text)) return "우회전";
  if (/급좌|좌회전|왼쪽/.test(text) && !/합류/.test(text)) return "좌회전";
  return "";
}

export function turnBandKey(distanceM) {
  return turnBand(distanceM) || "far";
}

export function turnBand(distanceM) {
  const d = Number(distanceM);
  if (!Number.isFinite(d) || d < 0) return "";
  if (d <= 120) return "100";
  if (d <= 360) return "300";
  return "";
}

export function phraseForTurn(instruction, distanceM) {
  const classified = classifyTurn(instruction);
  const turn = classified || String(instruction || "").replace(/입니다\.?$/, "");
  const band = turnBand(distanceM);
  if (!turn || /직진|도착|안내를 시작|안내를 종료|약간/.test(turn)) return "";
  if (!classified && !/회전|유턴|U턴|분기|갈래|로터리|합류|10시|2시/.test(turn)) return "";
  if (band === "300") return `300미터 앞, ${turn}입니다.`;
  if (band === "100") return `100미터 앞, ${turn}입니다.`;
  return "";
}

export function phraseForSpecialRoad(instruction) {
  const text = String(instruction || "");
  if (/톨게이트|요금소/.test(text)) {
    if (/통과 후/.test(text)) {
      if (/좌/.test(text)) return "요금소 통과 후, 좌측 방향입니다.";
      if (/우/.test(text)) return "요금소 통과 후, 우측 방향입니다.";
      return "잠시 후, 톨게이트 요금소입니다.";
    }
    return "잠시 후, 톨게이트 요금소입니다.";
  }
  if (/고속도로 입|IC 진입|하이웨이/.test(text)) return "잠시 후, 고속도로 입구입니다.";
  if (/지하차도/.test(text)) return "잠시 후, 지하차도 진입입니다.";
  if (/고가도로|고가차도/.test(text)) return "잠시 후, 고가도로 진입입니다.";
  if (/합류/.test(text)) return "합류 구간입니다. 안전 운전하세요.";
  return "";
}

export function phraseForSafety(instruction, extras = {}) {
  const text = String(instruction || extras.placeLabel || "");
  if (/과속방지턱|험프/.test(text)) return "전방에 과속방지턱이 있습니다.";
  if (/구간.?단속|과속단속/.test(text)) return "구간 단속 구간입니다. 제한속도를 준수하세요.";
  if (/급커브|급곡선/.test(text)) return "전방에 급커브 구간입니다. 속도를 줄이세요.";
  if (/사고.?다발/.test(text)) return "사고 다발 구간입니다. 주의 운전하세요.";
  if (/어린이.?보호|스쿨존|School/.test(text)) return "어린이 보호구역입니다. 서행하세요.";
  return "";
}

export function joinMemberPhrase(displayName) {
  const name = String(displayName || "멤버").trim() || "멤버";
  return `${name}님이 맵에 합류했습니다.`;
}

function safetyAlertMeters(instruction) {
  const text = String(instruction || "");
  if (/과속방지턱|험프/.test(text)) return 100;
  if (/어린이.?보호|스쿨존|사고.?다발|급커브|급곡선|구간.?단속|과속단속/.test(text)) return 150;
  return 0;
}

/** 전방 신호. 적색·임박만 말하고, 녹색 반복 안내는 만들지 않는다. */
export function phraseForSignal(signal) {
  if (!signal) return "";
  const dist = Number(signal.distanceM);
  if (!Number.isFinite(dist) || dist > 150) return "";
  const phase = String(signal.phase || "");
  const remain = Number(signal.remainSec);
  const red = /적|red/i.test(phase);
  const yellow = /황|노랑|yellow/i.test(phase);
  if (red && dist <= 120) return "전방 신호가 적색입니다. 정지선에서 멈추세요.";
  if ((red || yellow) && Number.isFinite(remain) && remain <= 8 && dist <= 150) {
    return "신호가 곧 바뀝니다. 속도를 조절하세요.";
  }
  return "";
}

/**
 * 지금 위치에서 말해야 하는 상황만 우선순위 순으로 돌려준다.
 * 경로 전체의 지난 회전을 쌓지 않는다.
 */
export function listLiveSpeeches({ steps, remainM, signal } = {}) {
  const rows = Array.isArray(steps) ? steps : [];
  const upcoming = rows.find(
    (step) => step.instruction !== "안내를 시작합니다" && step.instruction !== "목적지 도착" && Number(step.distanceM) > 0
  );
  const out = [];
  if (upcoming) {
    const dist = Math.round(Number(upcoming.distanceM) || 0);
    const safety = phraseForSafety(upcoming.instruction);
    const safetyRange = safetyAlertMeters(upcoming.instruction);
    if (safety && dist > 0 && dist <= safetyRange) {
      out.push({
        key: `safety-${upcoming.instruction}`,
        text: safety,
        priority: TTS_PRIORITY.URGENT,
        rank: 0
      });
    }
    const band = turnBand(dist);
    const turn = safety ? "" : phraseForTurn(upcoming.instruction, dist);
    if (turn && band === "100") {
      out.push({
        key: `tbt-${upcoming.instruction}-100`,
        text: turn,
        priority: TTS_PRIORITY.NEAR,
        rank: 2
      });
    } else if (turn && band === "300") {
      out.push({
        key: `tbt-${upcoming.instruction}-300`,
        text: turn,
        priority: TTS_PRIORITY.GENERAL,
        rank: 5
      });
    }
    const special = phraseForSpecialRoad(upcoming.instruction);
    if (special && dist > 0 && dist <= 80) {
      out.push({
        key: `special-${upcoming.instruction}`,
        text: special,
        priority: TTS_PRIORITY.NEAR,
        rank: 3
      });
    }
  }
  const signalText = phraseForSignal(signal);
  if (signalText) {
    const urgent = /적색|멈추/.test(signalText);
    const id = signal?.id || signal?.phase || "near";
    out.push({
      key: `signal-${id}-${urgent ? "stop" : "soon"}`,
      text: signalText,
      priority: urgent ? TTS_PRIORITY.URGENT : TTS_PRIORITY.NEAR,
      rank: urgent ? 1 : 4
    });
  }
  if (Number.isFinite(remainM)) {
    if (remainM <= 35) {
      out.push({
        key: "arrive-final",
        text: "목적지에 도착했습니다. 오늘도 좋은 하루 보내십시오!",
        priority: TTS_PRIORITY.GENERAL,
        rank: 6
      });
    } else if (remainM <= 100) {
      out.push({
        key: "arrive-100",
        text: "약 100미터 앞, 목적지 주변입니다.",
        priority: TTS_PRIORITY.GENERAL,
        rank: 6
      });
    }
  }
  out.sort((a, b) => a.priority - b.priority || a.rank - b.rank);
  return out;
}
