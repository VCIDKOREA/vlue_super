/** 관찰 장치 슬롯. 값이 없으면 null 이며 통신량을 만들지 않는다. */

export const BLE_SCOPE = "BLE는 초기 등록과 사용자가 고르는 장치 확인에만 씁니다. 24시간 통신 감시가 아닙니다.";

export function emptyHomeGuardSnapshot() {
  return {
    observerId: null,
    observedAt: null,
    peer: null,
    bytesIn: null,
    bytesOut: null,
    connection: null,
    source: null,
    collection: null,
    valid: null,
    receivedAt: null
  };
}

export const HOME_GUARD_FIELDS = [
  ["observerId", "관찰 장치 식별 정보"],
  ["observedAt", "관찰 시각"],
  ["peer", "통신 대상 정보"],
  ["bytesIn", "수신량"],
  ["bytesOut", "송신량"],
  ["connection", "연결 상태"],
  ["source", "데이터 출처"],
  ["collection", "수집 방식"],
  ["valid", "데이터 유효성"],
  ["receivedAt", "마지막 데이터 수신 시각"]
];

export function readObserverPayload(payload) {
  if (payload == null) return { received: false, valid: null, snapshot: emptyHomeGuardSnapshot() };
  const valid = payload.valid === true && Boolean(payload.source) && Boolean(payload.collection);
  if (!valid) return { received: true, valid: false, snapshot: emptyHomeGuardSnapshot() };
  const snapshot = emptyHomeGuardSnapshot();
  for (const key of Object.keys(snapshot)) {
    if (payload[key] !== undefined && payload[key] !== null) snapshot[key] = payload[key];
  }
  snapshot.valid = true;
  snapshot.source = payload.source;
  snapshot.collection = payload.collection;
  return { received: true, valid: true, snapshot };
}

export function buildHomeGuardResult({ payload, bleDevice, at = new Date().toISOString() }) {
  const reading = readObserverPayload(payload);
  const observed = [];
  if (reading.valid) {
    for (const [key, label] of HOME_GUARD_FIELDS) {
      const value = reading.snapshot[key];
      if (value === null || value === undefined) continue;
      observed.push({ label, value: String(value) });
    }
  }
  const bleName = String(bleDevice?.name || "").trim();
  const bleId = String(bleDevice?.id || "").trim();
  if (bleName || bleId) {
    observed.push({
      label: "BLE 등록 후보",
      value: `${bleName || "이름 없음"} (${bleId || "식별자 없음"}). ${BLE_SCOPE}`
    });
  }
  const limits = [BLE_SCOPE];
  if (!reading.received) {
    limits.unshift("공유기 API·로그 또는 관찰 장치가 연결되지 않았습니다. 통신 대상, 송수신량, 연결 상태, 이상 징후를 볼 수 없습니다.");
  } else if (!reading.valid) {
    limits.unshift("데이터 수신은 있었으나 출처와 유효성이 없어 통신량과 대상을 관찰값으로 쓰지 않습니다.");
  }
  let outcome = "unlinked";
  if (reading.valid) outcome = "observed";
  else if (reading.received) outcome = "unmeasurable";
  return {
    moduleId: "home-guard",
    title: "HOME GUARD",
    item: "등록 홈캠의 외부 통신",
    at,
    outcome,
    received: reading.received,
    valid: reading.valid,
    snapshot: reading.snapshot,
    observed,
    review: [],
    limits,
    actions: ["통신 내용은 공유기 관리 화면이나 관찰 장치가 연결된 뒤에만 확인합니다."]
  };
}
