/** 브라우저가 실제로 돌려주는 값만 담는다. 주변 기기 목록을 만들지 않는다. */

export const WIFI_SCAN_LIMIT = "이 브라우저는 주변 Wi-Fi 목록과 네트워크 장치 목록을 제공하지 않습니다.";

export const WIFI_SCAN_ALTERNATIVES = [
  "휴대폰 설정의 Wi-Fi 화면에서 주변 네트워크 이름을 직접 확인합니다.",
  "공유기 관리 화면에 들어가 연결된 기기 목록을 직접 확인합니다."
];

export async function probeGeneralDeviceScan() {
  const bluetooth = typeof navigator !== "undefined" ? navigator.bluetooth : undefined;
  let available = null;
  if (bluetooth?.getAvailability) {
    try {
      available = await bluetooth.getAvailability();
    } catch {
      available = null;
    }
  }
  const connection = typeof navigator !== "undefined" ? navigator.connection || navigator.mozConnection || navigator.webkitConnection : null;
  return {
    wifiScan: false,
    bluetooth: {
      api: Boolean(bluetooth),
      available,
      requestDevice: typeof bluetooth?.requestDevice === "function"
    },
    currentLink: connection
      ? { type: connection.type || null, effectiveType: connection.effectiveType || null }
      : null
  };
}

export function buildGeneralScanResult({ probe, picked, errorName, at = new Date().toISOString() }) {
  const observed = [];
  const name = String(picked?.name || "").trim();
  const id = String(picked?.id || "").trim();
  if (name || id) {
    observed.push({
      label: "Bluetooth 선택",
      value: `${name || "이름 없음"} (${id || "식별자 없음"}). 선택 창에서 고른 한 건이며 주변 전체 목록이 아닙니다.`
    });
  }
  const limits = [];
  if (!probe?.bluetooth?.requestDevice) limits.push("Bluetooth 장치 선택 API가 없습니다.");
  if (errorName) limits.push(`장치 선택이 끝나지 않았습니다 (${errorName}). 탐색 성공으로 보지 않습니다.`);
  limits.push(WIFI_SCAN_LIMIT, ...WIFI_SCAN_ALTERNATIVES);
  if (probe?.currentLink?.type || probe?.currentLink?.effectiveType) {
    const kind = probe.currentLink.type || probe.currentLink.effectiveType;
    limits.push(`현재 연결 종류는 ${kind}로만 보고됩니다. 주변 장치 목록이 아닙니다.`);
  }
  let outcome = "unsupported";
  if (observed.length) outcome = "observed";
  else if (probe?.bluetooth?.requestDevice) outcome = "unmeasurable";
  return {
    moduleId: "device-id",
    title: "DEVICE ID",
    item: "일반 주변 장치 탐색",
    mode: "general",
    at,
    outcome,
    observed,
    review: [],
    limits,
    actions: ["주변 네트워크 목록은 휴대폰 Wi-Fi 설정이나 공유기 관리 화면에서 직접 확인합니다."]
  };
}
