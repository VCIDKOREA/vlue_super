/**
 * Remote diagnostics kill-switch (ingest + admin read).
 *
 * 기본 OFF — Shared Pooler egress 0.
 * 재활성화: 환경변수 VLUE_DIAGNOSTICS_ENABLED=true (또는 1/yes/on)
 */
export function isDiagnosticsRemoteEnabled(): boolean {
  const raw = String(process.env.VLUE_DIAGNOSTICS_ENABLED || "")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
