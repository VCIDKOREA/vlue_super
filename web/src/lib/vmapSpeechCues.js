/** V-MAP 턴바이턴·안전·특수구간 TTS 멘트 */

export function classifyTurn(instruction) {
  const text = String(instruction || "");
  if (/U턴|유턴/i.test(text)) return "유턴";
  if (/10시/.test(text)) return "10시 방향";
  if (/2시/.test(text)) return "2시 방향";
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
  if (d <= 50) return "soon";
  if (d <= 320) return "300";
  if (d <= 540) return "500";
  return "";
}

export function phraseForTurn(instruction, distanceM) {
  const turn = classifyTurn(instruction) || String(instruction || "직진").replace(/입니다\.?$/, "");
  const band = turnBand(distanceM);
  if (!turn || /직진|도착|안내를 시작/.test(turn)) return "";
  if (band === "500") return `약 500미터 앞, ${turn}입니다.`;
  if (band === "300") return `300미터 앞, ${turn}입니다.`;
  if (band === "soon") return `잠시 후, ${turn}입니다.`;
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
