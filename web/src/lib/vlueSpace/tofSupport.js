/** 깊이 센서 지원과 실제 깊이 표본을 따로 판정한다. */

export function depthSettingsAreReal(settings) {
  if (!settings || typeof settings !== "object") return false;
  if (settings.depth === true) return true;
  if (Number.isFinite(settings.depthNear) || Number.isFinite(settings.depthFar)) return true;
  return false;
}

export function describeTofEnvironment({ hasNavigator, hasMedia, canQueryConstraints, constraints }) {
  if (!hasNavigator || !hasMedia || !canQueryConstraints || !constraints) {
    return {
      support: "unknown",
      dataReceived: false,
      headline: "지원 여부 확인 불가",
      detail: "이 환경에서는 깊이 센서 지원 여부를 조회하지 못했습니다. 측정 화면은 열지 않습니다."
    };
  }
  const advertised = Boolean(constraints.depth || constraints.depthNear || constraints.depthFar);
  if (!advertised) {
    return {
      support: "unsupported",
      dataReceived: false,
      headline: "미지원",
      detail: "이 브라우저는 깊이 입력을 제공하지 않습니다. 측정 화면은 열지 않습니다."
    };
  }
  return {
    support: "advertised",
    dataReceived: false,
    headline: "측정 불가",
    detail: "깊이 입력 단서는 있으나 깊이 프레임은 받지 않았습니다. 프레임이 오기 전에는 측정을 시작하지 않습니다."
  };
}

export function decideTofMeasure({ support, frames }) {
  const samples = Array.isArray(frames) ? frames.filter((frame) => Number.isFinite(frame?.millimeters) || frame?.pixels) : [];
  if (support === "unknown") return { enter: false, outcome: "unknown", frames: [] };
  if (support === "unsupported") return { enter: false, outcome: "unsupported", frames: [] };
  if (!samples.length) return { enter: false, outcome: "unmeasurable", frames: [] };
  return { enter: true, outcome: "observed", frames: samples };
}

export function classifyDepthTracks(tracks) {
  const list = Array.isArray(tracks) ? tracks : [];
  const real = list.filter((track) => depthSettingsAreReal(track?.getSettings?.() || track?.settings));
  return { accept: real.length > 0, colorOnly: list.length > 0 && real.length === 0 };
}

export function buildTofResult({ support, frames, note, at = new Date().toISOString() }) {
  const decision = decideTofMeasure({ support, frames });
  const observed = decision.frames.map((frame, index) => {
    if (frame.pixels) {
      return { label: `깊이 프레임 ${index + 1}`, value: `${frame.pixels.width}×${frame.pixels.height} 깊이 버퍼` };
    }
    return { label: `거리 표본 ${index + 1}`, value: `${frame.millimeters} mm` };
  });
  const limits = [];
  if (note) limits.push(note);
  if (!decision.enter) {
    limits.push(support === "unknown" ? "지원 여부를 확인하지 못했습니다." : support === "unsupported" ? "깊이 센서 입력이 없습니다." : "깊이 프레임이 없어 거리와 깊이 지도를 만들지 않습니다.");
  }
  return {
    moduleId: "space-tof",
    title: "SPACE ToF",
    item: "공간 깊이 및 거리",
    at,
    outcome: decision.outcome,
    enterMeasure: decision.enter,
    observed,
    review: [],
    limits,
    actions: ["깊이 프레임이 있는 기기에서만 거리를 읽습니다. 일반 카메라 영상은 깊이로 쓰지 않습니다."]
  };
}

export async function requestDepthSample() {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!media?.getUserMedia || typeof media.getSupportedConstraints !== "function") {
    return { support: "unknown", frames: [], note: "깊이 센서 지원 여부를 조회하지 못했습니다." };
  }
  const constraints = media.getSupportedConstraints() || {};
  const described = describeTofEnvironment({
    hasNavigator: true,
    hasMedia: true,
    canQueryConstraints: true,
    constraints
  });
  if (described.support !== "advertised") return { support: described.support, frames: [], note: described.detail };
  let stream = null;
  try {
    stream = await media.getUserMedia({ video: { depth: true } });
  } catch (err) {
    return { support: "advertised", frames: [], note: `깊이 데이터 요청이 열리지 않았습니다 (${err?.name || "error"}). 측정을 시작하지 않습니다.` };
  }
  try {
    const tracks = stream.getTracks();
    const verdict = classifyDepthTracks(tracks);
    if (!verdict.accept) {
      return { support: "advertised", frames: [], note: "일반 영상 트랙만 열려 깊이로 쓰지 않고 닫았습니다. 거리값을 만들지 않습니다." };
    }
    return { support: "advertised", frames: [], note: "깊이 트랙 단서는 있으나 프레임 표본을 읽지 않았습니다. 거리와 깊이 지도는 만들지 않습니다." };
  } finally {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
  }
}
