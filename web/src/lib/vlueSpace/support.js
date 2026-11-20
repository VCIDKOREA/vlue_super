import { probeGeneralDeviceScan } from "./deviceScan.js";
import { describeTofEnvironment } from "./tofSupport.js";

/** 기능 카드에 보여줄 지원 상태. 측정값을 만들지 않는다. */

export const SPACE_MODULES = [
  {
    id: "hidden-cam",
    title: "HIDDEN CAM CHECK",
    summary: "카메라 렌즈 및 광학적 의심 요소 점검",
    purpose: "스마트폰 카메라로 주변의 반짝임과 고휘도 지점을 살펴봅니다."
  },
  {
    id: "device-id",
    title: "DEVICE ID",
    summary: "주변 디지털 기기 및 무선 신호 식별",
    purpose: "주변 기기 탐색과 기관용 확인은 따로 둡니다."
  },
  {
    id: "home-guard",
    title: "HOME GUARD",
    summary: "우리 집 홈캠의 외부 통신 및 네트워크 상태 점검",
    purpose: "등록된 홈캠의 통신은 관찰 장치가 있을 때만 봅니다."
  },
  {
    id: "space-tof",
    title: "SPACE ToF",
    summary: "지원 센서를 이용한 공간 깊이 및 거리 측정",
    purpose: "깊이 센서가 있는 기기에서 거리 정보를 확인합니다."
  }
];

function cameraState(permission, deviceCount) {
  if (permission === "denied") {
    return { status: "limited", available: false, headline: "권한 필요", detail: "카메라 권한이 거부되어 있습니다." };
  }
  if (deviceCount === 0 && permission === "granted") {
    return { status: "unsupported", available: false, headline: "카메라 없음", detail: "동영상 입력 장치를 찾지 못했습니다." };
  }
  if (permission === "granted") {
    return { status: "ready", available: true, headline: "사용 가능", detail: "카메라 권한과 입력 장치를 확인했습니다." };
  }
  return {
    status: "ready",
    available: true,
    headline: "권한 확인 후 사용",
    detail: "카메라 API는 있습니다. 점검을 시작하기 전에 권한을 확인합니다."
  };
}

async function probeCamera() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { status: "unsupported", available: false, headline: "기기 지원 필요", detail: "이 브라우저는 카메라 API를 제공하지 않습니다." };
  }
  let permission = "prompt";
  try {
    const status = await navigator.permissions?.query?.({ name: "camera" });
    if (status?.state) permission = status.state;
  } catch {
    permission = "prompt";
  }
  let deviceCount = null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    deviceCount = devices.filter((device) => device.kind === "videoinput").length;
  } catch {
    deviceCount = null;
  }
  return cameraState(permission, deviceCount);
}

function probeTof() {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  const canQuery = typeof media?.getSupportedConstraints === "function";
  const described = describeTofEnvironment({
    hasNavigator: typeof navigator !== "undefined",
    hasMedia: Boolean(media),
    canQueryConstraints: canQuery,
    constraints: canQuery ? media.getSupportedConstraints() || null : null
  });
  return {
    status: described.support === "advertised" ? "limited" : described.support === "unknown" ? "unknown" : "unsupported",
    available: false,
    headline: described.headline,
    detail: described.detail,
    tof: described
  };
}

export async function readSpaceSupport() {
  const camera = await probeCamera();
  const scan = await probeGeneralDeviceScan();
  return {
    "hidden-cam": camera,
    "device-id": {
      status: scan.bluetooth.requestDevice ? "limited" : "unsupported",
      available: false,
      headline: "Wi-Fi 목록 불가",
      detail: scan.bluetooth.requestDevice
        ? "주변 Wi-Fi 목록은 열리지 않습니다. Bluetooth 선택 창에서 고른 장치 한 건만 기록할 수 있습니다."
        : "주변 Wi-Fi 목록과 Bluetooth 선택 API가 없습니다. 휴대폰 설정이나 공유기 화면에서 직접 확인합니다.",
      scan
    },
    "home-guard": {
      status: "unlinked",
      available: false,
      headline: "미연동",
      detail: "공유기 API·로그 또는 관찰 장치가 없습니다. 같은 Wi-Fi에 있다는 사실만으로 다른 기기의 통신을 보지 않습니다."
    },
    "space-tof": probeTof()
  };
}
