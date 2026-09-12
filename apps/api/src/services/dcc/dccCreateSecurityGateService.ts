/**
 * DCC 생성 최종 방어선 — 위치(Geo) · 모바일 데이터 · VPN/원격앱
 * (일반 가입과 분리, DCC 설정 단계에서만 사용)
 */
import { haversineKm, type GeoPoint } from "./dccAddressDistance.js";
import { matchRemoteControlApp } from "../../lib/remoteControlApps.js";
import { geocodeDccAddress } from "../../integrations/kakao/kakaoAddressGeocode.js";

export const DCC_GEO_RADIUS_METERS = Math.max(
  50,
  Number(process.env.DCC_GEO_RADIUS_METERS || 300) || 300
);

export const MSG_LOCATION_MISMATCH =
  "현재 신청하신 위치는 인증 위치가 아닙니다. 사내 장소에서 인증신청 하세요.";

export const MSG_VPN_OR_REMOTE =
  "현재 기기 VPN 또는 원격프로그램이 작동중입니다. 잠시 작동을 중지하고 인증신청하세요.";

export const MSG_WIFI_REQUIRED_CELLULAR =
  "와이파이(Wi-Fi) 환경에서는 위치 인증을 할 수 없습니다. 모바일 데이터로 전환한 뒤 다시 시도해 주세요.";

const VPN_PACKAGE_HINTS = [
  "vpn",
  "openvpn",
  "wireguard",
  "nordvpn",
  "expressvpn",
  "surfshark",
  "protonvpn",
  "psiphon",
  "tunnelbear",
  "fortinet",
  "cisco.anyconnect",
  "com.android.vpndialogs"
];

export type DccSecurityAttestationInput = {
  lat?: number;
  lng?: number;
  /** cellular | wifi | ethernet | unknown */
  networkType?: string;
  vpnActive?: boolean;
  /** 설치된/실행 중으로 보고된 패키지·앱 이름 */
  installedPackages?: string[];
  workplaceAddress?: string;
  workplaceLat?: number | null;
  workplaceLng?: number | null;
};

export type DccSecurityGateResult = {
  ok: boolean;
  canActivateButton: boolean;
  reasons: string[];
  message?: string;
  checks: {
    locationOk: boolean;
    mobileDataOk: boolean;
    vpnRemoteOk: boolean;
    distanceMeters: number | null;
    radiusMeters: number;
  };
};

function asPoint(lat: unknown, lng: unknown): GeoPoint | null {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  if (a === 0 && b === 0) return null;
  return { lat: a, lng: b };
}

function detectVpnOrRemote(packages: string[], vpnActiveFlag: boolean): string | null {
  if (vpnActiveFlag) return MSG_VPN_OR_REMOTE;
  for (const raw of packages) {
    const blob = String(raw || "").toLowerCase();
    if (!blob) continue;
    if (matchRemoteControlApp(blob)) return MSG_VPN_OR_REMOTE;
    if (VPN_PACKAGE_HINTS.some((h) => blob.includes(h.trim()))) return MSG_VPN_OR_REMOTE;
  }
  return null;
}

/**
 * 클라이언트 증언 + 사업장 좌표로 게이트 판정.
 * 버튼 활성화 = 위치·셀룰러·VPN/원격 모두 OK.
 */
export async function evaluateDccSecurityGate(
  input: DccSecurityAttestationInput
): Promise<DccSecurityGateResult> {
  const reasons: string[] = [];
  const radiusM = DCC_GEO_RADIUS_METERS;
  const user = asPoint(input.lat, input.lng);

  let workplace = asPoint(input.workplaceLat, input.workplaceLng);
  if (!workplace && input.workplaceAddress) {
    workplace = await geocodeDccAddress(String(input.workplaceAddress).trim());
  }

  let distanceMeters: number | null = null;
  let locationOk = false;
  if (!user) {
    reasons.push("위치 권한이 필요합니다. GPS를 켠 뒤 다시 시도해 주세요.");
  } else if (!workplace) {
    reasons.push("사업장 주소 좌표를 확인하지 못했습니다. 주소를 다시 등록해 주세요.");
  } else {
    distanceMeters = Math.round(haversineKm(user, workplace) * 1000);
    locationOk = distanceMeters <= radiusM;
    if (!locationOk) reasons.push(MSG_LOCATION_MISMATCH);
  }

  const net = String(input.networkType || "unknown").toLowerCase();
  const mobileDataOk = net === "cellular" || net === "mobile" || net === "wcdma" || net === "lte" || net === "nr";
  if (!mobileDataOk) {
    if (net === "wifi" || net === "ethernet") reasons.push(MSG_WIFI_REQUIRED_CELLULAR);
    else reasons.push(MSG_WIFI_REQUIRED_CELLULAR);
  }

  const pkgs = Array.isArray(input.installedPackages)
    ? input.installedPackages.map((p) => String(p || "").trim()).filter(Boolean)
    : [];
  const vpnMsg = detectVpnOrRemote(pkgs, Boolean(input.vpnActive));
  const vpnRemoteOk = !vpnMsg;
  if (vpnMsg) reasons.push(vpnMsg);

  const canActivateButton = locationOk && mobileDataOk && vpnRemoteOk;
  const message = !vpnRemoteOk
    ? MSG_VPN_OR_REMOTE
    : !locationOk && user && workplace
      ? MSG_LOCATION_MISMATCH
      : !mobileDataOk
        ? MSG_WIFI_REQUIRED_CELLULAR
        : reasons[0];

  return {
    ok: canActivateButton,
    canActivateButton,
    reasons,
    message,
    checks: {
      locationOk,
      mobileDataOk,
      vpnRemoteOk,
      distanceMeters,
      radiusMeters: radiusM
    }
  };
}
