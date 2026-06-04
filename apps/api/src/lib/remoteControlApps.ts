/**
 * 원격제어·원격지원 앱 (보이스피싱·원격제어 사기 대응)
 * 네이티브에서 packageId / bundleId 로 보고.
 */
export type RemoteControlAppEntry = {
  id: string;
  label: string;
  patterns: string[];
};

export const REMOTE_CONTROL_APPS: RemoteControlAppEntry[] = [
  { id: "teamviewer", label: "TeamViewer", patterns: ["teamviewer", "com.teamviewer"] },
  { id: "anydesk", label: "AnyDesk", patterns: ["anydesk", "com.anydesk"] },
  { id: "rustdesk", label: "RustDesk", patterns: ["rustdesk", "com.carriez.rustdesk"] },
  { id: "chrome_remote", label: "Chrome 원격", patterns: ["chromeremotedesktop", "com.google.chromeremote"] },
  { id: "ms_rd", label: "Microsoft 원격", patterns: ["microsoft.remote", "msrdc"] },
  { id: "splashtop", label: "Splashtop", patterns: ["splashtop"] },
  { id: "ultraviewer", label: "UltraViewer", patterns: ["ultraviewer"] },
  { id: "supremo", label: "Supremo", patterns: ["supremo"] },
  { id: "ammyy", label: "Ammyy Admin", patterns: ["ammyy"] },
  { id: "logmein", label: "LogMeIn", patterns: ["logmein"] },
  { id: "parsec", label: "Parsec", patterns: ["parsec"] },
  { id: "airdroid", label: "AirDroid", patterns: ["airdroid"] },
  { id: "scrcpy", label: "scrcpy/ADB 원격", patterns: ["scrcpy"] }
];

export function matchRemoteControlApp(packageOrLabel: string): RemoteControlAppEntry | null {
  const blob = String(packageOrLabel || "").toLowerCase();
  if (!blob) return null;
  for (const app of REMOTE_CONTROL_APPS) {
    if (app.patterns.some((p) => blob.includes(p))) return app;
  }
  return null;
}
