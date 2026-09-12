/**
 * DCC 위치·보안 환경 증언 수집 (웹/Android WebView)
 * — 일반 가입과 무관, DCC 인증 단계에서만 사용
 * — Android: VlueFamilyBridgeNative.getDccSecuritySnapshot() 실측 (Wi‑Fi/VPN/원격앱)
 */

const REMOTE_HINTS = [
  "teamviewer",
  "anydesk",
  "rustdesk",
  "chromeremote",
  "splashtop",
  "ultraviewer",
  "supremo",
  "logmein",
  "airdroid"
];

const VPN_HINTS = ["vpn", "openvpn", "wireguard", "nordvpn", "expressvpn", "surfshark", "psiphon"];

const PKG_STORAGE_KEY = "vlue_dcc_security_pkgs_v1";

function readConnectionType() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return "unknown";
    const t = String(c.type || "").toLowerCase();
    if (t) return t;
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function rememberDccSecurityPackage(pkg) {
  const p = String(pkg || "").trim();
  if (!p) return;
  const cur = collectReportedPackages();
  if (!cur.includes(p)) {
    cur.push(p);
    try {
      sessionStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(cur.slice(-80)));
    } catch {
      /* ignore */
    }
  }
}

function collectReportedPackages() {
  const out = [];
  try {
    const raw = sessionStorage.getItem(PKG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed.map((x) => String(x || "")));
    }
  } catch {
    /* ignore */
  }
  return [...new Set(out.map((x) => x.trim()).filter(Boolean))];
}

function listenNativeDetections() {
  const onRemote = (ev) => {
    const pkg = ev?.detail?.packageName || ev?.detail?.pkg || ev?.detail;
    rememberDccSecurityPackage(pkg);
  };
  const onDanger = (ev) => {
    const pkg = ev?.detail?.packageName || ev?.detail?.pkg;
    rememberDccSecurityPackage(pkg);
  };
  window.addEventListener("vlue-remote-app-detected", onRemote);
  window.addEventListener("vlue-dangerous-app-detected", onDanger);
  return () => {
    window.removeEventListener("vlue-remote-app-detected", onRemote);
    window.removeEventListener("vlue-dangerous-app-detected", onDanger);
  };
}

function triggerNativeScan() {
  try {
    window.VlueFamilyBridgeNative?.scanRemoteControlAppsNow?.();
  } catch {
    /* ignore */
  }
  try {
    window.VlueFamilyBridgeNative?.scanDangerousAppsNow?.();
  } catch {
    /* ignore */
  }
  try {
    window.VlueFamilyBridge?.scanRemoteControlAppsNow?.();
  } catch {
    /* ignore */
  }
}

/** Android 동기 스냅샷 — Wi‑Fi/VPN/원격 설치 앱 */
function readNativeDccSnapshot() {
  try {
    const raw = window.VlueFamilyBridgeNative?.getDccSecuritySnapshot?.();
    if (raw == null || raw === "") return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    const remotePackages = Array.isArray(parsed.remotePackages)
      ? parsed.remotePackages.map((x) => String(x || "")).filter(Boolean)
      : [];
    for (const pkg of remotePackages) rememberDccSecurityPackage(pkg);
    return {
      networkType: String(parsed.networkType || "unknown").toLowerCase(),
      vpnActive: Boolean(parsed.vpnActive),
      wifi: Boolean(parsed.wifi),
      cellular: Boolean(parsed.cellular),
      remotePackages,
      source: String(parsed.source || "android_native")
    };
  } catch {
    return null;
  }
}

function guessVpnActive(packages, networkType, nativeVpn) {
  if (nativeVpn) return true;
  const blob = packages.join(" ").toLowerCase();
  if (VPN_HINTS.some((h) => blob.includes(h))) return true;
  if (REMOTE_HINTS.some((h) => blob.includes(h))) return true;
  void networkType;
  return false;
}

export function getGpsPosition(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 기기에서 위치를 사용할 수 없습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => reject(new Error(err?.message || "위치 권한이 필요합니다.")),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

/**
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   networkType: string,
 *   vpnActive: boolean,
 *   installedPackages: string[],
 *   clientHints: { wifiBlocked: boolean, vpnOrRemoteHint: boolean }
 * }>}
 */
export async function collectDccSecurityAttestation() {
  const stopListen = listenNativeDetections();
  triggerNativeScan();
  await new Promise((r) => setTimeout(r, 450));

  try {
    const gps = await getGpsPosition();
    const native = readNativeDccSnapshot();
    const webNetworkType = readConnectionType();
    const networkType = native?.networkType && native.networkType !== "unknown"
      ? native.networkType
      : webNetworkType;
    const installedPackages = [
      ...collectReportedPackages(),
      ...(native?.remotePackages || [])
    ];
    const uniqPkgs = [...new Set(installedPackages.map((p) => p.trim()).filter(Boolean))];
    const vpnActive = guessVpnActive(uniqPkgs, networkType, Boolean(native?.vpnActive));
    const wifiBlocked =
      networkType === "wifi" ||
      networkType === "ethernet" ||
      (Boolean(native?.wifi) && networkType !== "cellular");
    /* 셀룰러가 활성인데 Wi‑Fi도 켜져 있으면 사양상 Wi‑Fi 환경으로 차단 */
    const wifiUpBlocksCellular = Boolean(native?.wifi) && networkType === "cellular";
    const blockWifi = wifiBlocked || wifiUpBlocksCellular;
    const vpnOrRemoteHint =
      vpnActive ||
      uniqPkgs.some((p) => {
        const b = p.toLowerCase();
        return REMOTE_HINTS.some((h) => b.includes(h)) || VPN_HINTS.some((h) => b.includes(h));
      });

    return {
      lat: gps.lat,
      lng: gps.lng,
      networkType: blockWifi ? "wifi" : networkType,
      vpnActive,
      installedPackages: uniqPkgs,
      clientHints: { wifiBlocked: blockWifi, vpnOrRemoteHint },
      nativeSource: native?.source || null
    };
  } finally {
    stopListen();
  }
}

export const DCC_SECURITY_COPY = {
  locationMismatch: "현재 신청하신 위치는 인증 위치가 아닙니다. 사내 장소에서 인증신청 하세요.",
  vpnOrRemote: "현재 기기 VPN 또는 원격프로그램이 작동중입니다. 잠시 작동을 중지하고 인증신청하세요.",
  wifi: "와이파이(Wi-Fi) 환경에서는 위치 인증을 할 수 없습니다. 모바일 데이터로 전환한 뒤 다시 시도해 주세요."
};
