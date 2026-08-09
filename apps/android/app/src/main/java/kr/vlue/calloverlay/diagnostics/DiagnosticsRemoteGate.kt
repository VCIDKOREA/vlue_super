package kr.vlue.calloverlay.diagnostics

/**
 * Remote diagnostics upload kill-switch.
 *
 * false = 네트워크/DB 트레이스 0 (로컬 Log 는 유지 가능).
 * 재활성화: ENABLED = true 후 release 재설치.
 * API 측도 VLUE_DIAGNOSTICS_ENABLED=true 필요.
 */
object DiagnosticsRemoteGate {
    const val ENABLED: Boolean = false
}
