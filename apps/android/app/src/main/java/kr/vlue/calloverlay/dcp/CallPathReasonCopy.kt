package kr.vlue.calloverlay.dcp

/**
 * 비정상 경로 사유 — 사용자에게 오해 없이 짧게 보여 준다.
 * 코드 키(overlay_in_use:pkg)를 한글 한 줄로 바꾼다.
 * 설치만 된 원격앱은 여기 오지 않는다. 실행 중일 때만 엔진이 키를 넣는다.
 */
object CallPathReasonCopy {
    fun summary(reasons: List<String>, outgoing: Boolean = false): String {
        if (reasons.isEmpty()) {
            return if (outgoing) {
                "원격·악성 앱이 실행 중인 상태에서 걸고 있는 전화입니다."
            } else {
                "비정상 경로로 확인된 전화입니다."
            }
        }
        return reasons.map { lineFor(it, outgoing) }.distinct().first()
    }

    fun lineFor(raw: String, outgoing: Boolean = false): String {
        val r = raw.trim()
        val pkg = r.substringAfter(':', "").substringBefore(',')
        val label = appLabel(pkg)
        val whenCall =
            if (outgoing) "걸고 있는 전화입니다." else "걸려 온 전화입니다."
        return when {
            r.startsWith("overlay_in_use:") ->
                "원격제어 앱(${label})이 실행 중인 상태에서 $whenCall"
            r.startsWith("accessibility_suspicious:") ->
                "원격제어 접근성(${label})이 켜진 상태에서 $whenCall"
            r.startsWith("incall_occluded:") ->
                "원격·악성 앱(${label})이 통화 화면을 가리고 있습니다."
            r.startsWith("peer_remote") ->
                "상대 폰에서 원격제어 앱이 실행된 채 걸려 온 전화입니다."
            r.contains("mock") ->
                "테스트: 비정상 경로입니다."
            isVoiceMod(pkg) || isVoiceMod(r) ->
                "변작기 또는 가짜 전화 앱이 실행 중입니다."
            else ->
                "비정상 경로로 확인된 전화입니다."
        }
    }

    fun appLabel(packageName: String): String {
        val p = packageName.lowercase()
        return when {
            p.contains("teamviewer") -> "TeamViewer"
            p.contains("anydesk") -> "AnyDesk"
            p.contains("rustdesk") || p.contains("flutter_hbb") -> "RustDesk"
            p.contains("splashtop") -> "Splashtop"
            p.contains("airdroid") -> "AirDroid"
            p.contains("chromeremote") -> "Chrome Remote"
            p.contains("ultraviewer") -> "UltraViewer"
            p.contains("parsec") -> "Parsec"
            p.contains("logmein") -> "LogMeIn"
            p.contains("microsoft.rdc") || p.contains("rdc.android") -> "Microsoft 원격"
            p.contains("facebook") -> "Facebook"
            p.contains("kakao") -> "카카오톡"
            p.isBlank() -> "원격 앱"
            else -> "원격 앱"
        }
    }

    private fun isVoiceMod(s: String): Boolean {
        val p = s.lowercase()
        return p.contains("voicechanger") ||
            p.contains("voice.changer") ||
            p.contains("fakecall") ||
            p.contains("fake.call") ||
            p.contains("변작")
    }
}
